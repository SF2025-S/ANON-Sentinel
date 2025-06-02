"use client"

import { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type = 'success', duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="text-green-500 h-5 w-5" />;
      case 'error':
        return <XCircle className="text-red-500 h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500 h-5 w-5" />;
      case 'info':
        return <Info className="text-blue-500 h-5 w-5" />;
      default:
        return <CheckCircle2 className="text-green-500 h-5 w-5" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border border-green-200 text-green-700';
      case 'error':
        return 'bg-red-50 border border-red-200 text-red-700';
      case 'warning':
        return 'bg-yellow-50 border border-yellow-200 text-yellow-700';
      case 'info':
        return 'bg-blue-50 border border-blue-200 text-blue-700';
      default:
        return 'bg-green-50 border border-green-200 text-green-700';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 animate-slide-up z-50">
      <div className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${getStyles()}`}>
        {getIcon()}
        <span>{message}</span>
      </div>
    </div>
  );
} 