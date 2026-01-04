import React, { useState, useCallback } from 'react';
import { Button } from '../../components/ui/button';
import { MeetingRecord } from '@/types';
import { generateMinutesTemplate } from '@/utils/meetingMinutesTemplate';
import MeetingContentEditor from './MeetingContentEditor'; // Using the editor for read-only preview
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react'; // For loading icon
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'; // Assuming RadioGroup component path
import { Label } from '@/components/ui/label'; // Assuming Label component path
import { useToast } from '@/hooks/use-toast';

interface MeetingMinutesGeneratorProps {
  record: MeetingRecord;
  onGenerate: (minutes: string) => void;
  onGenerateAI: (prompt: string) => Promise<string>; // New prop for AI generation
}

const MeetingMinutesGenerator: React.FC<MeetingMinutesGeneratorProps> = ({ record, onGenerate, onGenerateAI }) => {
  const [generatedMinutes, setGeneratedMinutes] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationMethod, setGenerationMethod] = useState<'template' | 'ai'>('template');
  const { toast } = useToast();

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      let minutes: string;
      if (generationMethod === 'template') {
        const meetingInfo = {
          title: record.title,
          date: record.meetingDate,
          location: record.location,
          leader: record.leader,
          participants: record.participants,
        };
        minutes = generateMinutesTemplate(record.content || '', meetingInfo);
      } else { // generationMethod === 'ai'
        // Construct a prompt for the AI based on meeting record details
        const aiPrompt = `Tạo biên bản cuộc họp dựa trên nội dung cuộc họp sau. Vui lòng giữ nguyên cấu trúc quan trọng, các điểm chính và quyết định.
        
        Thông tin cuộc họp:
        - Tiêu đề: ${record.title}
        - Ngày: ${record.meetingDate.toLocaleString()}
        - Địa điểm: ${record.location || 'N/A'}
        - Người chủ trì: ${record.leader || 'N/A'}
        - Thành phần tham dự: ${record.participants?.join(', ') || 'N/A'}
        
        Nội dung chi tiết cuộc họp:
        ${record.content || ''}
        
        Biên bản nên được trình bày rõ ràng, dễ đọc, nhấn mạnh các quyết định và hành động cần thực hiện.`;
        
        minutes = await onGenerateAI(aiPrompt);
      }
      setGeneratedMinutes(minutes);
      onGenerate(minutes); // Call onGenerate to potentially update parent state immediately
    } catch (error) {
      console.error("Error generating minutes:", error);
      toast({
        title: "Lỗi tạo biên bản",
        description: `Không thể tạo biên bản: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [record, onGenerate, onGenerateAI, generationMethod, toast]);

  const handleSave = useCallback(() => {
    if (generatedMinutes) {
      onGenerate(generatedMinutes); // Trigger parent's save logic
    }
  }, [generatedMinutes, onGenerate]);

  const handleRegenerate = useCallback(() => {
    // Regenerate uses the currently selected method
    handleGenerate();
  }, [handleGenerate]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <RadioGroup
          defaultValue={generationMethod}
          onValueChange={(value: 'template' | 'ai') => setGenerationMethod(value)}
          className="flex space-x-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="template" id="template-gen" />
            <Label htmlFor="template-gen">Mẫu có sẵn</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="ai" id="ai-gen" />
            <Label htmlFor="ai-gen">AI tạo</Label>
          </div>
        </RadioGroup>
      </div>
      <div className="flex justify-end gap-2">
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            'Tạo biên bản'
          )}
        </Button>
        {generatedMinutes && (
          <>
            <Button onClick={handleRegenerate} variant="outline" disabled={isGenerating}>
              Tạo lại
            </Button>
            <Button onClick={handleSave} variant="secondary">
              Lưu
            </Button>
          </>
        )}
      </div>

      {generatedMinutes && (
        <div className="border border-input rounded-md overflow-hidden">
          <div className="p-2 border-b border-input bg-muted text-muted-foreground text-sm font-medium">
            Xem trước biên bản
          </div>
          <div className="p-4 prose dark:prose-invert max-w-none min-h-[300px]">
            {/* Directly render generated minutes as preformatted text */}
            <pre className="whitespace-pre-wrap font-sans text-base">{generatedMinutes}</pre>
          </div>
        </div>
      )}

      {/* Placeholder for template selector if multiple templates are introduced */}
      {/* <div className="mt-4">
        <label htmlFor="template-selector" className="block text-sm font-medium text-gray-700">Chọn mẫu biên bản:</label>
        <select
          id="template-selector"
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
        >
          <option value="default">Mẫu mặc định</option>
        </select>
      </div> */}
    </div>
  );
};

export default MeetingMinutesGenerator;