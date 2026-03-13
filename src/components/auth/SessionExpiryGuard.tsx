/**
 * SessionExpiryGuard
 * 
 * Giám sát phiên đăng nhập JWT:
 * - Cảnh báo khi sắp hết phiên (2 phút trước)
 * - Buộc đăng xuất khi hết phiên, nhưng CHỈ khi user đang rảnh
 * - Nếu user đang bận (mở dialog, form dirty, vừa tương tác) → đợi
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { LogOut, Clock, AlertTriangle } from 'lucide-react';

const AUTH_STORAGE_KEY = 'tbu_auth_token';

// Thời gian cảnh báo trước khi hết phiên (ms)
const WARNING_BEFORE_EXPIRY_MS = 2 * 60 * 1000; // 2 phút

// Thời gian kiểm tra lại khi user đang bận (ms)
const BUSY_RECHECK_INTERVAL_MS = 10 * 1000; // 10 giây

// Thời gian tối thiểu kể từ lần tương tác cuối để coi là "rảnh" (ms)
const IDLE_THRESHOLD_MS = 30 * 1000; // 30 giây

/**
 * Giải mã JWT và lấy thời điểm hết hạn
 */
function getTokenExpiry(): number | null {
    const token = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!token) return null;

    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = JSON.parse(atob(parts[1]));
        return payload.exp ? payload.exp * 1000 : null; // convert to ms
    } catch {
        return null;
    }
}

/**
 * Kiểm tra user có đang "bận" hay không
 */
function isUserBusy(lastActivityTime: number): boolean {
    const now = Date.now();

    // 1. Kiểm tra có dialog/modal nào đang mở không
    const openDialogs = document.querySelectorAll(
        '[role="dialog"], [role="alertdialog"], [data-state="open"]'
    );
    // Lọc ra chỉ các dialog thực sự visible (không phải chính dialog hết phiên)
    const activeDialogs = Array.from(openDialogs).filter(el => {
        // Bỏ qua dialog hết phiên (có data-session-guard)
        if (el.hasAttribute('data-session-guard')) return false;
        // Kiểm tra element visible
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    });

    if (activeDialogs.length > 0) {
        console.log('[SessionGuard] User is busy: dialog/modal is open');
        return true;
    }

    // 2. Kiểm tra form có dirty state (input đã thay đổi so với ban đầu)
    const forms = document.querySelectorAll('form');
    for (const form of forms) {
        const inputs = form.querySelectorAll('input, textarea, select');
        for (const input of inputs) {
            const el = input as HTMLInputElement;
            if (el.value && el.value !== el.defaultValue) {
                console.log('[SessionGuard] User is busy: form has unsaved changes');
                return true;
            }
        }
    }

    // 3. Kiểm tra user vừa tương tác gần đây
    if (now - lastActivityTime < IDLE_THRESHOLD_MS) {
        console.log('[SessionGuard] User is busy: recent activity detected');
        return true;
    }

    return false;
}

export function SessionExpiryGuard() {
    const { isAuthenticated, logout } = useAuth();
    const [showWarning, setShowWarning] = useState(false);
    const [showForceLogout, setShowForceLogout] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');
    const lastActivityRef = useRef(Date.now());
    const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const busyCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Theo dõi hoạt động người dùng
    useEffect(() => {
        const updateActivity = () => {
            lastActivityRef.current = Date.now();
        };

        window.addEventListener('mousemove', updateActivity, { passive: true });
        window.addEventListener('keydown', updateActivity, { passive: true });
        window.addEventListener('click', updateActivity, { passive: true });
        window.addEventListener('scroll', updateActivity, { passive: true });
        window.addEventListener('touchstart', updateActivity, { passive: true });

        return () => {
            window.removeEventListener('mousemove', updateActivity);
            window.removeEventListener('keydown', updateActivity);
            window.removeEventListener('click', updateActivity);
            window.removeEventListener('scroll', updateActivity);
            window.removeEventListener('touchstart', updateActivity);
        };
    }, []);

    // Xóa tất cả timers
    const clearAllTimers = useCallback(() => {
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
        if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
        if (busyCheckRef.current) clearInterval(busyCheckRef.current);
        warningTimerRef.current = null;
        expiryTimerRef.current = null;
        countdownRef.current = null;
        busyCheckRef.current = null;
    }, []);

    // Xử lý đăng xuất
    const handleForceLogout = useCallback(() => {
        clearAllTimers();
        setShowWarning(false);
        setShowForceLogout(false);
        logout();
        // Chuyển về trang đăng nhập
        window.location.href = '/dang-nhap';
    }, [logout, clearAllTimers]);

    // Kiểm tra và thiết lập timer khi user đã đăng nhập
    useEffect(() => {
        if (!isAuthenticated) {
            clearAllTimers();
            setShowWarning(false);
            setShowForceLogout(false);
            return;
        }

        const expiry = getTokenExpiry();
        if (!expiry) return;

        const now = Date.now();
        const msUntilExpiry = expiry - now;

        if (msUntilExpiry <= 0) {
            // Token đã hết hạn
            tryForceLogout();
            return;
        }

        // Đặt timer cảnh báo
        const msUntilWarning = msUntilExpiry - WARNING_BEFORE_EXPIRY_MS;
        if (msUntilWarning > 0) {
            warningTimerRef.current = setTimeout(() => {
                setShowWarning(true);
                // Bắt đầu đếm ngược
                countdownRef.current = setInterval(() => {
                    const remaining = expiry - Date.now();
                    if (remaining <= 0) {
                        if (countdownRef.current) clearInterval(countdownRef.current);
                        setShowWarning(false);
                        tryForceLogout();
                    } else {
                        const mins = Math.floor(remaining / 60000);
                        const secs = Math.floor((remaining % 60000) / 1000);
                        setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
                    }
                }, 1000);
            }, msUntilWarning);
        } else {
            // Đã ở trong khoảng cảnh báo
            setShowWarning(true);
            countdownRef.current = setInterval(() => {
                const remaining = expiry - Date.now();
                if (remaining <= 0) {
                    if (countdownRef.current) clearInterval(countdownRef.current);
                    setShowWarning(false);
                    tryForceLogout();
                } else {
                    const mins = Math.floor(remaining / 60000);
                    const secs = Math.floor((remaining % 60000) / 1000);
                    setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
                }
            }, 1000);
        }

        function tryForceLogout() {
            // Kiểm tra user có đang bận không
            if (isUserBusy(lastActivityRef.current)) {
                console.log('[SessionGuard] Session expired nhưng user đang bận, đợi...');
                // Kiểm tra lại sau mỗi 10 giây
                busyCheckRef.current = setInterval(() => {
                    if (!isUserBusy(lastActivityRef.current)) {
                        console.log('[SessionGuard] User đã rảnh, hiện dialog buộc đăng xuất');
                        if (busyCheckRef.current) clearInterval(busyCheckRef.current);
                        setShowForceLogout(true);
                    }
                }, BUSY_RECHECK_INTERVAL_MS);
            } else {
                setShowForceLogout(true);
            }
        }

        return () => clearAllTimers();
    }, [isAuthenticated, clearAllTimers]);

    // Không render gì nếu user chưa đăng nhập
    if (!isAuthenticated) return null;

    return (
        <>
            {/* Cảnh báo sắp hết phiên */}
            {showWarning && !showForceLogout && (
                <div className="fixed bottom-4 right-4 z-[9999] max-w-sm animate-in slide-in-from-bottom-5 duration-500">
                    <div className="bg-yellow-50 dark:bg-yellow-900/80 border border-yellow-300 dark:border-yellow-600 rounded-xl p-4 shadow-2xl">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 dark:bg-yellow-800 rounded-full flex items-center justify-center">
                                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                                    Phiên sắp hết hạn
                                </p>
                                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                                    Phiên làm việc sẽ hết hạn sau <span className="font-bold text-yellow-900 dark:text-yellow-100">{timeLeft}</span>.
                                    Vui lòng lưu công việc đang làm.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Buộc đăng xuất */}
            <AlertDialog open={showForceLogout}>
                <AlertDialogContent data-session-guard="true" className="max-w-md">
                    <AlertDialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                            </div>
                            <AlertDialogTitle className="text-lg">
                                Phiên đăng nhập đã hết hạn
                            </AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="text-sm">
                            Phiên làm việc của bạn đã hết hạn. Vui lòng đăng nhập lại để tiếp tục sử dụng hệ thống.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction
                            onClick={handleForceLogout}
                            className="bg-red-600 hover:bg-red-700 text-white gap-2"
                        >
                            <LogOut className="h-4 w-4" />
                            Đăng xuất
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
