import React from 'react';
import { useApp } from '../../context/AppContext';
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
  ShieldAlert,
  Volume2
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
    setActiveTab
  } = useApp();

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

  return (
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

        {/* Action Bar */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            {notifications.length} {notifications.length === 1 ? 'alert' : 'alerts'} logged
          </span>
          <div className="flex items-center gap-2">
            {unreadNotificationCount > 0 && (
              <button
                type="button"
                onClick={markAllNotificationsAsRead}
                className="text-[11px] font-bold text-[#00A88B] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={clearAllNotifications}
                className="text-[11px] font-bold text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 divide-y divide-slate-100">
          {notifications.length === 0 ? (
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
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  markNotificationAsRead(item.id);
                  if (item.targetTab) {
                    setActiveTab(item.targetTab as any);
                    setIsNotificationDrawerOpen(false);
                  }
                }}
                className={`pt-2.5 p-3 rounded-2xl transition-all cursor-pointer border ${
                  item.read
                    ? 'bg-white border-slate-100 hover:border-slate-200 text-slate-600'
                    : 'bg-teal-50/40 border-teal-200/80 hover:border-[#00C9A7] text-slate-900 shadow-2xs'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    {getCategoryIcon(item.category)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <strong className="text-xs font-bold truncate">{item.title}</strong>
                        {!item.read && (
                          <span className="w-2 h-2 rounded-full bg-[#00C9A7] flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap font-medium">
                        {item.timestamp}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                      {item.body}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${getCategoryBadge(item.category)}`}>
                        {item.category || 'Update'}
                      </span>
                      {item.targetTab && (
                        <span className="text-[10px] font-bold text-[#00A88B] flex items-center gap-0.5">
                          <span>View</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      )}
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
  );
};
