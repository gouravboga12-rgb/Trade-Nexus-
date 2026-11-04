import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Bell, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  Sparkles, 
  Video, 
  ShieldAlert, 
  CreditCard,
  Users
} from 'lucide-react';

interface HomeNotificationsFeedProps {
  maxItems?: number;
  className?: string;
}

export const HomeNotificationsFeed: React.FC<HomeNotificationsFeedProps> = ({ 
  maxItems = 4, 
  className = '' 
}) => {
  const { 
    notifications, 
    unreadNotificationCount, 
    markNotificationAsRead, 
    setIsNotificationDrawerOpen, 
    setActiveTab,
    teamMeetings,
    joinMeeting,
  } = useApp();

  // Combine top unread notifications and upcoming meetings (newest to oldest)
  const sorted = [...notifications].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : parseInt(a.id.match(/^notif_(\d+)_/)?.[1] || '0', 10);
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : parseInt(b.id.match(/^notif_(\d+)_/)?.[1] || '0', 10);
    return timeB - timeA;
  });
  const displayItems = sorted.slice(0, maxItems);
  const nextMeeting = teamMeetings && teamMeetings.length > 0 ? teamMeetings[0] : null;

  return (
    <div className={`bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden ${className}`}>
      {/* Header bar */}
      <div className="px-4 sm:px-5 py-3.5 bg-gradient-to-r from-slate-900 via-[#07192C] to-[#0B2545] text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#00C9A7]/20 border border-[#00C9A7]/40 flex items-center justify-center text-[#00C9A7] shadow-2xs">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-xs sm:text-sm text-white tracking-wide">
                Live Operational Feed
              </h3>
              {unreadNotificationCount > 0 ? (
                <span className="px-1.5 py-0.5 rounded-full bg-[#00C9A7] text-[#0A2540] text-[10px] font-black uppercase tracking-wider animate-pulse">
                  {unreadNotificationCount} New
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                  Synced
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-300 hidden sm:block">
              Real-time meetings, admin broadcasts &amp; system updates
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsNotificationDrawerOpen(true)}
          className="text-[11px] font-bold text-[#00C9A7] hover:text-white transition-colors flex items-center gap-1 cursor-pointer bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-xl"
        >
          <span>View All</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Featured Upcoming Meeting Banner (if scheduled) */}
      {nextMeeting && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-teal-100 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#00C9A7] text-[#0A2540] flex items-center justify-center font-bold flex-shrink-0 shadow-2xs">
              <Video className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 block">
                Next Scheduled Meeting
              </span>
              <strong className="text-xs font-bold text-slate-900 truncate block">
                {nextMeeting.title}
              </strong>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] text-teal-700 font-semibold bg-white px-2 py-0.5 rounded-md border border-teal-200">
              {nextMeeting.dateTime || (nextMeeting as any).time || 'Upcoming'}
            </span>
            <button
              onClick={() => joinMeeting(nextMeeting)}
              className="px-2.5 py-1 rounded-lg bg-[#0A2540] text-[#00C9A7] text-[10px] font-bold hover:bg-[#123358] transition-colors cursor-pointer"
            >
              Join
            </button>
          </div>
        </div>
      )}

      {/* Feed list */}
      <div className="divide-y divide-slate-100">
        {displayItems.length === 0 ? (
          <div className="p-6 text-center text-slate-400">
            <Sparkles className="w-6 h-6 text-[#00C9A7] mx-auto mb-1.5 opacity-80" />
            <p className="text-xs font-bold text-slate-700">All caught up!</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              No pending notifications. System updates will appear here in real-time.
            </p>
          </div>
        ) : (
          displayItems.map((notif) => {
            const isMeeting = notif.category === 'meeting' || notif.title.toLowerCase().includes('meeting');
            const isPayment = notif.category === 'payment';
            const isAttendance = notif.category === 'attendance';

            return (
              <div
                key={notif.id}
                onClick={() => {
                  markNotificationAsRead(notif.id);
                  if (notif.targetTab) {
                    setActiveTab(notif.targetTab as any);
                  }
                }}
                className={`p-3.5 sm:px-4 flex items-start gap-3 transition-colors cursor-pointer group hover:bg-slate-50/80 ${
                  !notif.read ? 'bg-teal-50/20' : 'bg-white'
                }`}
              >
                {/* Icon Badge */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs ${
                    isMeeting
                      ? 'bg-blue-50 text-blue-600 border border-blue-200/60'
                      : isPayment
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60'
                      : isAttendance
                      ? 'bg-amber-50 text-amber-600 border border-amber-200/60'
                      : 'bg-teal-50 text-[#00A88B] border border-teal-200/60'
                  }`}
                >
                  {isMeeting ? (
                    <Calendar className="w-4 h-4" />
                  ) : isPayment ? (
                    <CreditCard className="w-4 h-4" />
                  ) : isAttendance ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#00A88B] transition-colors truncate">
                      {notif.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0 font-medium">
                      {notif.timestamp}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {notif.body}
                  </p>
                </div>

                {/* Unread indicator */}
                {!notif.read && (
                  <span className="w-2 h-2 rounded-full bg-[#00C9A7] mt-2 flex-shrink-0 ring-2 ring-white" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
