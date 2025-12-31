/**
 * Cửa sổ chatbot chính - Modern Academic UI
 * Thiết kế theo phong cách Microsoft Copilot / Google Bard
 * Phù hợp website trường đại học
 */

import { useState, useRef, useEffect } from 'react';
import { X, Send, Trash2, Sparkles, Calendar, User, Clock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

// Tin nhắn chào mừng mặc định - dạng card
const WELCOME_MESSAGE = createMessage(
  '👋 **Xin chào!**\n\nTôi là **Trợ lý TBU** – hỗ trợ tra cứu lịch công tác của Trường Đại học Thái Bình.\n\n📋 Tôi có thể giúp bạn:\n• Xem lịch công tác hôm nay\n• Xem lịch công tác tuần này\n• Tra cứu lịch theo ngày cụ thể\n• Tra cứu lịch theo lãnh đạo\n\n💡 Hãy đặt câu hỏi hoặc chọn gợi ý bên dưới!',
  'bot'
);

// Các câu hỏi gợi ý với icon
const SUGGESTED_QUESTIONS = [
  { text: 'Lịch hôm nay', icon: Calendar, emoji: '📅' },
  { text: 'Lịch tuần này', icon: Calendar, emoji: '📆' },
  { text: 'Chiều nay có lịch gì?', icon: Clock, emoji: '⏰' },
  { text: 'Hiệu trưởng hôm nay làm gì?', icon: User, emoji: '👤' },
];

export function ChatbotWindow({ isOpen, onClose }: ChatbotWindowProps) {
  // State quản lý tin nhắn
  const [messages, setMessages] = useState<ChatMessageType[]>([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
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
      setTimeout(() => inputRef.current?.focus(), 300);
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
    await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400));
    
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
        'fixed bottom-24 right-4 z-50',
        'w-[400px] max-w-[calc(100vw-2rem)]',
        'bg-background rounded-2xl overflow-hidden',
        'flex flex-col',
        'animate-in slide-in-from-bottom-5 fade-in duration-300',
        // Modern shadow with multiple layers
        'shadow-[0_8px_30px_rgb(0,0,0,0.12),0_4px_8px_rgb(0,0,0,0.06)]',
        'border border-border/50'
      )}
      style={{ height: '520px', maxHeight: 'calc(100vh - 140px)' }}
    >
      {/* Header với gradient */}
      <div 
        className="relative px-4 py-4 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, hsl(213 54% 24%) 0%, hsl(213 60% 18%) 50%, hsl(213 54% 28%) 100%)'
        }}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar với glow effect */}
            <div className="relative">
              <div 
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center',
                  'bg-gradient-to-br from-accent to-accent/80',
                  'avatar-glow'
                )}
              >
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              {/* Status indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-primary flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              </div>
            </div>
            
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                Trợ lý TBU
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-white/70">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Đang hoạt động
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
              onClick={handleClearChat}
              title="Xóa lịch sử chat"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
              onClick={onClose}
              title="Đóng"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Messages Area */}
      <ScrollArea className="flex-1 bg-gradient-to-b from-secondary/30 to-background">
        <div className="p-4 space-y-4">
          {messages.map((message, index) => (
            <div 
              key={message.id} 
              className="message-pop"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <ChatMessage message={message} />
            </div>
          ))}
          
          {/* Typing Indicator - 3 chấm động mềm */}
          {isTyping && (
            <div className="flex gap-3 p-4 message-pop">
              <div 
                className={cn(
                  'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center',
                  'bg-gradient-to-br from-primary to-primary/80'
                )}
              >
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-secondary/80">
                <span 
                  className="w-2 h-2 bg-primary/60 rounded-full typing-bounce" 
                  style={{ animationDelay: '0ms' }} 
                />
                <span 
                  className="w-2 h-2 bg-primary/60 rounded-full typing-bounce" 
                  style={{ animationDelay: '150ms' }} 
                />
                <span 
                  className="w-2 h-2 bg-primary/60 rounded-full typing-bounce" 
                  style={{ animationDelay: '300ms' }} 
                />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Suggested Questions - Chips với icons */}
      {messages.length <= 2 && !isTyping && (
        <div className="px-4 py-3 border-t border-border/50 bg-secondary/20">
          <p className="text-xs text-muted-foreground mb-2.5 font-medium flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3" />
            Gợi ý câu hỏi:
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((item, index) => (
              <button
                key={index}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-2 rounded-full',
                  'text-xs font-medium',
                  'bg-background border border-border/80 text-foreground',
                  'hover:bg-primary hover:text-primary-foreground hover:border-primary',
                  'transition-all duration-200 chip-hover',
                  'shadow-sm hover:shadow-md'
                )}
                onClick={() => handleSuggestedQuestion(item.text)}
              >
                <span className="text-sm">{item.emoji}</span>
                {item.text}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Input Area - Modern rounded design */}
      <div className="p-4 border-t border-border/50 bg-background">
        <div 
          className={cn(
            'flex items-center gap-2 p-1.5 rounded-full',
            'bg-secondary/50 border-2 transition-all duration-200',
            isFocused 
              ? 'border-primary/50 shadow-[0_0_0_3px_hsl(213_54%_24%_/_0.1)]' 
              : 'border-transparent'
          )}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Nhập câu hỏi của bạn..."
            className={cn(
              'flex-1 px-4 py-2.5 bg-transparent text-sm',
              'placeholder:text-muted-foreground/60',
              'focus:outline-none'
            )}
            disabled={isTyping}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!inputValue.trim() || isTyping}
            size="icon"
            className={cn(
              'h-10 w-10 rounded-full transition-all duration-200',
              'bg-primary hover:bg-primary/90',
              inputValue.trim() && !isTyping 
                ? 'scale-100 opacity-100' 
                : 'scale-95 opacity-70'
            )}
          >
            <Send className="h-4 w-4 send-icon" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground/60 mt-2.5 text-center">
          Trợ lý TBU • Tra cứu lịch công tác
        </p>
      </div>
    </div>
  );
}
