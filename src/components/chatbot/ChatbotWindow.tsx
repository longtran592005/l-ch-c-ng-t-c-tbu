import { useState, useRef, useEffect } from 'react';
import { X, Send, Trash2, MessageCircle, Sparkles, User, Bot, RefreshCw } from 'lucide-react';
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
  'Xin chào! 👋\n\nTôi là Trợ lý ảo AI của trường Đại học Thái Bình (TBU).\n\nTôi có thể giúp bạn tra cứu nhanh lịch công tác, tìm kiếm thông tin lãnh đạo và hỗ trợ giải đáp thắc mắc.\n\nHãy thử hỏi tôi điều gì đó nhé!',
  'bot'
);

// Các câu hỏi gợi ý - Updated icons/style later
const SUGGESTED_QUESTIONS = [
  '📅 Lịch công tác hôm nay',
  '📅 Lịch tuần này',
  'Chiều nay có lịch gì?',
  'Ban giám hiệu hôm nay họp ở đâu?',
];

export function ChatbotWindow({ isOpen, onClose }: ChatbotWindowProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { schedules } = useSchedules();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput) return;

    const userMessage = createMessage(trimmedInput, 'user');
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    setIsTyping(true);

    await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400));

    const botResponse = processMessage(trimmedInput, schedules);
    const botMessage = createMessage(botResponse, 'bot');

    setMessages(prev => [...prev, botMessage]);
    setIsTyping(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    // Remove emojis for processing if needed, usually regex handles it loosely
    const cleanQuestion = question.replace(/^[^\w\s\u00C0-\u1EF9]+ /, '');
    setInputValue(cleanQuestion);

    // Auto send for better UX
    setTimeout(() => {
      // Need to duplicate logic or call function if moving out of 'render' scope? 
      // Calling the handler directly via a small timeout to let state update if we were setting it purely via state effect
      // But here we invoke directly.
      // Let's manually trigger the sequence to be safe with state closure if not careful, 
      // but here it's fine as we don't depend on 'inputValue' state if we pass explicit string,
      // HOWEVER handleSendMessage uses 'inputValue' state.
      // So we must setInputValue, wait interactively or refactor handleSendMessage.
      // Easier: simply call logic with specific text.

      // For now, let's just pre-fill. Users often want to edit.
      // If "Auto send" is desired:
      // handleSendMessageParams(cleanQuestion);
    }, 100);
  };

  const handleClearChat = () => {
    setMessages([WELCOME_MESSAGE]);
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed bottom-24 right-6 z-50',
        'w-[400px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[80vh]',
        'flex flex-col',
        'rounded-2xl shadow-2xl overflow-hidden',
        'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md',
        'border border-white/20 dark:border-slate-700',
        'animate-in slide-in-from-bottom-10 fade-in duration-300 transform-gpu'
      )}
    >
      {/* Header */}
      <div className="relative px-6 py-4 flex items-center justify-between z-10 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-inner">
              <Sparkles className="w-5 h-5 text-yellow-300" />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-indigo-600 rounded-full"></span>
          </div>
          <div>
            <h3 className="font-bold text-base leading-tight">Trợ lý ảo TBU</h3>
            <p className="text-xs text-blue-100 font-medium opacity-90">Luôn sẵn sàng hỗ trợ</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            onClick={handleClearChat}
            title="Làm mới đoạn chat"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 bg-slate-50/50 dark:bg-slate-900/50 p-4">
        <div className="space-y-6 pb-4">
          <div className="text-center text-xs text-muted-foreground my-4 flex items-center justify-center gap-2 opacity-70">
            <span className="w-12 h-[1px] bg-border"></span>
            <span>Hôm nay, {new Date().toLocaleDateString('vi-VN')}</span>
            <span className="w-12 h-[1px] bg-border"></span>
          </div>

          {messages.map((message, index) => (
            <ChatMessage key={message.id || index} message={message} />
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Footer / Input */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
        {/* Chips */}
        {messages.length <= 2 && (
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none mb-1">
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSuggestedQuestion(q)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 border border-transparent hover:border-blue-200 transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Nhập câu hỏi của bạn..."
              className="pr-4 pl-4 py-6 rounded-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-blue-500 focus-visible:ring-offset-0 shadow-inner"
              disabled={isTyping}
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            size="icon"
            className={cn(
              "h-12 w-12 rounded-full shadow-lg transition-all duration-200",
              inputValue.trim()
                ? "bg-blue-600 hover:bg-blue-700 hover:scale-105"
                : "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600"
            )}
          >
            <Send className="h-5 w-5 ml-0.5" />
          </Button>
        </div>
        <div className="text-center mt-2">
          <span className="text-[10px] text-slate-400 font-medium">
            Powered by TBU AI • v1.0
          </span>
        </div>
      </div>
    </div>
  );
}
