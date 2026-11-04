import React, { useState, useMemo } from 'react';
import { useApp, AppNotification } from '../../context/AppContext';
import { 
  X, 
  Bell, 
  CheckCheck, 
  Trash2, 
  ChevronRight, 
  DollarSign, 
  PhoneCall, 
  Calendar, 
  Clock, 
  Award, 
  Volume2,
  ExternalLink
} from 'lucide-react';
import { buzzer } from '../../utils/buzzer';

export const NotificationDrawer: React.FC = () => {
  const { 
    isNotificationDrawerOpen, 
    setIsNotificationDrawerOpen, 
    notifications, 
    unreadNotificationCount, 
    markNotificationAsRead, 
    markAllNotificationsAsRead, 
    clearAllNotifications,
    deleteNotification,
    setActiveTab
  } = useApp();

  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);

  // Parse millisecond timestamp from createdAt or id for strict newest-to-oldest sorting
  const sortedNotifications = useMemo(() => {
    const getTime = (n: AppNotification) => {
      if (n.createdAt) {
        const t = new Date(n.createdAt).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      const match = n.id.match(/^notif_(\d+)_/);
      if (match) {
        const t = parseInt(match[1], 10);
        if (!isNaN(t) && t > 0) return t;
      }
      return 0;
    };
    return [...notifications].sort((a, b) => getTime(b) - getTime(a));
  }, [notifications]);

  if (!isNotificationDrawerOpen) return null;

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'payment':
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case 'leads':
        return <PhoneCall className="w-4 h-4 text-teal-600" />;
      case 'meeting':
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'attendance':
        return <Clock className="w-4 h-4 text-indigo-600" />;
      case 'leave':
        return <Award className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-[#00A88B]" />;
    }
  };

  const getCategoryBadge = (category?: string) => {
    switch (category) {
      case 'payment':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'leads':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'meeting':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'attendance':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'leave':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const formatTimestamp = (item: AppNotification) => {
    if (item.createdAt) {
      try {
        const d = new Date(item.createdAt);
        if (!isNaN(d.getTime())) {
          return d.toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
        }
      } catch {}
    }
    return item.timestamp || 'Just now';
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
        <div 
          className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-200/90 bg-[#07192C] text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-[#00C9A7]">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-black text-sm text-white">Notifications</h2>
                  {unreadNotificationCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#00C9A7] text-[#0A2540] font-black text-[10px]">
                      {unreadNotificationCount} New
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300">Live operational & team alerts</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => buzzer.playBuzzer()}
                title="Test Alert Buzzer Sound"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsNotificationDrawerOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Top Action Bar with Two Dedicated Buttons */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={markAllNotificationsAsRead}
                disabled={unreadNotificationCount === 0}
                className={`flex-1 sm:flex-initial px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs border ${
                  unreadNotificationCount > 0
                    ? 'bg-white border-[#00C9A7]/60 text-[#0A2540] hover:bg-[#E6FAF6] cursor-pointer active:scale-95'
                    : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <CheckCheck className={`w-3.5 h-3.5 ${unreadNotificationCount > 0 ? 'text-[#00A88B]' : 'text-slate-400'}`} />
                <span>Read all notifications</span>
              </button>

              <button
                type="button"
                onClick={clearAllNotifications}
                disabled={notifications.length === 0}
                className={`flex-1 sm:flex-initial px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs border ${
                  notifications.length > 0
                    ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 cursor-pointer active:scale-95'
                    : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Trash2 className={`w-3.5 h-3.5 ${notifications.length > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
                <span>Clear all notifications</span>
              </button>
            </div>

            <span className="text-[11px] font-semibold text-slate-500 self-end sm:self-center">
              {notifications.length} {notifications.length === 1 ? 'alert' : 'alerts'} ({unreadNotificationCount} unread)
            </span>
          </div>

          {/* Notifications List (Strictly Newest to Oldest) */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
            {sortedNotifications.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
                  <Bell className="w-7 h-7" />
                </div>
                <p className="text-xs font-bold text-slate-700">No new notifications</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Real-time updates regarding payments, calling leads, approvals, and attendance will appear here instantly.
                </p>
              </div>
            ) : (
              sortedNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    markNotificationAsRead(item.id);
                    setSelectedNotification(item);
                  }}
                  className={`pt-2.5 p-3 rounded-2xl transition-all cursor-pointer border relative group ${
                    item.read
                      ? 'bg-white border-slate-200/90 hover:border-slate-300 text-slate-600'
                      : 'bg-teal-50/40 border-teal-200/80 hover:border-[#00C9A7] text-slate-900 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      {getCategoryIcon(item.category)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <strong className="text-xs font-bold text-[#0A2540] truncate block">{item.title}</strong>
                          {!item.read && (
                            <span className="w-2 h-2 rounded-full bg-[#00C9A7] flex-shrink-0" />
                          )}
                        </div>

                        {/* Top-Right: Timestamp & Individual Delete Button */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-[10px] text-slate-400 whitespace-nowrap font-medium">
                            {formatTimestamp(item)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(item.id);
                              if (selectedNotification?.id === item.id) {
                                setSelectedNotification(null);
                              }
                            }}
                            title="Delete this notification"
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 mt-1 leading-snug line-clamp-3">
                        {item.body}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${getCategoryBadge(item.category)}`}>
                          {item.category || 'Announcement'}
                        </span>
                        
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markNotificationAsRead(item.id);
                            setSelectedNotification(item);
                          }}
                          className="text-[10px] font-bold text-[#00A88B] hover:text-[#008f76] flex items-center gap-0.5 cursor-pointer px-1.5 py-0.5 rounded-md hover:bg-teal-50"
                        >
                          <span>View Details</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
            <span>Trade Nexus Real-Time Push Gateway</span>
            <span className="font-mono text-emerald-600 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Live
            </span>
          </div>
        </div>
      </div>

      {/* Full Notification Detail Modal (Displays clear message & details) */}
      {selectedNotification && (
        <div 
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedNotification(null)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 bg-[#07192C] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[#00C9A7]">
                  {getCategoryIcon(selectedNotification.category)}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${getCategoryBadge(selectedNotification.category)}`}>
                    {selectedNotification.category || 'Announcement'}
                  </span>
                  {selectedNotification.senderName && (
                    <span className="text-[11px] text-slate-300">from {selectedNotification.senderName}</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Received: {formatTimestamp(selectedNotification)}
                </span>
                <h3 className="font-display font-black text-lg text-[#0A2540] leading-tight">
                  {selectedNotification.title}
                </h3>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                {selectedNotification.body}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  deleteNotification(selectedNotification.id);
                  setSelectedNotification(null);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Alert</span>
              </button>

              <div className="flex items-center gap-2">
                {selectedNotification.targetTab && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab(selectedNotification.targetTab as any);
                      setSelectedNotification(null);
                      setIsNotificationDrawerOpen(false);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#0A2540] bg-[#00C9A7] hover:bg-[#00A88B] hover:text-white flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <span>Go to {selectedNotification.targetTab}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedNotification(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
