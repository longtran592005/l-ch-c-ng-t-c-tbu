"""
RAG Pipeline Orchestrator
Điều phối toàn bộ pipeline RAG: Embed → Retrieve → Generate

@author TBU AI Team
"""
from typing import List, Dict, Optional
import logging
import asyncio
import sys
import os
import re

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rag_config import TOP_K_RETRIEVAL, SIMILARITY_THRESHOLD, get_connection_string

from .embeddings import embedding_model
from .vector_store import vector_store
from .llm_generator import llm_generator
from .query_cache import query_cache
from .document_loader import (
    format_schedule_for_embedding,
    format_news_for_embedding,
    format_announcement_for_embedding,
    load_info_docx,
    chunk_text
)
from .date_parser import (
    parse_date_expression,
    enhance_query_with_date,
    get_current_date_context,
    get_date_filter_sql,
    format_date_vietnamese
)

logger = logging.getLogger(__name__)

# ============================================
# QUERY EXPANSION - Mở rộng từ khóa tìm kiếm
# ============================================
SYNONYM_MAP = {
    # Trường học
    "trường": ["đại học", "tbu", "thái bình", "trường đại học thái bình", "nhà trường"],
    "đại học": ["trường", "tbu", "university", "trường đại học"],
    "tbu": ["trường đại học thái bình", "đại học thái bình", "trường"],
    
    # Đào tạo
    "ngành": ["chuyên ngành", "ngành học", "ngành đào tạo", "chương trình đào tạo"],
    "đào tạo": ["dạy", "học", "chương trình", "giảng dạy", "bồi dưỡng"],
    "học": ["đào tạo", "học tập", "sinh viên"],
    "sinh viên": ["sv", "học sinh", "người học", "học viên"],
    
    # Tổ chức
    "hiệu trưởng": ["lãnh đạo", "ban giám hiệu", "bgh"],
    "phòng": ["bộ phận", "đơn vị", "ban"],
    "khoa": ["bộ môn", "chuyên ngành"],
    "giảng viên": ["thầy", "cô", "giáo viên", "gv", "cán bộ giảng dạy"],
    
    # Lịch/Sự kiện  
    "lịch": ["lịch công tác", "kế hoạch", "chương trình", "hoạt động"],
    "họp": ["cuộc họp", "hội nghị", "buổi họp", "phiên họp"],
    "sự kiện": ["hoạt động", "chương trình", "lễ", "hội"],
    
    # Cơ sở vật chất
    "phòng họp": ["hội trường", "phòng hội thảo", "phòng hội nghị"],
    "địa chỉ": ["vị trí", "địa điểm", "nơi"],
    
    # Thời gian
    "năm": ["năm học", "niên khóa"],
    "học kỳ": ["kỳ học", "semester"],
    
    # Thông tin chung
    "thông tin": ["giới thiệu", "chi tiết", "mô tả"],
    "liên hệ": ["liên lạc", "điện thoại", "email", "hotline"],
    "tuyển sinh": ["đăng ký", "nhập học", "xét tuyển"],
}

def expand_query(query: str) -> str:
    """
    Mở rộng query với các từ đồng nghĩa để tìm kiếm tốt hơn
    
    Args:
        query: Câu hỏi gốc
        
    Returns:
        Query đã được mở rộng với từ đồng nghĩa
    """
    query_lower = query.lower()
    expanded_terms = []
    
    for key, synonyms in SYNONYM_MAP.items():
        if key in query_lower:
            # Thêm tối đa 2 từ đồng nghĩa quan trọng nhất
            expanded_terms.extend(synonyms[:2])
    
    if expanded_terms:
        # Ghép query gốc với các từ mở rộng
        expanded = f"{query} {' '.join(set(expanded_terms))}"
        logger.info(f"🔄 Query expanded: {query[:50]} → +{len(expanded_terms)} terms")
        return expanded
    
    return query


class RAGChain:
    """
    Main RAG Pipeline
    Coordinates embedding, retrieval, and generation
    """
    
    def __init__(self):
        self.embedding = embedding_model
        self.vector_store = vector_store
        self.llm = llm_generator
        self.cache = query_cache
        
        # Clear cache on startup to avoid stale responses
        self.cache.invalidate()
        logger.info("🧹 Cache cleared on startup")
    
    async def query(
        self,
        question: str,
        source_type: str = None,
        chat_history: List[Dict] = None,
        top_k: int = TOP_K_RETRIEVAL,
        threshold: float = SIMILARITY_THRESHOLD
    ) -> Dict:
        """
        Execute RAG pipeline
        
        Args:
            question: User's question
            source_type: Filter by source type (optional)
            chat_history: Conversation history
            top_k: Number of documents to retrieve
            threshold: Minimum similarity threshold
            
        Returns:
            {
                "answer": str,
                "sources": [{"content": str, "metadata": dict, "score": float}],
                "query": str,
                "num_retrieved": int
            }
        """
        logger.info(f"🔍 RAG Query: {question[:80]}...")
        
        try:
            # Step 0: Check if this is a greeting/casual chat
            is_greeting = self._is_greeting_or_casual(question)
            if is_greeting:
                logger.info("👋 Detected greeting/casual chat - skipping schedule lookup")
                # Return simple greeting response without RAG
                return self._handle_greeting(question)
            
            # Step 0b: Check cache first (skip for date-specific queries)
            date_info = parse_date_expression(question)
            is_schedule_query = self._is_schedule_query(question)
            
            # Only use cache for non-schedule queries
            if not is_schedule_query:
                cached = self.cache.get(question, source_type)
                if cached:
                    logger.info("⚡ Returning cached response")
                    return cached
            
            # Step 0c: Parse date from question and enhance query
            # Only enhance with date if actually asking about schedule
            if is_schedule_query:
                enhanced_query = enhance_query_with_date(question)
            else:
                enhanced_query = question
            current_date_ctx = get_current_date_context()
            
            # Step 0d: Expand query with synonyms for better retrieval
            expanded_query = expand_query(enhanced_query)
            
            # Step 1: Embed the expanded query
            logger.debug("Step 1: Embedding query...")
            query_embedding = self.embedding.embed_text(expanded_query)
            
            # Step 2: Retrieve relevant documents
            logger.debug("Step 2: Retrieving documents...")
            
            # If asking about schedule AND has date, do direct DB query
            extra_schedules = []
            target_date_str = None
            target_date_obj = None
            if is_schedule_query and date_info:
                target_date_obj = date_info.get('date')  # datetime object
                # Convert to string format YYYY-MM-DD for comparison with metadata
                if target_date_obj:
                    target_date_str = target_date_obj.strftime('%Y-%m-%d')
                extra_schedules = self._query_schedules_by_date(date_info)
                logger.info(f"📅 Found {len(extra_schedules)} schedules for specified date {target_date_str}")
            
            # Vector similarity search - reduce top_k if we already found direct matches
            v_top_k = top_k
            if extra_schedules:
                v_top_k = 2 # Only get 2 more context docs if we have direct matches
                
            results = self.vector_store.similarity_search(
                query_embedding,
                top_k=v_top_k,
                source_type=source_type,
                threshold=threshold
            )
            
            logger.info(f"📚 Retrieved {len(results)} relevant documents from vector store")
            
            # Step 3: Prepare context documents
            context_docs = []
            
            # Add extra schedules from direct query (highest priority)
            for schedule in extra_schedules:
                context_docs.append({
                    "content": schedule['content'],
                    "metadata": {
                        "source_type": "schedule", 
                        "date": schedule.get('date', ''),
                        "id": schedule.get('id', ''),
                        "source_id": schedule.get('id', '')
                    },
                    "score": 1.0  # Direct match = highest score
                })
            
            # Add vector search results, but FILTER BY DATE if we have a target date
            for doc_id, content, score, metadata in results:
                doc_date = metadata.get('date')
                doc_source = metadata.get('source_type')
                
                # If we have a target date and this is a schedule, strictly filter by date
                if target_date_str and doc_source == 'schedule':
                    if doc_date != target_date_str:
                        logger.debug(f"⏭️ Skipping schedule from different date: {doc_date}")
                        continue
                
                # Avoid duplicates
                if not any(d['content'] == content for d in context_docs):
                    context_docs.append({
                        "content": content,
                        "metadata": {**metadata, "doc_id": doc_id, "source_id": metadata.get('source_id') or metadata.get('id')},
                        "score": score
                    })
            
            # ==================== XỬ LÝ KHI HỎI LỊCH NGÀY CỤ THỂ ====================
            # Nếu đang hỏi về lịch của một ngày cụ thể và KHÔNG TÌM THẤY lịch
            if is_schedule_query and target_date_str:
                # Đếm số lịch đúng ngày trong context
                schedule_count_for_target = sum(
                    1 for d in context_docs 
                    if d['metadata'].get('source_type') == 'schedule' 
                    and d['metadata'].get('date') == target_date_str
                )
                
                if schedule_count_for_target == 0:
                    # KHÔNG có lịch cho ngày này - trả về thông báo rõ ràng
                    # KHÔNG làm fallback search lấy lịch ngày khác
                    from .date_parser import format_date_vietnamese
                    date_formatted = format_date_vietnamese(target_date_obj)
                    
                    logger.info(f"📅 No schedule found for {target_date_str}, returning clear message")
                    
                    return {
                        "answer": f"**Không có lịch công tác vào ngày {date_formatted}.**\n\n"
                                  f"Bạn có thể hỏi:\n"
                                  f"• \"Lịch công tác hôm nay\"\n"
                                  f"• \"Lịch công tác tuần này\"\n"
                                  f"• \"Lịch công tác ngày [ngày khác]\"",
                        "sources": [],
                        "query": question,
                        "num_retrieved": 0,
                        "target_date": target_date_str
                    }
            
            # ==================== FALLBACK CHO CÁC CÂU HỎI KHÁC (KHÔNG PHẢI LỊCH) ====================
            if not context_docs:
                # No relevant documents found - Try fallback search with lower threshold
                # CHỈ áp dụng cho câu hỏi KHÔNG phải về lịch ngày cụ thể
                logger.info("⚠️ No relevant documents found, trying fallback search...")
                fallback_results = self.vector_store.similarity_search(
                    query_embedding,
                    top_k=top_k * 2,  # Lấy nhiều hơn
                    source_type=None,  # Bỏ filter source_type
                    threshold=0.15  # Giảm threshold xuống rất thấp
                )
                
                if fallback_results:
                    logger.info(f"🔄 Fallback found {len(fallback_results)} documents")
                    for doc_id, content, score, metadata in fallback_results:
                        # KHÔNG lấy schedule từ fallback nếu đang hỏi về lịch
                        if is_schedule_query and metadata.get('source_type') == 'schedule':
                            continue
                            
                        if not any(d['content'] == content for d in context_docs):
                            context_docs.append({
                                "content": content,
                                "metadata": {**metadata, "doc_id": doc_id, "source_id": metadata.get('source_id') or metadata.get('id')},
                                "score": score
                            })
                
                # Nếu vẫn không có gì, trả về thông báo hữu ích hơn
                if not context_docs:
                    logger.info("⚠️ Still no documents after fallback")
                    return {
                        "answer": self._get_no_context_response(question),
                        "sources": [],
                        "query": question,
                        "num_retrieved": 0
                    }
            
            # Step 4: Generate response using LLM with date context
            logger.debug("Step 4: Generating response...")
            answer = await self.llm.generate(
                query=question,
                context_docs=context_docs,
                chat_history=chat_history,
                extra_context=current_date_ctx
            )
            
            # Prepare sources for response (truncate content for display)
            sources = [
                {
                    "content": d["content"][:300] + "..." if len(d["content"]) > 300 else d["content"],
                    "metadata": d["metadata"],
                    "source_type": d["metadata"].get("source_type"),
                    "source_id": d["metadata"].get("source_id") or d["metadata"].get("id"),
                    "score": round(d["score"], 3)
                }
                for d in context_docs
            ]
            
            result = {
                "answer": answer,
                "sources": sources,
                "query": question,
                "num_retrieved": len(context_docs)
            }
            
            # Cache the result (only for non-schedule queries)
            if not is_schedule_query:
                self.cache.set(question, result, source_type)
            
            return result
            
        except Exception as e:
            logger.error(f"❌ RAG query error: {e}")
            return {
                "answer": "Xin lỗi, có lỗi xảy ra khi xử lý câu hỏi của bạn. Vui lòng thử lại sau.",
                "sources": [],
                "query": question,
                "num_retrieved": 0,
                "error": str(e)
            }
    
    def _is_greeting_or_casual(self, question: str) -> bool:
        """Check if question is a greeting or casual chat (not asking for info)"""
        greeting_patterns = [
            'xin chào', 'chào bạn', 'chào', 'hello', 'hi', 'hey',
            'cảm ơn', 'thank', 'thanks', 'tạm biệt', 'bye',
            'bạn là ai', 'bạn tên gì', 'ai đó', 'bạn có thể làm gì',
            'bạn khỏe', 'khỏe không', 'ơi', 'ê', 'này'
        ]
        question_lower = question.lower().strip()
        
        # Short greetings (< 15 chars) are usually casual
        if len(question_lower) < 15 and any(g in question_lower for g in greeting_patterns):
            return True
        
        # Check if ONLY greeting words (no other content)
        for pattern in greeting_patterns:
            if question_lower == pattern or question_lower.startswith(pattern + ' '):
                # Check if there's actual question content after greeting
                remaining = question_lower.replace(pattern, '').strip()
                if len(remaining) < 10:  # Just greeting, no real question
                    return True
        
        return False
    
    def _is_schedule_query(self, question: str) -> bool:
        """Check if question is specifically about schedule/calendar"""
        # Must contain schedule-specific keywords (with and without diacritics)
        schedule_keywords = [
            # Có dấu
            'lịch', 'lịch công tác', 'lịch họp', 'lịch làm việc',
            'cuộc họp', 'họp gì', 'sự kiện', 'hoạt động gì',
            'có gì', 'làm gì', 'diễn ra', 'tổ chức',
            # Không dấu
            'lich', 'lich cong tac', 'lich hop', 'lich lam viec',
            'cuoc hop', 'hop gi', 'su kien', 'hoat dong gi',
            'co gi', 'lam gi', 'dien ra', 'to chuc'
        ]
        
        # Time-related keywords that indicate asking about schedule
        time_schedule_phrases = [
            # Có dấu
            'hôm nay có', 'ngày mai có', 'tuần này có', 'tuần sau có',
            'hôm nay làm', 'ngày mai làm', 'có lịch', 'có họp',
            'lịch gì', 'họp gì', 'gì không',
            # Không dấu
            'hom nay co', 'ngay mai co', 'tuan nay co', 'tuan sau co',
            'hom nay lam', 'ngay mai lam', 'co lich', 'co hop',
            'lich gi', 'hop gi', 'gi khong'
        ]
        
        question_lower = question.lower()
        
        # Check for explicit schedule keywords
        if any(kw in question_lower for kw in schedule_keywords):
            return True
        
        # Check for time + schedule phrases
        if any(phrase in question_lower for phrase in time_schedule_phrases):
            return True
        
        return False
    
    def _handle_greeting(self, question: str) -> dict:
        """
        Handle greeting/casual chat without RAG lookup
        
        Args:
            question: User's greeting message
            
        Returns:
            Response dict with friendly greeting
        """
        question_lower = question.lower().strip()
        
        # Detect type of greeting and respond appropriately
        if any(g in question_lower for g in ['xin chào', 'chào bạn', 'chào', 'hello', 'hi', 'hey']):
            answer = "Xin chào! 👋 Tôi là **Trợ lý ảo TBU**. Tôi có thể giúp bạn:\n\n" \
                     "📅 **Tra cứu lịch công tác** - Hỏi: \"Hôm nay có lịch gì?\"\n" \
                     "📰 **Tin tức & Thông báo** - Hỏi: \"Tin tức mới nhất\"\n" \
                     "🏫 **Thông tin trường** - Hỏi: \"Trường có những ngành đào tạo gì?\"\n\n" \
                     "Bạn cần hỗ trợ gì ạ?"
        elif any(g in question_lower for g in ['cảm ơn', 'thank', 'thanks']):
            answer = "Không có gì ạ! 😊 Rất vui được hỗ trợ bạn. Nếu cần thêm thông tin gì, cứ hỏi tôi nhé!"
        elif any(g in question_lower for g in ['tạm biệt', 'bye', 'goodbye']):
            answer = "Tạm biệt bạn! 👋 Hẹn gặp lại. Chúc bạn một ngày tốt lành!"
        elif any(g in question_lower for g in ['bạn là ai', 'bạn tên gì', 'ai đó']):
            answer = "Tôi là **Trợ lý ảo TBU** - chatbot hỗ trợ tra cứu thông tin của Trường Đại học Thái Bình. " \
                     "Tôi có thể giúp bạn xem lịch công tác, tin tức, thông báo và các thông tin về nhà trường."
        elif any(g in question_lower for g in ['bạn có thể làm gì', 'giúp gì', 'hỗ trợ gì']):
            answer = "Tôi có thể hỗ trợ bạn:\n\n" \
                     "📅 **Lịch công tác**: Tra cứu lịch họp, sự kiện theo ngày\n" \
                     "📰 **Tin tức**: Xem tin tức mới nhất của trường\n" \
                     "📢 **Thông báo**: Xem các thông báo quan trọng\n" \
                     "🏫 **Thông tin trường**: Ngành đào tạo, tuyển sinh, liên hệ...\n\n" \
                     "Hãy đặt câu hỏi, tôi sẽ cố gắng trả lời tốt nhất!"
        else:
            answer = "Xin chào! Tôi là Trợ lý ảo TBU. Bạn cần hỗ trợ gì ạ?"
        
        return {
            "answer": answer,
            "sources": [],
            "query": question,
            "num_retrieved": 0
        }
    
    def _query_schedules_by_date(self, date_info: dict) -> List[Dict]:
        """
        Query schedules directly from database by date
        
        Args:
            date_info: Parsed date information
            
        Returns:
            List of schedule dictionaries
        """
        import pyodbc
        
        try:
            where_clause, params = get_date_filter_sql(date_info)
            if not where_clause:
                return []
            
            conn = pyodbc.connect(get_connection_string())
            cursor = conn.cursor()
            
            query = f"""
                SELECT id, date, day_of_week, start_time, end_time,
                       content, location, leader, participants,
                       preparing_unit, cooperating_units, notes
                FROM schedules
                WHERE status IN ('approved', 'draft') AND {where_clause}
                ORDER BY date, start_time
            """
            
            cursor.execute(query, params)
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()
            conn.close()
            
            schedules = []
            for row in rows:
                schedule_dict = dict(zip(columns, row))
                # Format schedule for display
                formatted = format_schedule_for_embedding(schedule_dict)
                logger.info(f"📋 Schedule formatted content: {formatted[:200]}...")
                schedules.append({
                    'id': str(schedule_dict.get('id', '')),
                    'content': formatted,
                    'date': str(schedule_dict.get('date', ''))
                })
            
            return schedules
            
        except Exception as e:
            logger.error(f"❌ Error querying schedules by date: {e}")
            return []
    
    def _get_no_context_response(self, question: str) -> str:
        """Generate helpful response when no context is found"""
        # Check if it's a greeting
        greetings = ['xin chào', 'chào', 'hello', 'hi', 'hey']
        if any(g in question.lower() for g in greetings):
            return """Xin chào! 👋

Tôi là **Trợ lý ảo TBU** - hệ thống hỗ trợ tra cứu thông tin cho Trường Đại học Thái Bình.

Tôi có thể giúp bạn:
• 📅 Tra cứu lịch công tác
• 📰 Xem tin tức, thông báo
• 🏫 Tìm hiểu thông tin về trường

Hãy đặt câu hỏi để bắt đầu!"""
        
        # Check if asking for help
        help_keywords = ['giúp', 'trợ giúp', 'help', 'hướng dẫn', 'làm gì']
        if any(k in question.lower() for k in help_keywords):
            return """📋 **Hướng dẫn sử dụng Trợ lý TBU**

Bạn có thể hỏi tôi về:

**Lịch công tác:**
• "Lịch công tác hôm nay"
• "Lịch tuần này"
• "Lịch của Hiệu trưởng"
• "Ngày mai có họp gì?"

**Tin tức & Thông báo:**
• "Tin tức mới nhất"
• "Thông báo quan trọng"

**Thông tin trường:**
• "Giới thiệu về trường"
• "Các ngành đào tạo"
• "Lịch sử trường"
• "Địa chỉ liên hệ"

Hãy đặt câu hỏi cụ thể để tôi có thể hỗ trợ tốt nhất!"""
        
        # More helpful default response with suggestions
        question_lower = question.lower()
        
        # Gợi ý dựa trên nội dung câu hỏi
        suggestions = []
        if any(kw in question_lower for kw in ['ngành', 'đào tạo', 'học']):
            suggestions.append('• "Trường có những ngành đào tạo nào?"')
            suggestions.append('• "Chương trình đào tạo của trường"')
        elif any(kw in question_lower for kw in ['lịch', 'họp', 'sự kiện']):
            suggestions.append('• "Lịch công tác hôm nay"')
            suggestions.append('• "Lịch công tác tuần này"')
        elif any(kw in question_lower for kw in ['trường', 'tbu', 'giới thiệu']):
            suggestions.append('• "Giới thiệu về trường Đại học Thái Bình"')
            suggestions.append('• "Lịch sử hình thành trường"')
        else:
            suggestions.append('• "Lịch công tác hôm nay"')
            suggestions.append('• "Thông tin về trường Đại học Thái Bình"')
        
        suggestions_text = '\n'.join(suggestions)
        
        return f"""Tôi chưa tìm thấy thông tin chính xác về câu hỏi: **"{question[:60]}..."**

📌 **Gợi ý câu hỏi tương tự:**
{suggestions_text}

💡 Hoặc bạn có thể:
• Diễn đạt câu hỏi theo cách khác
• Hỏi về chủ đề cụ thể hơn
• Gõ "giúp đỡ" để xem hướng dẫn chi tiết"""
    
    async def index_schedules(self, schedules: List[Dict]) -> int:
        """
        Index schedules into vector store
        
        Args:
            schedules: List of schedule dictionaries
            
        Returns:
            Number of indexed documents
        """
        if not schedules:
            logger.warning("⚠️ No schedules to index")
            return 0
        
        logger.info(f"📊 Indexing {len(schedules)} schedules...")
        
        # Delete old schedule embeddings first
        self.vector_store.delete_by_source("schedule")
        
        texts = []
        source_ids = []
        metadatas = []
        
        for schedule in schedules:
            # Format schedule for embedding
            text = format_schedule_for_embedding(schedule)
            texts.append(text)
            
            source_ids.append(str(schedule.get('id', '')))
            
            metadatas.append({
                "date": str(schedule.get('date', '')),
                "leader": schedule.get('leader', ''),
                "location": schedule.get('location', ''),
                "content_preview": schedule.get('content', '')[:100]
            })
        
        # Generate embeddings
        logger.info("Generating embeddings...")
        embeddings = self.embedding.embed_texts(texts)
        
        # Store in vector database
        logger.info("Storing in vector database...")
        self.vector_store.add_documents(
            texts=texts,
            embeddings=embeddings,
            source_type="schedule",
            source_ids=source_ids,
            metadatas=metadatas
        )
        
        logger.info(f"✅ Indexed {len(texts)} schedules successfully")
        return len(texts)
    
    async def index_news(self, news_list: List[Dict]) -> int:
        """
        Index news into vector store
        
        Args:
            news_list: List of news dictionaries
            
        Returns:
            Number of indexed documents
        """
        if not news_list:
            return 0
        
        logger.info(f"📰 Indexing {len(news_list)} news articles...")
        
        self.vector_store.delete_by_source("news")
        
        texts = []
        source_ids = []
        metadatas = []
        
        for news in news_list:
            text = format_news_for_embedding(news)
            
            # Chunk if too long
            chunks = chunk_text(text)
            
            for i, chunk in enumerate(chunks):
                texts.append(chunk)
                source_ids.append(f"{news.get('id', '')}_{i}")
                metadatas.append({
                    "title": news.get('title', ''),
                    "category": news.get('category', ''),
                    "chunk_index": i
                })
        
        if texts:
            embeddings = self.embedding.embed_texts(texts)
            self.vector_store.add_documents(
                texts=texts,
                embeddings=embeddings,
                source_type="news",
                source_ids=source_ids,
                metadatas=metadatas
            )
        
        logger.info(f"✅ Indexed {len(texts)} news chunks")
        return len(texts)
    
    async def index_announcements(self, announcements: List[Dict]) -> int:
        """
        Index announcements into vector store
        
        Args:
            announcements: List of announcement dictionaries
            
        Returns:
            Number of indexed documents
        """
        if not announcements:
            return 0
        
        logger.info(f"📢 Indexing {len(announcements)} announcements...")
        
        self.vector_store.delete_by_source("announcement")
        
        texts = []
        source_ids = []
        metadatas = []
        
        for ann in announcements:
            text = format_announcement_for_embedding(ann)
            chunks = chunk_text(text)
            
            for i, chunk in enumerate(chunks):
                texts.append(chunk)
                source_ids.append(f"{ann.get('id', '')}_{i}")
                metadatas.append({
                    "title": ann.get('title', ''),
                    "priority": ann.get('priority', ''),
                    "chunk_index": i
                })
        
        if texts:
            embeddings = self.embedding.embed_texts(texts)
            self.vector_store.add_documents(
                texts=texts,
                embeddings=embeddings,
                source_type="announcement",
                source_ids=source_ids,
                metadatas=metadatas
            )
        
        logger.info(f"✅ Indexed {len(texts)} announcement chunks")
        return len(texts)
    
    async def index_document(self) -> int:
        """
        Index info.docx into vector store
        
        Returns:
            Number of indexed chunks
        """
        logger.info("📄 Indexing info.docx...")
        
        # Delete old document embeddings
        self.vector_store.delete_by_source("document")
        
        # Load and chunk document
        docs = load_info_docx()
        
        if not docs:
            logger.warning("⚠️ No content from info.docx")
            return 0
        
        texts = [d['content'] for d in docs]
        metadatas = [d['metadata'] for d in docs]
        
        # Generate embeddings
        embeddings = self.embedding.embed_texts(texts)
        
        # Store
        self.vector_store.add_documents(
            texts=texts,
            embeddings=embeddings,
            source_type="document",
            metadatas=metadatas
        )
        
        logger.info(f"✅ Indexed {len(texts)} document chunks")
        return len(texts)
    
    async def reindex_all_from_db(self) -> Dict:
        """
        Reindex all data from database
        
        Returns:
            Dict with counts of indexed items
        """
        import pyodbc
        
        logger.info("🔄 Starting full reindex from database...")
        
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()
        
        results = {}
        
        # Index schedules (approved hoặc draft để test)
        cursor.execute("""
            SELECT id, date, day_of_week, start_time, end_time, 
                   content, location, leader, participants, 
                   preparing_unit, cooperating_units, notes
            FROM schedules 
            WHERE status IN ('approved', 'draft')
        """)
        
        columns = [col[0] for col in cursor.description]
        schedules = [dict(zip(columns, row)) for row in cursor.fetchall()]
        results['schedules'] = await self.index_schedules(schedules)
        
        # Index news
        cursor.execute("""
            SELECT id, title, summary, content, category, published_at
            FROM news
        """)
        
        columns = [col[0] for col in cursor.description]
        news_list = [dict(zip(columns, row)) for row in cursor.fetchall()]
        results['news'] = await self.index_news(news_list)
        
        # Index announcements
        cursor.execute("""
            SELECT id, title, content, priority, published_at
            FROM announcements
            WHERE expires_at IS NULL OR expires_at > GETDATE()
        """)
        
        columns = [col[0] for col in cursor.description]
        announcements = [dict(zip(columns, row)) for row in cursor.fetchall()]
        results['announcements'] = await self.index_announcements(announcements)
        
        # Index info.docx
        results['document'] = await self.index_document()
        
        conn.close()
        
        logger.info(f"✅ Full reindex complete: {results}")
        return results
    
    async def reindex_schedules_from_db(self) -> int:
        """Reindex only schedules from database"""
        import pyodbc
        
        logger.info("🔄 Reindexing schedules from database...")
        
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, date, day_of_week, start_time, end_time, 
                   content, location, leader, participants, 
                   preparing_unit, cooperating_units, notes
            FROM schedules 
            WHERE status IN ('approved', 'draft')
        """)
        
        columns = [col[0] for col in cursor.description]
        schedules = [dict(zip(columns, row)) for row in cursor.fetchall()]
        conn.close()
        
        count = await self.index_schedules(schedules)
        logger.info(f"✅ Reindexed {count} schedules")
        return count
    
    async def reindex_news_from_db(self) -> int:
        """Reindex only news from database"""
        import pyodbc
        
        logger.info("🔄 Reindexing news from database...")
        
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, title, summary, content, category, published_at
            FROM news
        """)
        
        columns = [col[0] for col in cursor.description]
        news_list = [dict(zip(columns, row)) for row in cursor.fetchall()]
        conn.close()
        
        count = await self.index_news(news_list)
        logger.info(f"✅ Reindexed {count} news")
        return count
    
    async def reindex_announcements_from_db(self) -> int:
        """Reindex only announcements from database"""
        import pyodbc
        
        logger.info("🔄 Reindexing announcements from database...")
        
        conn = pyodbc.connect(get_connection_string())
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, title, content, priority, published_at
            FROM announcements
            WHERE expires_at IS NULL OR expires_at > GETDATE()
        """)
        
        columns = [col[0] for col in cursor.description]
        announcements = [dict(zip(columns, row)) for row in cursor.fetchall()]
        conn.close()
        
        count = await self.index_announcements(announcements)
        logger.info(f"✅ Reindexed {count} announcements")
        return count
    
    def get_stats(self) -> Dict:
        """Get vector store statistics"""
        return self.vector_store.get_stats()


# Singleton instance
rag_chain = RAGChain()


# Test function
async def test_rag_chain():
    """Test RAG chain functionality"""
    print("Testing RAG Chain...")
    
    chain = RAGChain()
    
    # Check LLM health first
    is_healthy = await chain.llm.check_health()
    print(f"LLM Health: {is_healthy}")
    
    if not is_healthy:
        print("❌ Please start Ollama first")
        return
    
    # Test query (will use whatever is in vector store)
    print("\n--- Testing Query ---")
    result = await chain.query("Xin chào")
    print(f"Answer: {result['answer'][:200]}...")
    print(f"Sources: {len(result['sources'])}")
    
    # Get stats
    print("\n--- Vector Store Stats ---")
    stats = chain.get_stats()
    print(f"Stats: {stats}")
    
    await chain.llm.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(test_rag_chain())
