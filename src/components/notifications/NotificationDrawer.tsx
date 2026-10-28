import React from 'react';
import { NotificationItem } from '../../types';
import { X, CheckCheck, Bell, AlertTriangle, AlertOctagon, Info, CheckCircle2 } from 'lucide-react';
import { markNotificationRead, markAllNotificationsRead } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onSelectFdr: (fdrId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onSelectFdr,
}) => {
  const { currentUser } = useAuth();

  if (!isOpen) return null;

  // Filter notifications for this user / role
  const userNotifications = notifications.filter((n) => {
    if (currentUser.role === 'ADMIN') return true;
    if (n.targetRole === 'ALL') return true;
    if (n.targetRole === currentUser.role) return true;
    if (n.targetInstitutionId && n.targetInstitutionId === currentUser.institutionId) return true;
    return false;
  });

  const unreadCount = userNotifications.filter((n) => !n.isRead).length;

  const handleItemClick = (item: NotificationItem) => {
    if (!item.isRead) {
      markNotificationRead(item.id);
    }
    if (item.relatedFdrId) {
      onSelectFdr(item.relatedFdrId);
      onClose();
    }
  };

  const getSeverityIcon = (severity: NotificationItem['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertOctagon className="w-4 h-4 text-red-600 shrink-0" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />;
      case 'SUCCESS':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-blue-600 shrink-0" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-700" />
            <div>
              <h2 className="font-bold text-sm text-slate-900">Notifications &amp; Regulatory Alerts</h2>
              <p className="text-[11px] text-slate-500">
                {unreadCount} unread alert{unreadCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllNotificationsRead(currentUser)}
                className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 hover:underline"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark All Read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
          {userNotifications.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-500">
              <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold">No notifications available</p>
              <p className="text-[11px] text-slate-400 mt-1">You are all caught up on regulatory compliance alerts.</p>
            </div>
          ) : (
            userNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={`p-3 rounded-md transition-all cursor-pointer flex items-start gap-3 ${
                  n.isRead ? 'bg-white hover:bg-slate-50 opacity-80' : 'bg-blue-50/70 hover:bg-blue-50 border-l-4 border-blue-600 font-medium'
                }`}
              >
                <div className="mt-0.5">{getSeverityIcon(n.severity)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{n.title}</h4>
                    <span className="text-[10px] text-slate-400 shrink-0">{n.createdAt.slice(11, 16)}</span>
                  </div>
                  <p className="text-xs text-slate-700 mt-1 line-clamp-2 leading-relaxed">{n.message}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-[10px] text-slate-400">{n.createdAt.slice(0, 10)}</span>
                    {n.relatedFdrId && (
                      <span className="text-blue-700 font-semibold hover:underline text-[11px]">
                        View Record →
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500">
          Automated compliance dispatch powered by AICTE Regulation Rule Engine.
        </div>
      </div>
    </div>
  );
};
