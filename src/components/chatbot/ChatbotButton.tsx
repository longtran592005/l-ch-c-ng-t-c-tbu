/**
 * Nút chatbot nổi góc phải dưới màn hình
 * Modern Academic UI với pulse animation
 */

import { useState, useEffect } from 'react';
import { MessageCircle, X, Sparkles } from 'lucide-react';
import { ChatbotWindow } from './ChatbotWindow';
import { cn } from '@/lib/utils';

export function ChatbotButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Hiển thị tooltip sau 2 giây
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => setShowTooltip(true), 2000);
      return () => clearTimeout(timer);
    } else {
      setShowTooltip(false);
    }
  }, [isOpen]);
  
  // Ẩn tooltip sau 5 giây
  useEffect(() => {
    if (showTooltip) {
      const timer = setTimeout(() => setShowTooltip(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showTooltip]);
  
  return (
    <>
      {/* Chatbot Window */}
      <ChatbotWindow 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
      
      {/* Tooltip khi chưa mở - Modern design */}
      {showTooltip && !isOpen && (
        <div 
          className={cn(
            'fixed bottom-24 right-4 z-40',
            'animate-in slide-in-from-right-5 fade-in duration-300'
          )}
        >
          <div 
            className={cn(
              'relative bg-card border border-border/50 rounded-2xl px-4 py-3',
              'shadow-lg max-w-[220px]'
            )}
          >
            {/* Arrow */}
            <div 
              className="absolute -bottom-2 right-6 w-4 h-4 bg-card border-b border-r border-border/50 rotate-45"
            />
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Cần hỗ trợ?
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tra cứu lịch công tác nhanh chóng
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Floating Button - Modern with glow */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'w-14 h-14 rounded-full',
          'flex items-center justify-center',
          'transition-all duration-300 ease-out',
          'shadow-lg hover:shadow-xl',
          // Gradient background
          'bg-gradient-to-br from-primary to-primary/80',
          // Hover & active states
          'hover:scale-105 active:scale-95',
          // Pulse animation when closed
          !isOpen && 'chatbot-pulse'
        )}
        title={isOpen ? 'Đóng chatbot' : 'Mở chatbot tra cứu lịch'}
      >
        {/* Icon with transition */}
        <div className="relative w-6 h-6">
          <MessageCircle 
            className={cn(
              'absolute inset-0 h-6 w-6 text-white transition-all duration-300',
              isOpen ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
            )} 
          />
          <X 
            className={cn(
              'absolute inset-0 h-6 w-6 text-white transition-all duration-300',
              isOpen ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
            )} 
          />
        </div>
        
        {/* Ripple effect on hover */}
        <span 
          className={cn(
            'absolute inset-0 rounded-full',
            'bg-white/20 scale-0 transition-transform duration-500',
            'group-hover:scale-100'
          )}
        />
      </button>
      
      {/* Status indicator */}
      {!isOpen && (
        <div 
          className={cn(
            'fixed bottom-6 right-6 z-50 pointer-events-none',
            'w-14 h-14 flex items-end justify-end'
          )}
        >
          <div 
            className={cn(
              'w-4 h-4 rounded-full bg-green-500 border-2 border-white',
              'shadow-md animate-pulse',
              'translate-x-0.5 translate-y-0.5'
            )}
          />
        </div>
      )}
    </>
  );
}
