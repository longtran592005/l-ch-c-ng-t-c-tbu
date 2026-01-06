import { cn } from '@/lib/utils';
import { ChatMessage as ChatMessageType } from '@/utils/chatbot/chatbotLogic';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Sparkles } from 'lucide-react';

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
