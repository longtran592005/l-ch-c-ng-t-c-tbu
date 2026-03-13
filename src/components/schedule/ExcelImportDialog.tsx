/**
 * ExcelImportDialog — Dialog component for importing schedules from Excel files.
 *
 * Two-step flow:
 *   1. User selects an Excel file → calls POST /schedules/import?mode=preview
 *      to parse and display preview of the data.
 *   2. User reviews the data and confirms → calls POST /schedules/import?mode=import
 *      to actually save the records.
 */

import { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  Loader2,
  X,
  Eye,
  Save,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────

interface ParsedSchedule {
  date: string;
  dayOfWeek: string;
  startTime: string;
  endTime?: string;
  content: string;
  location: string;
  leader: string;
  participants: string[];
  preparingUnit: string;
  cooperatingUnits: string[];
  isSupplementary: boolean;
}

interface PreviewResponse {
  success: boolean;
  message: string;
  totalParsed: number;
  totalSkipped: number;
  schedules: ParsedSchedule[];
  errors: string[];
  warnings: string[];
}

interface ImportResponse {
  success: boolean;
  message: string;
  totalImported: number;
  totalFailed: number;
  totalSkipped: number;
  errors: string[];
  warnings: string[];
}

interface ExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess: () => void;
}

// ─── Component ───────────────────────────────────────────────────

export function ExcelImportDialog({ open, onOpenChange, onImportSuccess }: ExcelImportDialogProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const resetState = useCallback(() => {
    setStep('upload');
    setFile(null);
    setPreviewData(null);
    setImportResult(null);
    setIsLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [resetState, onOpenChange]);

  // ─── File selection ──────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const ext = selected.name.split('.').pop()?.toLowerCase();
      if (ext !== 'xlsx' && ext !== 'xls') {
        toast({
          title: 'Lỗi',
          description: 'Chỉ chấp nhận file Excel (.xlsx, .xls)',
          variant: 'destructive',
        });
        return;
      }
      setFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      const ext = dropped.name.split('.').pop()?.toLowerCase();
      if (ext !== 'xlsx' && ext !== 'xls') {
        toast({
          title: 'Lỗi',
          description: 'Chỉ chấp nhận file Excel (.xlsx, .xls)',
          variant: 'destructive',
        });
        return;
      }
      setFile(dropped);
    }
  };

  // ─── API calls ───────────────────────────────────────────────

  const callImportApi = async (mode: 'preview' | 'import'): Promise<any> => {
    if (!file) throw new Error('Chưa chọn file');

    const API_BASE_URL = getApiBaseUrl();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);
    formData.append('status', 'approved');

    const token = localStorage.getItem('tbu_auth_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/schedules/import`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || data.errors?.join(', ') || 'Lỗi khi xử lý file Excel');
    }
    return data;
  };

  // ─── Preview step ────────────────────────────────────────────

  const handlePreview = async () => {
    if (!file) return;

    setIsLoading(true);
    try {
      const data = await callImportApi('preview') as PreviewResponse;
      setPreviewData(data);
      setStep('preview');
    } catch (err: any) {
      toast({
        title: 'Lỗi phân tích file',
        description: err.message || 'Không thể đọc dữ liệu từ file Excel.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Import step ─────────────────────────────────────────────

  const handleImport = async () => {
    if (!file) return;

    setStep('importing');
    setIsLoading(true);
    try {
      const data = await callImportApi('import') as ImportResponse;
      setImportResult(data);
      setStep('done');

      if (data.totalImported > 0) {
        toast({
          title: 'Nhập thành công',
          description: data.message,
        });
        onImportSuccess();
      }
    } catch (err: any) {
      toast({
        title: 'Lỗi nhập dữ liệu',
        description: err.message || 'Không thể nhập dữ liệu từ file Excel.',
        variant: 'destructive',
      });
      setStep('preview'); // Go back to preview
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-xl text-primary">
            <FileSpreadsheet className="h-5 w-5" />
            Nhập lịch từ file Excel
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Chọn file Excel (.xlsx) theo mẫu lịch công tác để nhập dữ liệu.'}
            {step === 'preview' && 'Xem trước dữ liệu sẽ được nhập. Kiểm tra và xác nhận.'}
            {step === 'importing' && 'Đang nhập dữ liệu vào hệ thống...'}
            {step === 'done' && 'Hoàn tất nhập dữ liệu.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {/* ─── Step 1: Upload ─── */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Drop zone */}
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                  file ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
                )}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {file ? (
                  <div className="flex flex-col items-center gap-3">
                    <FileSpreadsheet className="h-12 w-12 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Chọn file khác
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">
                        Kéo thả file Excel vào đây hoặc nhấn để chọn
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Hỗ trợ file .xlsx, .xls (tối đa 20MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                <p className="font-medium">Hướng dẫn:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Sử dụng file Excel theo mẫu lịch công tác TBU (lichmau.xlsx)</li>
                  <li>File cần có các cột: Ngày, Thời gian, Nội dung, Thành phần, Địa điểm, Lãnh đạo, Đơn vị CB, Đơn vị PH</li>
                  <li>Hệ thống sẽ tự động nhận diện thời gian từ nội dung (VD: "Họp giao ban, từ 8h00")</li>
                  <li>Các dòng được bôi vàng sẽ được đánh dấu là lịch bổ sung</li>
                </ul>
              </div>
            </div>
          )}

          {/* ─── Step 2: Preview ─── */}
          {step === 'preview' && previewData && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center gap-4 flex-wrap">
                <Badge variant="secondary" className="text-sm gap-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {previewData.totalParsed} lịch được phân tích
                </Badge>
                {previewData.totalSkipped > 0 && (
                  <Badge variant="outline" className="text-sm gap-1 text-muted-foreground">
                    {previewData.totalSkipped} dòng bỏ qua (trống)
                  </Badge>
                )}
                {previewData.warnings.length > 0 && (
                  <Badge variant="outline" className="text-sm gap-1 text-yellow-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {previewData.warnings.length} cảnh báo
                  </Badge>
                )}
              </div>

              {/* Warnings */}
              {previewData.warnings.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">Cảnh báo:</p>
                  <ul className="list-disc list-inside text-yellow-700 dark:text-yellow-300 space-y-0.5">
                    {previewData.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Data table */}
              <div className="border rounded-lg overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-primary text-primary-foreground">
                      <th className="px-2 py-2 text-left font-medium border-r border-primary-foreground/20 w-8">#</th>
                      <th className="px-2 py-2 text-left font-medium border-r border-primary-foreground/20 w-24">Ngày</th>
                      <th className="px-2 py-2 text-left font-medium border-r border-primary-foreground/20 w-16">Giờ</th>
                      <th className="px-2 py-2 text-left font-medium border-r border-primary-foreground/20 min-w-[200px]">Nội dung</th>
                      <th className="px-2 py-2 text-left font-medium border-r border-primary-foreground/20 w-32">Thành phần</th>
                      <th className="px-2 py-2 text-left font-medium border-r border-primary-foreground/20 w-24">Địa điểm</th>
                      <th className="px-2 py-2 text-left font-medium border-r border-primary-foreground/20 w-24">Lãnh đạo</th>
                      <th className="px-2 py-2 text-left font-medium w-24">Đơn vị CB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.schedules.map((s, i) => (
                      <tr
                        key={i}
                        className={cn(
                          'border-b border-border hover:bg-muted/50',
                          s.isSupplementary && 'bg-yellow-50 dark:bg-yellow-900/10',
                        )}
                      >
                        <td className="px-2 py-1.5 border-r border-border text-muted-foreground">{i + 1}</td>
                        <td className="px-2 py-1.5 border-r border-border">
                          <div className="text-xs text-muted-foreground">{s.dayOfWeek}</div>
                          <div className="font-medium">{s.date}</div>
                        </td>
                        <td className="px-2 py-1.5 border-r border-border">
                          {s.startTime}
                          {s.endTime && <span className="text-muted-foreground"> - {s.endTime}</span>}
                        </td>
                        <td className="px-2 py-1.5 border-r border-border">
                          {s.content}
                          {s.isSupplementary && (
                            <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 text-yellow-600 border-yellow-300">
                              Bổ sung
                            </Badge>
                          )}
                        </td>
                        <td className="px-2 py-1.5 border-r border-border text-xs">
                          {s.participants.join(', ') || '-'}
                        </td>
                        <td className="px-2 py-1.5 border-r border-border text-xs">{s.location || '-'}</td>
                        <td className="px-2 py-1.5 border-r border-border text-xs">{s.leader || '-'}</td>
                        <td className="px-2 py-1.5 text-xs">{s.preparingUnit || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── Step 3: Importing ─── */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <p className="text-lg font-medium">Đang nhập dữ liệu...</p>
              <p className="text-sm text-muted-foreground">
                Vui lòng đợi, đang lưu {previewData?.totalParsed || 0} lịch vào hệ thống.
              </p>
            </div>
          )}

          {/* ─── Step 4: Done ─── */}
          {step === 'done' && importResult && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-8 gap-3">
                <CheckCircle className="h-16 w-16 text-green-500" />
                <p className="text-lg font-medium">{importResult.message}</p>
              </div>

              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Badge className="bg-green-100 text-green-700 text-sm gap-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {importResult.totalImported} nhập thành công
                </Badge>
                {importResult.totalFailed > 0 && (
                  <Badge variant="destructive" className="text-sm gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {importResult.totalFailed} thất bại
                  </Badge>
                )}
              </div>

              {importResult.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm">
                  <p className="font-medium text-red-800 dark:text-red-200 mb-1">Lỗi:</p>
                  <ul className="list-disc list-inside text-red-700 dark:text-red-300 space-y-0.5 max-h-[150px] overflow-y-auto">
                    {importResult.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Footer ─── */}
        <DialogFooter className="gap-2 sm:gap-0">
          {step === 'upload' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Hủy
              </Button>
              <Button
                onClick={handlePreview}
                disabled={!file || isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                Xem trước
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => { setStep('upload'); setPreviewData(null); }}>
                Quay lại
              </Button>
              <Button
                onClick={handleImport}
                disabled={!previewData || previewData.schedules.length === 0 || isLoading}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Nhập {previewData?.totalParsed || 0} lịch
              </Button>
            </>
          )}

          {step === 'done' && (
            <Button onClick={handleClose}>
              Đóng
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
