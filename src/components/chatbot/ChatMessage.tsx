/**
 * Component hiển thị tin nhắn trong chatbot
 * Thiết kế Modern Academic UI với animations
 */

import { cn } from '@/lib/utils';
import { ChatMessage as ChatMessageType } from '@/utils/chatbot/chatbotLogic';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Sparkles, User } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
}

/**
 * Render markdown đơn giản (bold, italic, line breaks, bullet points)
 */
function renderSimpleMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  
  return lines.map((line, index) => {
    // Xử lý bullet points
    let processedLine: React.ReactNode;
    const isBullet = line.trim().startsWith('•');
    
    // Xử lý bold (**text**)
    const boldRegex = /\*\*([^*]+)\*\*/g;
    const parts = line.split(boldRegex);
    
    if (parts.length > 1) {
      processedLine = parts.map((part, i) => {
        // Các phần lẻ là text bold
        if (i % 2 === 1) {
          return <strong key={i} className="font-semibold text-foreground">{part}</strong>;
        }
        return part;
      });
    } else {
      processedLine = line;
    }
    
    // Wrap bullet points với styling đặc biệt
    if (isBullet) {
      return (
        <span key={index} className="flex items-start gap-2 ml-1">
          <span className="text-primary mt-0.5">•</span>
          <span>{String(processedLine).replace('• ', '')}</span>
          {index < lines.length - 1 && <br />}
        </span>
      );
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
        'flex gap-3',
        !isBot && 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center shadow-sm',
          isBot 
            ? 'bg-gradient-to-br from-primary to-primary/80' 
            : 'bg-gradient-to-br from-secondary to-muted'
        )}
      >
        {isBot ? (
          <Sparkles className="h-4 w-4 text-white" />
        ) : (
          <User className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      
      {/* Content */}
      <div 
        className={cn(
          'flex flex-col max-w-[80%]',
          !isBot && 'items-end'
        )}
      >
        {/* Message Bubble */}
        <div
          className={cn(
            'px-4 py-3 shadow-sm',
            isBot 
              ? 'bg-card border border-border/50 rounded-2xl rounded-tl-md text-foreground' 
              : 'bg-primary text-primary-foreground rounded-2xl rounded-tr-md'
          )}
        >
          <div 
            className={cn(
              'text-sm leading-relaxed',
              isBot && 'prose prose-sm max-w-none'
            )}
          >
            {renderSimpleMarkdown(message.content)}
          </div>
        </div>
        
        {/* Timestamp */}
        <span 
          className={cn(
            'text-[10px] text-muted-foreground/50 mt-1.5 px-1',
            !isBot && 'text-right'
          )}
        >
          {format(new Date(message.timestamp), 'HH:mm', { locale: vi })}
        </span>
      </div>
    </div>
  );
}
