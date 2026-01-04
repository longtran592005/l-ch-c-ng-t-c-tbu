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
}

// const MenuBar: React.FC<{ editor: any }> = ({ editor }) => {
//   // MenuBar content is commented out as it's tied to Tiptap
//   return null;
// };

const MeetingContentEditor: React.FC<MeetingContentEditorProps> = ({
  value,
  onChange,
  placeholder,
  autoSave = false,
  onAutoSave,
  autoSaveInterval = 30000,
}) => {
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const initialValueRef = useRef(value);

  // Auto-save logic for textarea
  useEffect(() => {
    if (!autoSave || !onAutoSave) return;

    const interval = setInterval(async () => {
      // This is a simplified auto-save. It saves the current value.
      // In a real scenario, you'd want to compare against the last saved value.
      setIsSaving(true);
      await onAutoSave(value);
      setLastSaved(new Date());
      setIsSaving(false);
    }, autoSaveInterval);

    return () => clearInterval(interval);
  }, [value, autoSave, onAutoSave, autoSaveInterval]);


  return (
    <div className="flex flex-col border border-input rounded-md">
      <div className="p-2 border-b border-input bg-muted">
          <p className="text-sm text-muted-foreground">
              Rich text editor is temporarily disabled due to missing dependencies. Using plain text area.
          </p>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Enter meeting content...'}
        className="prose dark:prose-invert max-w-none focus:outline-none p-4 rounded-b-md border-t border-input min-h-[300px] overflow-auto w-full"
      />
      <div className="flex justify-between items-center text-xs text-muted-foreground p-2 border-t border-input rounded-b-md">
        <span>Word count: {value.split(/\s+/).filter(Boolean).length}</span>
        {autoSave && (
          <span className={cn(isSaving ? 'text-blue-500' : 'text-green-500')}>
            {isSaving ? 'Đang lưu...' : (lastSaved ? `Đã lưu: ${lastSaved.toLocaleTimeString()}` : '')}
          </span>
        )}
      </div>
    </div>
  );
};

export default MeetingContentEditor;