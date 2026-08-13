// components/Toast.tsx
import React from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info' | null;
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    if (!message || !type) return null;

    const icons = {
        success: <CheckCircle className="w-5 h-5" />,
        error: <XCircle className="w-5 h-5" />,
        info: <Info className="w-5 h-5" />,
    };

    const colors = {
        success: 'bg-emerald-500 text-white border-emerald-400',
        error: 'bg-red-500 text-white border-red-400',
        info: 'bg-blue-500 text-white border-blue-400',
    };

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none px-4 pt-[env(safe-area-inset-top)]">
            <div className="pt-4">
                <div
                    className={`
                        pointer-events-auto
                        flex items-center gap-3
                        px-5 py-4
                        rounded-2xl
                        shadow-2xl
                        border
                        ${colors[type]}
                        max-w-sm w-full
                        mx-auto
                        animate-slide-down
                        backdrop-blur-sm
                        bg-opacity-95
                    `}
                    role="alert"
                >
                    <div className="flex-shrink-0">
                        {icons[type]}
                    </div>
                    <p className="text-sm font-medium flex-1 text-center">
                        {message}
                    </p>
                    <button
                        onClick={onClose}
                        className="flex-shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};