import { useState, Suspense, lazy } from 'react';
import { MessageCircle, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ChatbotWindow = lazy(() => import('./ChatbotWindow').then(module => ({ default: module.ChatbotWindow })));

export function ChatbotButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Chatbot Window */}
      {isOpen && (
        <Suspense fallback={null}>
          <ChatbotWindow
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
          />
        </Suspense>
      )}

      {/* Floating Button Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {/* Tooltip hint when closed */}
        {!isOpen && (
          <div className="animate-in slide-in-from-right-5 fade-in duration-500 mb-2">
            <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white px-4 py-2 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 relative after:content-[''] after:absolute after:bottom-[-6px] after:right-6 after:w-3 after:h-3 after:bg-white dark:after:bg-slate-800 after:rotate-45 after:border-b after:border-r after:border-slate-100 dark:after:border-slate-700">
              <p className="font-medium text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                Trợ lý ảo TBU hỗ trợ 24/7
              </p>
            </div>
          </div>
        )}

        {/* Main Button */}
        <div className="relative group">
          {/* Ping animation ring */}
          {!isOpen && (
            <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping duration-1000 group-hover:duration-500"></span>
          )}

          <Button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'relative h-14 w-14 rounded-full shadow-2xl transition-all duration-300',
              'bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500',
              'border border-white/20',
              isOpen ? 'rotate-90 scale-90' : 'scale-100 hover:scale-110'
            )}
            size="icon"
            title={isOpen ? 'Đóng chatbot' : 'Mở chatbot'}
          >
            {isOpen ? (
              <X className="h-6 w-6 text-white" />
            ) : (
              <MessageCircle className="h-7 w-7 text-white" />
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
