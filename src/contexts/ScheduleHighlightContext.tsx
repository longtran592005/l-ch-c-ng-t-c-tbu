/**
 * Schedule Highlight Context
 * Quản lý trạng thái highlight của schedule khi navigate từ chatbot
 */
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

interface ScheduleHighlight {
    scheduleId: string;
    scheduleDate: string; // YYYY-MM-DD format
}

interface ScheduleHighlightContextType {
    /** Danh sách các schedule đang được highlight */
    highlightedSchedules: ScheduleHighlight[];
    /** Thêm schedule vào danh sách highlight */
    addHighlight: (scheduleId: string, scheduleDate: string) => void;
    /** Xóa tất cả highlights */
    clearHighlights: () => void;
    /** Kiểm tra schedule có đang được highlight không */
    isHighlighted: (scheduleId: string) => boolean;
    /** Trang đích để navigate (admin hoặc public) */
    targetPage: 'admin' | 'public';
    /** Set trang đích */
    setTargetPage: (page: 'admin' | 'public') => void;
}

const ScheduleHighlightContext = createContext<ScheduleHighlightContextType | undefined>(undefined);

export function ScheduleHighlightProvider({ children }: { children: ReactNode }) {
    const [highlightedSchedules, setHighlightedSchedules] = useState<ScheduleHighlight[]>([]);
    const [targetPage, setTargetPage] = useState<'admin' | 'public'>('public');
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    // Clear highlights và URL params khi chuyển sang trang không phải trang lịch
    useEffect(() => {
        // Không clear khi đang ở trang lịch (để highlight vẫn còn)
        const isSchedulePage = location.pathname === '/lich-cong-tac' ||
            location.pathname === '/quan-tri/lich' ||
            location.pathname === '/quan-tri/quan-ly-lich' ||
            location.pathname === '/';
        if (!isSchedulePage) {
            setHighlightedSchedules([]);
            // Clear URL params (highlight, date) khi chuyển sang trang khác
            const hasHighlightParams = searchParams.has('highlight') || searchParams.has('date');
            if (hasHighlightParams) {
                setSearchParams({}, { replace: true });
            }
        }
        // Chỉ theo dõi pathname thay đổi, không theo dõi searchParams để tránh vòng lặp
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    const addHighlight = useCallback((scheduleId: string, scheduleDate: string) => {
        setHighlightedSchedules(prev => {
            // Tránh duplicate
            if (prev.some(h => h.scheduleId === scheduleId)) {
                return prev;
            }
            return [...prev, { scheduleId, scheduleDate }];
        });
    }, []);

    const clearHighlights = useCallback(() => {
        setHighlightedSchedules([]);
    }, []);

    const isHighlighted = useCallback((scheduleId: string) => {
        return highlightedSchedules.some(h => h.scheduleId === scheduleId);
    }, [highlightedSchedules]);

    return (
        <ScheduleHighlightContext.Provider value={{
            highlightedSchedules,
            addHighlight,
            clearHighlights,
            isHighlighted,
            targetPage,
            setTargetPage
        }}>
            {children}
        </ScheduleHighlightContext.Provider>
    );
}

export function useScheduleHighlight() {
    const context = useContext(ScheduleHighlightContext);
    if (!context) {
        throw new Error('useScheduleHighlight must be used within ScheduleHighlightProvider');
    }
    return context;
}
