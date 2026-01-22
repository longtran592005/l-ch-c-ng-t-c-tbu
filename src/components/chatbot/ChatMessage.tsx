import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Sparkles, FileText, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

// Extended message type to support RAG sources
interface RAGSource {
  source_type?: string;
  source_id?: string;
  content: string;
  metadata?: Record<string, any>;
  score?: number;
}

interface ChatMessageType {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date | string;
  sources?: RAGSource[];
}

interface ChatMessageProps {
  message: ChatMessageType;
  isLast?: boolean;
}

function renderSimpleMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  return lines.map((line, index) => {
    // Bold: **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g);

    return (
      <div key={index} className={cn("min-h-[1.2em]", index > 0 && "mt-1")}>
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
          }
          // Bullet points
          if (part.trim().startsWith('•') || part.trim().startsWith('-')) {
            return <span key={i} className="pl-2 block">{part}</span>
          }
          return part;
        })}
      </div>
    );
  });
}

// Component to display RAG sources
function SourcesSection({ sources }: { sources: RAGSource[] }) {
  const [expanded, setExpanded] = useState(false);
  
  if (!sources || sources.length === 0) return null;
  
  const getSourceIcon = (sourceType?: string) => {
    switch (sourceType) {
      case 'schedule':
        return <Calendar className="h-3 w-3" />;
      case 'document':
      default:
        return <FileText className="h-3 w-3" />;
    }
  };
  
  const getSourceLabel = (sourceType?: string) => {
    switch (sourceType) {
      case 'schedule':
        return 'Lịch công tác';
      case 'document':
        return 'Tài liệu';
      case 'news':
        return 'Tin tức';
      case 'announcement':
        return 'Thông báo';
      default:
        return sourceType || 'Nguồn';
    }
  };
  
  return (
    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
      >
        <FileText className="h-3 w-3" />
        <span>Nguồn tham khảo ({sources.length})</span>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      
      {expanded && (
        <div className="mt-2 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          {sources.map((source, idx) => (
            <div 
              key={idx}
              className="text-[10px] bg-slate-50 dark:bg-slate-700/50 rounded-md p-2 border border-slate-100 dark:border-slate-600"
            >
              <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium mb-1">
                {getSourceIcon(source.source_type)}
                <span>{getSourceLabel(source.source_type)}</span>
                {source.score && (
                  <span className="ml-auto text-slate-400 dark:text-slate-500">
                    {Math.round(source.score * 100)}%
                  </span>
                )}
              </div>
              <p className="text-slate-500 dark:text-slate-400 line-clamp-2">
                {source.content.substring(0, 150)}...
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isBot = message.role === 'bot';

  return (
    <div
      className={cn(
        'flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300',
        isBot ? 'justify-start' : 'justify-end'
      )}
    >
      <div className={cn("flex max-w-[85%] gap-2", isBot ? "flex-row" : "flex-row-reverse")}>
        {/* Avatar for Bot only */}
        {isBot && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm mt-1">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
        )}

        <div className={cn(
          "flex flex-col",
          isBot ? "items-start" : "items-end"
        )}>
          {/* Name & Time */}
          {/* <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-[10px] text-muted-foreground opacity-70">
                    {isBot ? 'Trợ lý TBU' : 'Bạn'} • {format(new Date(message.timestamp), 'HH:mm', { locale: vi })}
                </span>
            </div> */}

          {/* Bubble */}
          <div
            className={cn(
              'px-4 py-3 text-sm shadow-sm relative group',
              isBot
                ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-700'
                : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-none'
            )}
          >
            <div className="leading-relaxed">
              {renderSimpleMarkdown(message.content)}
            </div>
            
            {/* RAG Sources (only for bot messages) */}
            {isBot && message.sources && message.sources.length > 0 && (
              <SourcesSection sources={message.sources} />
            )}

            {/* Time tooltip on hover? Or just small text inside? Let's hide it for cleanliness or put it outside. */}
            <div className={cn("text-[9px] mt-1 opacity-60 font-medium", isBot ? "text-slate-400" : "text-blue-100 text-right")}>
              {format(new Date(message.timestamp), 'HH:mm', { locale: vi })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
