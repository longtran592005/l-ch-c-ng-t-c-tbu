import React, { useState, useEffect, useRef } from 'react';
// import { useEditor, EditorContent, Editor } from '@tiptap/react';
// import StarterKit from '@tiptap/starter-kit';
// import Placeholder from '@tiptap/extension-placeholder';
// import Link from '@tiptap/extension-link';
// import Image from '@tiptap/extension-image';
// import Table from '@tiptap/extension-table';
// import TableRow from '@tiptap/extension-table-row';
// import TableHeader from '@tiptap/extension-table-header';
// import TableCell from '@tiptap/extension-table-cell';
import { cn } from '@/lib/utils';
// import {
//   Bold, Italic, Strikethrough, Code, List, ListOrdered, Heading1, Heading2, Heading3,
//   Quote, Separator, Undo, Redo, Link as LinkIcon, Image as ImageIcon, Table as TableIcon,
//   Eraser
// } from 'lucide-react';
// import { Button } from '@/components/ui/button';

interface MeetingContentEditorProps {
  value: string; // HTML content
  onChange: (content: string) => void;
  placeholder?: string;
  autoSave?: boolean;
  onAutoSave?: (content: string) => void;
  autoSaveInterval?: number; // milliseconds, default 30000
  className?: string;
}

// ... MenuBar commented out ...

const MeetingContentEditor: React.FC<MeetingContentEditorProps> = ({
  value,
  onChange,
  placeholder,
  autoSave = false,
  onAutoSave,
  autoSaveInterval = 30000,
  className,
}) => {
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const initialValueRef = useRef(value);

  // Auto-save logic
  useEffect(() => {
    if (!autoSave || !onAutoSave) return;

    const interval = setInterval(async () => {
      setIsSaving(true);
      await onAutoSave(value);
      setLastSaved(new Date());
      setIsSaving(false);
    }, autoSaveInterval);

    return () => clearInterval(interval);
  }, [value, autoSave, onAutoSave, autoSaveInterval]);


  return (
    <div className={cn("flex flex-col border border-input rounded-md", className)}>
      <div className="p-2 border-b border-input bg-muted">
        <p className="text-sm text-muted-foreground">
          Chế độ văn bản (Editor đơn giản)
        </p>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Nhập nội dung cuộc họp...'}
        className="prose dark:prose-invert max-w-none focus:outline-none p-4 w-full h-full min-h-[300px] resize-none bg-transparent"
      />
      <div className="flex justify-between items-center text-xs text-muted-foreground p-2 border-t border-input rounded-b-md bg-muted/20">
        <span>Từ: {value.split(/\s+/).filter(Boolean).length}</span>
        {autoSave && (
          <span className={cn(isSaving ? 'text-blue-500' : 'text-green-500')}>
            {isSaving ? 'Đang lưu...' : (lastSaved ? `Đã lưu: ${lastSaved.toLocaleTimeString()}` : 'Chưa lưu')}
          </span>
        )}
      </div>
    </div>
  );
};

export default MeetingContentEditor;