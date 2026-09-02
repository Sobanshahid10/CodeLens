import React, { useEffect, useRef } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { Toast, useToastStore } from '../hooks/useToast';

const ICONS: Record<Toast['type'], React.ReactNode> = {
  success: <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />,
  error: <AlertCircle size={16} className="text-rose-400 shrink-0" />,
  warning: <AlertTriangle size={16} className="text-amber-400 shrink-0" />,
  info: <Info size={16} className="text-indigo-400 shrink-0" />,
};

const BORDERS: Record<Toast['type'], string> = {
  success: 'border-emerald-500/40',
  error: 'border-rose-500/40',
  warning: 'border-amber-500/40',
  info: 'border-indigo-500/40',
};

const GLOWS: Record<Toast['type'], string> = {
  success: 'shadow-emerald-950/60',
  error: 'shadow-rose-950/60',
  warning: 'shadow-amber-950/60',
  info: 'shadow-indigo-950/60',
};

const ToastItem: React.FC<{ toast: Toast }> = ({ toast }) => {
  const removeToast = useToastStore((s) => s.removeToast);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!barRef.current) return;
    const el = barRef.current;
    const dur = toast.duration ?? 3500;
    el.style.transition = `width ${dur}ms linear`;
    requestAnimationFrame(() => {
      el.style.width = '0%';
    });
  }, [toast.duration]);

  return (
    <div
      className={`relative flex items-start gap-3 p-3.5 rounded-xl bg-[#0f1520]/95 border ${BORDERS[toast.type]} shadow-2xl ${GLOWS[toast.type]} backdrop-blur-xl overflow-hidden min-w-[280px] max-w-sm animate-toast-in`}
    >
      {/* Progress bar */}
      <div
        ref={barRef}
        className={`absolute bottom-0 left-0 h-[2px] w-full opacity-70 ${
          toast.type === 'success'
            ? 'bg-emerald-400'
            : toast.type === 'error'
            ? 'bg-rose-400'
            : toast.type === 'warning'
            ? 'bg-amber-400'
            : 'bg-indigo-400'
        }`}
        style={{ transition: 'none' }}
      />

      <div className="mt-0.5">{ICONS[toast.type]}</div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white leading-snug">{toast.title}</p>
        {toast.message && (
          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{toast.message}</p>
        )}
      </div>

      <button
        onClick={() => removeToast(toast.id)}
        className="p-0.5 rounded text-slate-500 hover:text-slate-300 transition-colors shrink-0"
      >
        <X size={13} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 items-end pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  );
};
