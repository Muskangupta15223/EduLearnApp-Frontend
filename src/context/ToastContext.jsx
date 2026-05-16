import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const success = useCallback((msg) => add(msg, 'success'), [add]);
  const error   = useCallback((msg) => add(msg, 'error'),   [add]);
  const info    = useCallback((msg) => add(msg, 'info'),    [add]);
  const warn    = useCallback((msg) => add(msg, 'warn'),    [add]);
  const dismiss = useCallback((id)  => setToasts(prev => prev.filter(t => t.id !== id)), []);

  const icons = {
    success: CheckCircle2,
    error: XCircle,
    info: Info,
    warn: AlertTriangle,
  };

  return (
    <ToastContext.Provider value={{ success, error, info, warn, dismiss }}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="true">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`} role="status">
            <div className="toast-icon-wrap">
              {(() => {
                const Icon = icons[t.type] || Info;
                return <Icon size={18} aria-hidden="true" />;
              })()}
            </div>
            <div className="toast-message">{t.message}</div>
            <button type="button" className="toast-close" aria-label="dismiss notification" onClick={() => dismiss(t.id)}>
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be within ToastProvider');
  return ctx;
};
