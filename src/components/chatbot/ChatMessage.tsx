/**
 * Component hiển thị tin nhắn trong chatbot
 * Hỗ trợ markdown đơn giản và emoji
 */

import { cn } from '@/lib/utils';
import { ChatMessage as ChatMessageType } from '@/utils/chatbot/chatbotLogic';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Bot, User } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
}

/**
 * Render markdown đơn giản (bold, italic, line breaks)
 */
function renderSimpleMarkdown(text: string): React.ReactNode {
  // Xử lý line breaks
  const lines = text.split('\n');
  
  return lines.map((line, index) => {
    // Xử lý bold (**text**)
    let processedLine: React.ReactNode = line;
    const boldRegex = /\*\*([^*]+)\*\*/g;
    const parts = line.split(boldRegex);
    
    if (parts.length > 1) {
      processedLine = parts.map((part, i) => {
        // Các phần lẻ là text bold
        if (i % 2 === 1) {
          return <strong key={i} className="font-semibold">{part}</strong>;
        }
        return part;
      });
    }
    
    return (
      <span key={index}>
        {processedLine}
        {index < lines.length - 1 && <br />}
      </span>
    );
  });
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isBot = message.role === 'bot';
  
  return (
    <div
      className={cn(
        'flex gap-3 p-3 rounded-lg',
        isBot 
          ? 'bg-secondary/50' 
          : 'bg-primary/5 ml-8'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isBot 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted text-muted-foreground'
        )}
      >
        {isBot ? (
          <Bot className="h-4 w-4" />
        ) : (
          <User className="h-4 w-4" />
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">
            {isBot ? 'Trợ lý TBU' : 'Bạn'}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.timestamp), 'HH:mm', { locale: vi })}
          </span>
        </div>
        
        <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {renderSimpleMarkdown(message.content)}
        </div>
      </div>
    </div>
  );
}
