import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Sparkles, FileText, Calendar, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useScheduleHighlight } from '@/contexts';

// Extended message type to support RAG sources and schedule links
interface RAGSource {
  source_type?: string;
  source_id?: string;
  content: string;
  metadata?: Record<string, any>;
  score?: number;
}

// Schedule link info từ chatbot response
export interface ScheduleLink {
  scheduleId: string;
  scheduleDate: string; // YYYY-MM-DD format
  displayText: string; // Text hiển thị (ví dụ: "Ngày 05/02/2026")
}

interface ChatMessageType {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date | string;
  sources?: RAGSource[];
  scheduleLinks?: ScheduleLink[]; // Danh sách các lịch có thể navigate
}

interface ChatMessageProps {
  message: ChatMessageType;
  isLast?: boolean;
  onCloseChatbot?: () => void;
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

// Component hiển thị nút xem lịch
function ScheduleLinksSection({
  scheduleLinks,
  onCloseChatbot
}: {
  scheduleLinks: ScheduleLink[];
  onCloseChatbot?: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { addHighlight, clearHighlights, setTargetPage } = useScheduleHighlight();

  if (!scheduleLinks || scheduleLinks.length === 0) return null;

  const isAdminPage = location.pathname.startsWith('/quan-tri');

  // Các trang có hiển thị lịch công tác đầy đủ (có thể highlight in-place)
  const SCHEDULE_PAGES = ['/lich-cong-tac', '/quan-tri/lich', '/quan-tri/quan-ly-lich'];
  const isOnSchedulePage = SCHEDULE_PAGES.some(p => location.pathname === p);

  const handleViewSchedule = (link: ScheduleLink) => {
    // Clear previous highlights và thêm highlight mới
    clearHighlights();
    addHighlight(link.scheduleId, link.scheduleDate);
    setTargetPage(isAdminPage ? 'admin' : 'public');

    const queryStr = `highlight=${link.scheduleId}&date=${link.scheduleDate}`;

    if (isOnSchedulePage) {
      // Đang ở trang lịch → chỉ cần update URL params tại chỗ, không navigate đi nơi khác
      navigate(`${location.pathname}?${queryStr}`, { replace: true });
    } else {
      // Không ở trang lịch → navigate đến trang lịch phù hợp
      const targetPath = isAdminPage ? '/quan-tri/quan-ly-lich' : '/lich-cong-tac';
      navigate(`${targetPath}?${queryStr}`);
    }

    // Đóng chatbot SAU khi navigate đã được enqueue
    if (onCloseChatbot) {
      onCloseChatbot();
    }
  };

  return (
    <div className="mt-3 space-y-2">
      {scheduleLinks.map((link, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
              {link.displayText}
            </span>
          </div>
          <Button
            size="sm"
            variant="default"
            className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1"
            data-schedule-link={link.scheduleId}
            onClick={() => handleViewSchedule(link)}
          >
            <ExternalLink className="h-3 w-3" />
            Xem lịch
          </Button>
        </div>
      ))}
    </div>
  );
}

export function ChatMessage({ message, onCloseChatbot }: ChatMessageProps) {
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

            {/* Schedule Links - Nút xem lịch */}
            {isBot && message.scheduleLinks && message.scheduleLinks.length > 0 && (
              <ScheduleLinksSection
                scheduleLinks={message.scheduleLinks}
                onCloseChatbot={onCloseChatbot}
              />
            )}

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
