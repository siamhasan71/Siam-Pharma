import React, { useState, useEffect } from 'react';
import {
  StorageNotification,
  subscribeToStorageNotifications,
} from '../db/pharmacyDb';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X, Database } from 'lucide-react';

export const StorageToast: React.FC = () => {
  const [notifications, setNotifications] = useState<StorageNotification[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToStorageNotifications((newNotif) => {
      setNotifications((prev) => [newNotif, ...prev.slice(0, 4)]);

      // Auto-dismiss after 6 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== newNotif.id));
      }, 6000);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {notifications.map((notif) => {
        const isError = notif.type === 'error';
        const isWarning = notif.type === 'warning';
        const isSuccess = notif.type === 'success';

        return (
          <div
            key={notif.id}
            className={`pointer-events-auto p-3.5 rounded-xl border shadow-xl flex items-start gap-3 backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-5 ${
              isError
                ? 'bg-rose-950/95 border-rose-500/80 text-rose-100'
                : isWarning
                ? 'bg-amber-950/95 border-amber-500/80 text-amber-100'
                : isSuccess
                ? 'bg-emerald-950/95 border-emerald-500/80 text-emerald-100'
                : 'bg-neutral-900/95 border-neutral-700 text-neutral-100'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {isError && <AlertCircle className="w-5 h-5 text-rose-400" />}
              {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {isSuccess && <CheckCircle className="w-5 h-5 text-emerald-400" />}
              {!isError && !isWarning && !isSuccess && (
                <Database className="w-5 h-5 text-teal-400" />
              )}
            </div>

            <div className="flex-1 text-xs">
              <div className="font-bold flex items-center justify-between">
                <span>{notif.title}</span>
                <span className="text-[10px] font-normal opacity-70">
                  IndexedDB
                </span>
              </div>
              <div className="mt-1 leading-relaxed opacity-90">{notif.message}</div>
            </div>

            <button
              onClick={() =>
                setNotifications((prev) => prev.filter((n) => n.id !== notif.id))
              }
              className="p-1 rounded-md hover:bg-white/10 text-white/70 hover:text-white shrink-0 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
