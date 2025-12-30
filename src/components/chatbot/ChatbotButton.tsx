/**
 * Nút chatbot nổi góc phải dưới màn hình
 * Click để mở/đóng cửa sổ chatbot
 */

import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatbotWindow } from './ChatbotWindow';
import { cn } from '@/lib/utils';

export function ChatbotButton() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      {/* Chatbot Window */}
      <ChatbotWindow 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
      
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-4 right-4 z-50',
          'w-14 h-14 rounded-full shadow-lg',
          'bg-primary hover:bg-primary/90',
          'transition-all duration-300',
          'flex items-center justify-center',
          isOpen && 'rotate-90'
        )}
        size="icon"
        title={isOpen ? 'Đóng chatbot' : 'Mở chatbot tra cứu lịch'}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </Button>
      
      {/* Tooltip khi chưa mở */}
      {!isOpen && (
        <div className="fixed bottom-20 right-4 z-40 animate-bounce">
          <div className="bg-background border border-border rounded-lg px-3 py-2 shadow-md text-sm">
            💬 Tra cứu lịch công tác
          </div>
        </div>
      )}
    </>
  );
}
