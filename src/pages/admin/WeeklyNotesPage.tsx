
import { useState, useMemo, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { format, startOfWeek, endOfWeek, addWeeks, startOfYear, eachWeekOfInterval, getWeek, getYear } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Plus, Edit, Trash2, Calendar as CalendarIcon, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
// import axios from 'axios'; // Removed to use fetch

// Define Types
interface WeeklyNote {
    id: string;
    weekNumber: number;
    year: number;
    startDate: string;
    endDate: string;
    content: string;
    noteType: string;
    createdAt: string;
    updatedAt: string;
}

interface WeekOption {
    weekNumber: number;
    startDate: Date;
    endDate: Date;
    label: string;
}

export default function WeeklyNotesPage() {
    const [notes, setNotes] = useState<WeeklyNote[]>([]);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingNote, setEditingNote] = useState<WeeklyNote | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        weekNumber: '',
        content: ''
    });

    const { toast } = useToast();
    const apiBase = import.meta.env.VITE_API_URL || 'https://localhost:3000/api';

    // Generate weeks for the selected year
    const weekOptions: WeekOption[] = useMemo(() => {
        const start = startOfYear(new Date(selectedYear, 0, 1));
        // Start of the first week (Monday)
        let currentWeekStart = startOfWeek(start, { weekStartsOn: 1 });

        // If the first Monday is in the previous year, we still consider it week 1 if the majority of days are in current year?
        // Let's rely on date-fns eachWeekOfInterval
        const weeks = eachWeekOfInterval({
            start: new Date(selectedYear, 0, 1),
            end: new Date(selectedYear, 11, 31)
        }, { weekStartsOn: 1 });

        return weeks.map((date, index) => {
            const endDate = endOfWeek(date, { weekStartsOn: 1 });
            return {
                weekNumber: index + 1,
                startDate: date,
                endDate: endDate,
                label: `Tuần ${index + 1} (${format(date, 'dd/MM')} - ${format(endDate, 'dd/MM')})`
            };
        });
    }, [selectedYear]);

    // Helper for fetch wrapper
    const fetchApi = async (url: string, options: RequestInit = {}) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        } as HeadersInit;

        const res = await fetch(url, { ...options, headers });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || 'Có lỗi xảy ra');
        }
        // Return void for 204 No Content, else json
        if (res.status === 204) return null;
        return res.json();
    };

    // Fetch Notes
    const fetchNotes = async () => {
        try {
            setLoading(true);
            const data = await fetchApi(`${apiBase}/weekly-notes?year=${selectedYear}`);
            setNotes(data);
        } catch (err) {
            console.error(err);
            toast({
                title: "Lỗi",
                description: "Không thể tải danh sách ghi chú",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotes();
    }, [selectedYear]);

    // Filter notes
    const filteredNotes = useMemo(() => {
        return notes.filter(note =>
            note.content.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [notes, searchTerm]);

    // Handle open dialog
    const handleOpenDialog = (note?: WeeklyNote) => {
        setValidationError(null); // Reset error when opening dialog
        if (note) {
            setEditingNote(note);
            setFormData({
                weekNumber: note.weekNumber.toString(),
                content: note.content
            });
        } else {
            setEditingNote(null);
            // Default to current week if available
            const currentWeekNumber = getWeek(new Date(), { weekStartsOn: 1 });
            setFormData({
                weekNumber: currentWeekNumber.toString(),
                content: ''
            });
        }
        setIsDialogOpen(true);
    };

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    // Handle Submit
    const handleSubmit = async () => {
        setValidationError(null); // Reset error

        if (!formData.weekNumber || !formData.content.trim()) {
            const msg = "Vui lòng nhập đầy đủ thông tin (chọn tuần và nhập nội dung).";
            setValidationError(msg);
            toast({ title: "Thiếu thông tin", description: msg, variant: "destructive" });
            return;
        }

        const weekOpt = weekOptions.find(w => w.weekNumber.toString() === formData.weekNumber);
        if (!weekOpt) {
            setValidationError("Dữ liệu tuần không hợp lệ.");
            toast({ title: "Lỗi", description: "Vui lòng chọn lại tuần.", variant: "destructive" });
            return;
        }

        // Check for duplicate week
        if (!editingNote) {
            console.log('Checking duplicate for week:', weekOpt.weekNumber, 'Current notes:', notes);
            const duplicate = notes.find(n => n.weekNumber === weekOpt.weekNumber);

            if (duplicate) {
                console.warn('Duplicate found:', duplicate);
                const msg = `Tuần ${weekOpt.weekNumber} đã có ghi chú. Không thể tạo trùng.`;
                setValidationError(msg);
                toast({
                    title: "Đã tồn tại",
                    description: msg,
                    variant: "destructive"
                });
                return;
            }
        }

        setIsSubmitting(true);
        try {
            if (editingNote) {
                await fetchApi(`${apiBase}/weekly-notes/${editingNote.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ content: formData.content }),
                });
                toast({ title: "Cập nhật thành công" });
            } else {
                await fetchApi(`${apiBase}/weekly-notes`, {
                    method: 'POST',
                    body: JSON.stringify({
                        weekNumber: weekOpt.weekNumber,
                        year: selectedYear,
                        startDate: weekOpt.startDate,
                        endDate: weekOpt.endDate,
                        content: formData.content
                    }),
                });
                toast({ title: "Thêm mới thành công" });
            }
            setIsDialogOpen(false);
            setValidationError(null);
            fetchNotes();
        } catch (err: any) {
            console.error('Submit error:', err);
            setValidationError(err.message || "Có lỗi xảy ra khi lưu.");
            toast({ title: "Lỗi lưu dữ liệu", description: err.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Delete
    const handleDelete = async () => {
        if (!deleteConfirmId) return;
        try {
            await fetchApi(`${apiBase}/weekly-notes/${deleteConfirmId}`, {
                method: 'DELETE',
            });
            toast({ title: "Đã xóa ghi chú" });
            fetchNotes();
        } catch (err: any) {
            toast({ title: "Lỗi xóa", description: err.message, variant: "destructive" });
        } finally {
            setDeleteConfirmId(null);
        }
    };

    return (
        <AdminLayout title="Ghi chú công tác tuần">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 flex gap-4">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm kiếm nội dung..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    {/* Year Filter */}
                    <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Năm" />
                        </SelectTrigger>
                        <SelectContent>
                            {[selectedYear - 1, selectedYear, selectedYear + 1].map(y => (
                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Button className="btn-primary gap-2" onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4" />
                    Thêm ghi chú
                </Button>
            </div>

            <div className="university-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-primary text-primary-foreground">
                                <th className="px-3 py-2.5 text-left font-semibold border border-primary-foreground/20 w-24">Tuần</th>
                                <th className="px-3 py-2.5 text-left font-semibold border border-primary-foreground/20 w-48">Thời gian</th>
                                <th className="px-3 py-2.5 text-left font-semibold border border-primary-foreground/20">Nội dung ghi chú</th>
                                <th className="px-3 py-2.5 text-center font-semibold border border-primary-foreground/20 w-24">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredNotes.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-8 text-muted-foreground">Chưa có ghi chú nào</td>
                                </tr>
                            ) : (
                                filteredNotes.map((note) => (
                                    <tr key={note.id} className="border-b border-border hover:bg-muted/10">
                                        <td className="px-3 py-2 border border-border align-top font-medium text-center">
                                            Tuần {note.weekNumber}
                                        </td>
                                        <td className="px-3 py-2 border border-border align-top text-sm">
                                            {format(new Date(note.startDate), 'dd/MM/yyyy')} - {format(new Date(note.endDate), 'dd/MM/yyyy')}
                                        </td>
                                        <td className="px-3 py-2 border border-border align-top whitespace-pre-wrap">
                                            {note.content}
                                        </td>
                                        <td className="px-3 py-2 border border-border align-top text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(note)}>
                                                    <Edit className="h-4 w-4 text-blue-600" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(note.id)}>
                                                    <Trash2 className="h-4 w-4 text-red-600" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Dialog Add/Edit */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{editingNote ? 'Sửa ghi chú' : 'Thêm ghi chú mới'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {validationError && (
                            <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm font-medium border border-destructive/20">
                                {validationError}
                            </div>
                        )}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-medium">Tuần</label>
                            <div className="col-span-3">
                                <Select
                                    value={formData.weekNumber}
                                    onValueChange={(v) => {
                                        setFormData({ ...formData, weekNumber: v });
                                        setValidationError(null);
                                    }}
                                    disabled={!!editingNote} // Disable week selection on edit to avoid conflicts (or handle update logic specifically)
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn tuần" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                        {weekOptions.map(opt => (
                                            <SelectItem key={opt.weekNumber} value={opt.weekNumber.toString()}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                            <label className="text-right text-sm font-medium mt-2">Nội dung</label>
                            <Textarea
                                className="col-span-3 min-h-[150px]"
                                placeholder="Nhập nội dung ghi chú..."
                                value={formData.content}
                                onChange={(e) => {
                                    setFormData({ ...formData, content: e.target.value });
                                    setValidationError(null);
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>Hủy</Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? 'Đang lưu...' : 'Lưu'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Alert Delete */}
            <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
                        <AlertDialogDescription>Bạn có chắc chắn muốn xóa ghi chú này không?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Xóa</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AdminLayout>
    );
}

