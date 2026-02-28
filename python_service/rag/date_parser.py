"""
Vietnamese Date Parser for RAG Chatbot
Xử lý các biểu thức ngày tháng tiếng Việt

@author TBU AI Team
"""
import re
from datetime import datetime, timedelta
from typing import Optional, Tuple, List
import logging

logger = logging.getLogger(__name__)

# Vietnamese day names
VIETNAMESE_DAYS = {
    'thứ hai': 0, 'thứ 2': 0, 't2': 0,
    'thứ ba': 1, 'thứ 3': 1, 't3': 1,
    'thứ tư': 2, 'thứ 4': 2, 't4': 2,
    'thứ năm': 3, 'thứ 5': 3, 't5': 3,
    'thứ sáu': 4, 'thứ 6': 4, 't6': 4,
    'thứ bảy': 5, 'thứ 7': 5, 't7': 5,
    'chủ nhật': 6, 'cn': 6
}

# Relative time expressions
RELATIVE_DAYS = {
    'hôm nay': 0,
    'hôm qua': -1,
    'ngày mai': 1,
    'ngày kia': 2,
    'ngày mốt': 2,
    'tuần này': 'this_week',
    'tuần sau': 'next_week',
    'tuần trước': 'last_week',
    'tháng này': 'this_month',
    'tháng sau': 'next_month',
    'tháng trước': 'last_month'
}


def parse_date_expression(text: str) -> Optional[dict]:
    """
    Parse Vietnamese date expressions from text
    
    Args:
        text: Input text with date expression
        
    Returns:
        Dict with 'type' and date info, or None if no date found
        Types: 'single_date', 'date_range', 'week', 'month'
    """
    text_lower = text.lower().strip()
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Check for "N ngày nữa" / "N ngày tới" / "N ngày sau"
    match = re.search(r'(\d+)\s*ngày\s*(nữa|tới|sau|tiếp)', text_lower)
    if match:
        days = int(match.group(1))
        target_date = today + timedelta(days=days)
        return {
            'type': 'single_date',
            'date': target_date,
            'original': match.group(0)
        }
    
    # Check for "N ngày trước"
    match = re.search(r'(\d+)\s*ngày\s*trước', text_lower)
    if match:
        days = int(match.group(1))
        target_date = today - timedelta(days=days)
        return {
            'type': 'single_date',
            'date': target_date,
            'original': match.group(0)
        }
    
    # Check for relative days (hôm nay, ngày mai, etc.)
    for expr, value in RELATIVE_DAYS.items():
        if expr in text_lower:
            if isinstance(value, int):
                target_date = today + timedelta(days=value)
                return {
                    'type': 'single_date',
                    'date': target_date,
                    'original': expr
                }
            elif value == 'this_week':
                # Monday to Sunday of current week
                start = today - timedelta(days=today.weekday())
                end = start + timedelta(days=6)
                return {
                    'type': 'date_range',
                    'start': start,
                    'end': end,
                    'original': expr
                }
            elif value == 'next_week':
                start = today - timedelta(days=today.weekday()) + timedelta(weeks=1)
                end = start + timedelta(days=6)
                return {
                    'type': 'date_range',
                    'start': start,
                    'end': end,
                    'original': expr
                }
            elif value == 'last_week':
                start = today - timedelta(days=today.weekday()) - timedelta(weeks=1)
                end = start + timedelta(days=6)
                return {
                    'type': 'date_range',
                    'start': start,
                    'end': end,
                    'original': expr
                }
            elif value == 'this_month':
                start = today.replace(day=1)
                # Last day of month
                if today.month == 12:
                    end = today.replace(year=today.year+1, month=1, day=1) - timedelta(days=1)
                else:
                    end = today.replace(month=today.month+1, day=1) - timedelta(days=1)
                return {
                    'type': 'date_range',
                    'start': start,
                    'end': end,
                    'original': expr
                }
    
    # Check for specific date format: dd/mm, dd/mm/yyyy, dd-mm-yyyy
    date_patterns = [
        (r'(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})', '%d/%m/%Y'),
        (r'(\d{1,2})[/\-](\d{1,2})', '%d/%m'),
    ]
    
    for pattern, fmt in date_patterns:
        match = re.search(pattern, text_lower)
        if match:
            try:
                if fmt == '%d/%m/%Y':
                    date_str = f"{match.group(1)}/{match.group(2)}/{match.group(3)}"
                    target_date = datetime.strptime(date_str, '%d/%m/%Y')
                elif fmt == '%d/%m':
                    date_str = f"{match.group(1)}/{match.group(2)}/{today.year}"
                    target_date = datetime.strptime(date_str, '%d/%m/%Y')
                
                return {
                    'type': 'single_date',
                    'date': target_date,
                    'original': match.group(0)
                }
            except ValueError:
                continue
    
    # Check for Vietnamese natural language date: "ngày X tháng Y năm Z"
    # Patterns by specificity (most specific first):
    #   "ngày 27 tháng 1 năm 2026" → full date
    #   "ngày 27 tháng 1"          → day + month (current year)
    #   "ngày 27"                   → day only (current month)
    vn_date_full = re.search(
        r'ngày\s*(\d{1,2})\s*tháng\s*(\d{1,2})\s*năm\s*(\d{4})', text_lower
    )
    vn_date_month = re.search(
        r'ngày\s*(\d{1,2})\s*tháng\s*(\d{1,2})', text_lower
    )
    vn_date_day = re.search(
        r'ngày\s*(\d{1,2})', text_lower
    )
    
    if vn_date_full:
        try:
            day = int(vn_date_full.group(1))
            month = int(vn_date_full.group(2))
            year = int(vn_date_full.group(3))
            target_date = datetime(year, month, day)
            return {
                'type': 'single_date',
                'date': target_date,
                'original': vn_date_full.group(0)
            }
        except ValueError:
            pass
    elif vn_date_month:
        try:
            day = int(vn_date_month.group(1))
            month = int(vn_date_month.group(2))
            target_date = today.replace(month=month, day=day)
            return {
                'type': 'single_date',
                'date': target_date,
                'original': vn_date_month.group(0)
            }
        except ValueError:
            pass
    elif vn_date_day:
        try:
            day = int(vn_date_day.group(1))
            target_date = today.replace(day=day)
            return {
                'type': 'single_date',
                'date': target_date,
                'original': vn_date_day.group(0)
            }
        except ValueError:
            pass
    
    # Check for Vietnamese day names (thứ hai, thứ ba, etc.)
    for day_name, weekday in VIETNAMESE_DAYS.items():
        if day_name in text_lower:
            # Find the next occurrence of that weekday
            days_ahead = weekday - today.weekday()
            if days_ahead < 0:  # Target day already happened this week
                days_ahead += 7
            target_date = today + timedelta(days=days_ahead)
            return {
                'type': 'single_date',
                'date': target_date,
                'original': day_name
            }
    
    return None


def format_date_vietnamese(dt: datetime) -> str:
    """Format datetime to Vietnamese date string"""
    days_vn = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật']
    day_name = days_vn[dt.weekday()]
    return f"{day_name}, ngày {dt.day:02d}/{dt.month:02d}/{dt.year}"


def get_date_filter_sql(date_info: dict) -> Tuple[str, List]:
    """
    Generate SQL WHERE clause for date filtering
    
    Args:
        date_info: Result from parse_date_expression
        
    Returns:
        Tuple of (where_clause, params)
    """
    if date_info is None:
        return "", []
    
    if date_info['type'] == 'single_date':
        date = date_info['date']
        # Format for SQL Server
        date_str = date.strftime('%Y-%m-%d')
        return "CAST(date AS DATE) = ?", [date_str]
    
    elif date_info['type'] == 'date_range':
        start = date_info['start']
        end = date_info['end']
        start_str = start.strftime('%Y-%m-%d')
        end_str = end.strftime('%Y-%m-%d')
        return "CAST(date AS DATE) BETWEEN ? AND ?", [start_str, end_str]
    
    return "", []


def enhance_query_with_date(query: str) -> str:
    """
    Enhance query by adding explicit date information
    
    Args:
        query: Original user query
        
    Returns:
        Enhanced query with resolved dates
    """
    date_info = parse_date_expression(query)
    
    if date_info is None:
        return query
    
    if date_info['type'] == 'single_date':
        date_str = format_date_vietnamese(date_info['date'])
        enhanced = f"{query} (Ngày cần tìm: {date_str})"
        logger.info(f"📅 Resolved date: {date_info['original']} -> {date_str}")
        return enhanced
    
    elif date_info['type'] == 'date_range':
        start_str = format_date_vietnamese(date_info['start'])
        end_str = format_date_vietnamese(date_info['end'])
        enhanced = f"{query} (Khoảng thời gian: từ {start_str} đến {end_str})"
        logger.info(f"📅 Resolved date range: {date_info['original']} -> {start_str} to {end_str}")
        return enhanced
    
    return query


def get_current_date_context() -> str:
    """Get current date context for LLM"""
    today = datetime.now()
    date_str = format_date_vietnamese(today)
    return f"Hôm nay là {date_str}."


# Test
if __name__ == "__main__":
    test_queries = [
        "Hôm nay có lịch gì không?",
        "Lịch ngày mai",
        "3 ngày nữa có họp gì?",
        "Lịch tuần này",
        "Lịch công tác ngày 25/01/2026",
        "Thứ 5 có lịch gì?",
        "5 ngày tới có gì?",
        "Tuần sau có sự kiện gì?"
    ]
    
    for q in test_queries:
        result = parse_date_expression(q)
        print(f"Query: {q}")
        print(f"Result: {result}")
        print(f"Enhanced: {enhance_query_with_date(q)}")
        print("-" * 50)
