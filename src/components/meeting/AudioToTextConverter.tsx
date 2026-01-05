import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, CheckCircle2, AlertCircle, Copy, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { convertAudioToText, getManualConversionInstructions } from '@/services/audioToText.service';
import { cn } from '@/lib/utils';

interface AudioToTextConverterProps {
  audioFile: File | null;
  onTextExtracted: (text: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

const AudioToTextConverter: React.FC<AudioToTextConverterProps> = ({
  audioFile,
  onTextExtracted,
  onClose,
  isOpen,
}) => {
  const [isConverting, setIsConverting] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showManualInstructions, setShowManualInstructions] = useState(false);
  const { toast } = useToast();

  const handleConvert = useCallback(async () => {
    if (!audioFile) {
      setError('Không có file audio để chuyển đổi.');
      return;
    }

    setIsConverting(true);
    setError(null);
    setExtractedText('');

    try {
      const result = await convertAudioToText({
        audioFile,
        language: 'vi', // Tiếng Việt
      });

      if (result.success && result.text) {
        setExtractedText(result.text);
        toast({
          title: 'Thành công',
          description: `Đã chuyển đổi audio sang text thành công.${result.processingTime ? ` Thời gian xử lý: ${result.processingTime}s` : ''}`,
          variant: 'default',
        });
      } else {
        setError(result.error || 'Không thể chuyển đổi audio sang text.');
        setShowManualInstructions(true);
      }
    } catch (err: any) {
      console.error('Conversion error:', err);
      setError(err.message || 'Có lỗi xảy ra khi chuyển đổi audio.');
      setShowManualInstructions(true);
    } finally {
      setIsConverting(false);
    }
  }, [audioFile, toast]);

  const handleCopyText = useCallback(() => {
    if (extractedText) {
      navigator.clipboard.writeText(extractedText);
      toast({
        title: 'Đã sao chép',
        description: 'Văn bản đã được sao chép vào clipboard.',
        variant: 'default',
      });
    }
  }, [extractedText, toast]);

  const handleUseText = useCallback(() => {
    if (extractedText.trim()) {
      onTextExtracted(extractedText);
      toast({
        title: 'Thành công',
        description: 'Văn bản đã được đưa vào phần chỉnh sửa.',
        variant: 'default',
      });
      // Reset state
      setExtractedText('');
      setError(null);
      onClose();
    }
  }, [extractedText, onTextExtracted, onClose, toast]);

  const handleClose = useCallback(() => {
    setExtractedText('');
    setError(null);
    setShowManualInstructions(false);
    onClose();
  }, [onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="!max-w-3xl w-[95vw] max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl">Chuyển đổi Audio sang Văn bản</DialogTitle>
          <DialogDescription className="text-sm mt-2">
            Upload file audio để chuyển đổi thành văn bản tự động. Văn bản sẽ được hiển thị để bạn chỉnh sửa trước khi đưa vào biên bản.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 px-1">
          {/* File info */}
          {audioFile && (
            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate mb-1">{audioFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Kích thước: {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  onClick={handleConvert}
                  disabled={isConverting}
                  size="default"
                  className="w-full sm:w-auto"
                >
                  {isConverting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Chuyển đổi
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-destructive mb-2">{error}</p>
                  {showManualInstructions && (
                    <div className="mt-3 p-3 bg-background/50 rounded-md text-xs text-muted-foreground whitespace-pre-line max-h-40 overflow-y-auto">
                      {getManualConversionInstructions()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Extracted text */}
          {extractedText && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="extracted-text" className="text-sm font-semibold">
                  Văn bản đã chuyển đổi:
                </Label>
                <Button
                  onClick={handleCopyText}
                  variant="outline"
                  size="sm"
                  className="h-8"
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Sao chép
                </Button>
              </div>
              <Textarea
                id="extracted-text"
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                placeholder="Văn bản sẽ hiển thị ở đây..."
                className="min-h-[250px] max-h-[400px] font-sans text-sm leading-relaxed resize-y"
              />
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Số từ: <strong className="text-foreground">{extractedText.split(/\s+/).filter(Boolean).length}</strong></span>
                <span>Số ký tự: <strong className="text-foreground">{extractedText.length}</strong></span>
              </div>
            </div>
          )}

          {/* Manual input option */}
          {!extractedText && !isConverting && (
            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground mb-3 font-medium">
                Hoặc bạn có thể dán văn bản đã chuyển đổi thủ công từ trang web:
              </p>
              <Textarea
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                placeholder="Dán văn bản đã copy từ https://daotao.abaii.vn/#/tockyat-fileat vào đây..."
                className="min-h-[200px] max-h-[300px] resize-y"
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <div className="flex w-full sm:w-auto sm:ml-auto gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1 sm:flex-initial">
              Hủy
            </Button>
            {extractedText && (
              <Button onClick={handleUseText} className="flex-1 sm:flex-initial">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Sử dụng văn bản này
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AudioToTextConverter;

