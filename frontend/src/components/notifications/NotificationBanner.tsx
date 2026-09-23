import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, ExternalLink, Calendar, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NotificationItem } from '../../types/notifications';

interface NotificationBannerProps {
  notification: NotificationItem | null;
  onDismiss: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  notification,
  onDismiss,
}) => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [notification, onDismiss]);

  if (!notification || !visible) return null;

  const handleClick = () => {
    setVisible(false);
    onDismiss();
    if (notification.contractId) {
      navigate(`/documents/${notification.contractId}`);
    } else {
      navigate('/vault');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        drag="x"
        dragConstraints={{ left: -300, right: 300 }}
        onDragEnd={(_, info) => {
          if (Math.abs(info.offset.x) > 100) {
            setVisible(false);
            onDismiss();
          }
        }}
        className="fixed top-20 right-4 sm:right-6 z-50 w-full max-w-sm bg-slate-900/95 dark:bg-slate-900/95 text-white border border-slate-700/80 shadow-2xl rounded-3xl p-4 backdrop-blur-md cursor-pointer group select-none"
        onClick={handleClick}
      >
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-600/90 text-white shrink-0 mt-0.5">
            {notification.type === 'reminder' ? (
              <Calendar className="w-5 h-5" />
            ) : notification.type === 'security' ? (
              <ShieldAlert className="w-5 h-5 text-amber-300" />
            ) : (
              <Bell className="w-5 h-5" />
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-white truncate">{notification.title}</h4>
              <span className="text-[10px] text-slate-400 shrink-0">Just now</span>
            </div>
            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{notification.body}</p>

            {notification.contractTitle && (
              <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 pt-0.5 group-hover:underline">
                <span>View Contract: {notification.contractTitle}</span>
                <ExternalLink className="w-3 h-3" />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setVisible(false);
              onDismiss();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
