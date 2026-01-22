/**
 * ChatbotWindow Component - RAG Version
 * Sử dụng RAG Chatbot API thay vì rule-based logic
 * 
 * @author TBU AI Team
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Sparkles, RefreshCw, Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from './ChatMessage';
import { chatbotService, ChatMessage as ChatMessageType } from '@/services/chatbotService';
import { cn } from '@/lib/utils';

interface ChatbotWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

// Welcome message
const WELCOME_MESSAGE = chatbotService.createMessage(
  'Xin chào! 👋\n\nTôi là **Trợ lý ảo TBU** - hệ thống hỗ trợ tra cứu thông tin cho Trường Đại học Thái Bình.\n\nTôi có thể giúp bạn:\n\n📅 **Lịch công tác**\n• Xem lịch hôm nay / tuần này\n• Tra cứu theo ngày, lãnh đạo, buổi\n\n📰 **Tin tức & Thông báo**\n• Tin tức mới nhất\n• Thông báo quan trọng\n\n🏫 **Thông tin trường**\n• Giới thiệu, liên hệ, địa chỉ\n• Chương trình đào tạo\n• Tuyển sinh\n\nHãy đặt câu hỏi hoặc chọn câu gợi ý bên dưới!',
  'bot'
);

// Suggested questions
const SUGGESTED_QUESTIONS = [
  '📅 Lịch công tác hôm nay',
  '📅 Lịch tuần này',
  '📰 Tin tức mới nhất',
  '📢 Thông báo quan trọng',
  '🎓 Thông tin tuyển sinh',
] as const;

const CHAT_STORAGE_KEY = 'tbu_chatbot_messages';

// Load messages from sessionStorage (only persists within current tab session)
const loadMessagesFromStorage = (): ChatMessageType[] => {
  try {
    const stored = sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Restore Date objects
      return parsed.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    }
  } catch (error) {
    console.error('[Chatbot] Failed to load messages from storage:', error);
  }
  return [WELCOME_MESSAGE];
};

// Save messages to sessionStorage
const saveMessagesToStorage = (messages: ChatMessageType[]) => {
  try {
    sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  } catch (error) {
    console.error('[Chatbot] Failed to save messages to storage:', error);
  }
};

export function ChatbotWindow({ isOpen, onClose }: ChatbotWindowProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>(loadMessagesFromStorage);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionRef, setRecognitionRef] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Save messages to localStorage when they change
  useEffect(() => {
    saveMessagesToStorage(messages);
  }, [messages]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  /**
   * Send message to RAG chatbot
   */
  const handleSendMessage = useCallback(async (text?: string) => {
    const messageToSend = text || inputValue.trim();
    if (!messageToSend || isTyping) return;

    // Add user message
    const userMessage = chatbotService.createMessage(messageToSend, 'user');
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Show typing indicator
    setIsTyping(true);

    try {
      // Get chat history for context (exclude welcome message)
      const chatHistory = messages.filter(m => m.id !== WELCOME_MESSAGE.id);

      // Call RAG API
      const response = await chatbotService.sendMessage(messageToSend, chatHistory);

      // Add bot response
      const botMessage = chatbotService.createMessage(
        response.answer,
        'bot',
        response.sources
      );

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('[Chatbot] Error:', error);

      // Add error message
      const errorMessage = chatbotService.createMessage(
        'Xin lỗi, có lỗi xảy ra khi xử lý câu hỏi của bạn. Vui lòng thử lại sau.',
        'bot'
      );
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [inputValue, messages, isTyping]);

  /**
   * Start speech recognition
   */
  const startRecording = useCallback(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.lang = 'vi-VN';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1];
        const finalTranscript = transcript[0].transcript;
        if (finalTranscript) {
          setInputValue(finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('[Chatbot] Speech recognition error:', event.error);
        setIsRecording(false);
        setRecognitionRef(null);
      };

      recognition.onend = () => {
        setIsRecording(false);
        setRecognitionRef(null);
      };

      recognition.start();
      setIsRecording(true);
      setRecognitionRef(recognition);
    } else {
      alert('Trình duyệt của bạn không hỗ trợ tính năng giọng nói. Vui lòng sử dụng Chrome hoặc Edge.');
    }
  }, []);

  /**
   * Stop speech recognition
   */
  const stopRecording = useCallback(() => {
    if (recognitionRef) {
      recognitionRef.stop();
      setIsRecording(false);
      setRecognitionRef(null);
    }
  }, [recognitionRef]);

  /**
   * Handle key press (Enter to send)
   */
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  /**
   * Handle suggested question click
   */
  const handleSuggestedQuestion = useCallback((question: string) => {
    const cleanQuestion = question.replace(/^[^\w\s\u00C0-\u1EF9]+ /, '');
    handleSendMessage(cleanQuestion);
  }, [handleSendMessage]);

  /**
   * Clear chat and reset session
   */
  const handleClearChat = useCallback(() => {
    chatbotService.resetSession();
    setMessages([WELCOME_MESSAGE]);
    sessionStorage.removeItem(CHAT_STORAGE_KEY);
  }, []);

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
            <p className="text-xs text-blue-100 font-medium opacity-90">RAG-powered AI Assistant</p>
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
              <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                <span className="text-sm text-slate-500">Đang xử lý...</span>
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
                disabled={isTyping}
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-700 border border-transparent hover:border-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="pr-20 pl-4 py-6 rounded-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-blue-500 focus-visible:ring-offset-0 shadow-inner"
              disabled={isTyping || isRecording}
            />
            {isRecording && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                <span className="text-xs text-red-500 font-medium">Đang ghi âm...</span>
              </div>
            )}
          </div>
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            size="icon"
            disabled={isTyping}
            className={cn(
              "h-12 w-12 rounded-full shadow-lg transition-all duration-200",
              isRecording
                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-300"
            )}
            title={isRecording ? "Dừng ghi âm" : "Ghi âm giọng nói"}
          >
            {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isTyping}
            size="icon"
            className={cn(
              "h-12 w-12 rounded-full shadow-lg transition-all duration-200",
              inputValue.trim() && !isTyping
                ? "bg-blue-600 hover:bg-blue-700 hover:scale-105"
                : "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600"
            )}
          >
            {isTyping ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5 ml-0.5" />
            )}
          </Button>
        </div>
        <div className="text-center mt-2">
          <span className="text-[10px] text-slate-400 font-medium">
            Powered by RAG + Qwen2.5 • TBU AI
          </span>
        </div>
      </div>
    </div>
  );
}
