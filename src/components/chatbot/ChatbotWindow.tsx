/**
 * Cửa sổ chatbot chính
 * Bao gồm: header, danh sách tin nhắn, input nhập tin nhắn
 */

import { useState, useRef, useEffect } from 'react';
import { X, Send, Trash2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from './ChatMessage';
import { 
  ChatMessage as ChatMessageType,
  processMessage,
  createMessage
} from '@/utils/chatbot/chatbotLogic';
import { useSchedules } from '@/contexts/ScheduleContext';
import { cn } from '@/lib/utils';

interface ChatbotWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

// Tin nhắn chào mừng mặc định
const WELCOME_MESSAGE = createMessage(
  'Xin chào! 👋\n\nTôi là trợ lý tra cứu lịch công tác của Trường Đại học Thái Bình.\n\nTôi có thể giúp bạn:\n• Xem lịch công tác hôm nay\n• Xem lịch công tác tuần này\n• Tra cứu lịch theo ngày cụ thể\n• Tra cứu lịch theo lãnh đạo\n\nHãy đặt câu hỏi để bắt đầu!',
  'bot'
);

// Các câu hỏi gợi ý
const SUGGESTED_QUESTIONS = [
  'Lịch công tác hôm nay',
  'Lịch tuần này',
  'Chiều nay có lịch gì?',
  'Hiệu trưởng hôm nay làm gì?',
];

export function ChatbotWindow({ isOpen, onClose }: ChatbotWindowProps) {
  // State quản lý tin nhắn
  const [messages, setMessages] = useState<ChatMessageType[]>([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Lấy dữ liệu lịch từ context
  const { schedules } = useSchedules();
  
  // Tự động scroll xuống cuối khi có tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Focus vào input khi mở chatbot
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);
  
  /**
   * Xử lý gửi tin nhắn
   */
  const handleSendMessage = async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput) return;
    
    // Thêm tin nhắn của người dùng
    const userMessage = createMessage(trimmedInput, 'user');
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    
    // Hiệu ứng đang gõ
    setIsTyping(true);
    
    // Giả lập delay để tự nhiên hơn
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
    
    // Xử lý và trả lời
    const botResponse = processMessage(trimmedInput, schedules);
    const botMessage = createMessage(botResponse, 'bot');
    
    setMessages(prev => [...prev, botMessage]);
    setIsTyping(false);
  };
  
  /**
   * Xử lý nhấn Enter
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  /**
   * Xử lý chọn câu hỏi gợi ý
   */
  const handleSuggestedQuestion = (question: string) => {
    setInputValue(question);
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };
  
  /**
   * Xóa lịch sử chat
   */
  const handleClearChat = () => {
    setMessages([WELCOME_MESSAGE]);
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className={cn(
        'fixed bottom-20 right-4 z-50',
        'w-[380px] max-w-[calc(100vw-2rem)]',
        'bg-background border border-border rounded-2xl shadow-2xl',
        'flex flex-col',
        'animate-in slide-in-from-bottom-5 fade-in duration-300'
      )}
      style={{ height: '500px', maxHeight: 'calc(100vh - 120px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary text-primary-foreground rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Trợ lý TBU</h3>
            <p className="text-xs text-primary-foreground/70">Tra cứu lịch công tác</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
            onClick={handleClearChat}
            title="Xóa lịch sử chat"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
            onClick={onClose}
            title="Đóng"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-3 p-3 rounded-lg bg-secondary/50">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Suggested Questions (chỉ hiện khi ít tin nhắn) */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-muted-foreground mb-2">Gợi ý câu hỏi:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => handleSuggestedQuestion(question)}
              >
                {question}
              </Button>
            ))}
          </div>
        </div>
      )}
      
      {/* Input Area */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Nhập câu hỏi..."
            className="flex-1"
            disabled={isTyping}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!inputValue.trim() || isTyping}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Chatbot hỗ trợ tra cứu lịch công tác
        </p>
      </div>
    </div>
  );
}
