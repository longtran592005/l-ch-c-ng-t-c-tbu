import { useState, Suspense, lazy } from 'react';
import { MessageCircle, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useScheduleHighlight } from '@/contexts';

// Use the new RAG-based chatbot window
const ChatbotWindow = lazy(() => import('./ChatbotWindowRAG').then(module => ({ default: module.ChatbotWindow })));

// Keep the old rule-based version as fallback (can switch if needed)
// const ChatbotWindow = lazy(() => import('./ChatbotWindow').then(module => ({ default: module.ChatbotWindow })));

export function ChatbotButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { clearHighlights } = useScheduleHighlight();

  const handleToggle = () => {
    if (!isOpen) {
      // Clear highlights when opening the chatbot
      clearHighlights();
    }
    setIsOpen(!isOpen);
  };

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

      {/* Floating Button Container - Responsive positioning */}
      <div 
        className="fixed z-50 flex flex-col items-end gap-2"
        style={{
          bottom: 'max(1.5rem, env(safe-area-inset-bottom))',
          right: '1rem',
        }}
      >
        {/* Main Button - Touch-friendly size */}
        <div className="relative group">
          {/* Ping animation ring */}
          {!isOpen && (
            <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping duration-1000 group-hover:duration-500"></span>
          )}

          <Button
            onClick={handleToggle}
            className={cn(
              'relative h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-2xl transition-all duration-300',
              'bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500',
              'border border-white/20',
              'touch-manipulation', // Better touch handling
              isOpen ? 'rotate-90 scale-90' : 'scale-100 hover:scale-110 active:scale-95'
            )}
            size="icon"
            title={isOpen ? 'Đóng chatbot' : 'Mở chatbot'}
          >
            {isOpen ? (
              <X className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            ) : (
              <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
