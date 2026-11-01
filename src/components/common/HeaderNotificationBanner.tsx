import React, { useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Bell, 
  PhoneCall, 
  DollarSign, 
  Calendar, 
  Clock, 
  Award, 
  ChevronRight,
  Sparkles
} from 'lucide-react';

export const HeaderNotificationBanner: React.FC = () => {
  const { 
    bannerNotification, 
    dismissBannerNotification, 
    markNotificationAsRead, 
    setActiveTab, 
    setIsNotificationDrawerOpen 
  } = useApp();

  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (bannerNotification) {
      if (timerRef.current) clearTimeout(timerRef.current);
      // Auto-dismiss after 6 seconds
      timerRef.current = setTimeout(() => {
        dismissBannerNotification();
      }, 6000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [bannerNotification, dismissBannerNotification]);

  if (!bannerNotification) return null;

  const handleBannerClick = () => {
    markNotificationAsRead(bannerNotification.id);
    dismissBannerNotification();
    if (bannerNotification.targetTab) {
      setActiveTab(bannerNotification.targetTab as any);
    } else {
      setIsNotificationDrawerOpen(true);
    }
  };

  const getIcon = () => {
    switch (bannerNotification.category) {
      case 'leads':
        return <PhoneCall className="w-4 h-4 text-emerald-400" />;
      case 'payment':
        return <DollarSign className="w-4 h-4 text-emerald-400" />;
      case 'meeting':
        return <Calendar className="w-4 h-4 text-blue-400" />;
      case 'attendance':
        return <Clock className="w-4 h-4 text-indigo-400" />;
      case 'leave':
        return <Award className="w-4 h-4 text-amber-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-[#00C9A7]" />;
    }
  };

  return (
    <aside 
      aria-label="Notification Alert"
      className="fixed top-14 left-0 right-0 z-50 px-3 sm:px-6 pointer-events-none flex justify-center animate-in slide-in-from-top-4 duration-300 print:hidden"
    >
      <div 
        onClick={handleBannerClick}
        className="pointer-events-auto w-full max-w-lg bg-[#07192C]/95 backdrop-blur-md border border-[#00C9A7]/50 rounded-2xl p-3 shadow-2xl text-white flex items-start gap-3 cursor-pointer group hover:border-[#00C9A7] transition-all"
      >
        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5 border border-white/10">
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#00C9A7] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C9A7] animate-ping" />
              {bannerNotification.category || 'Notification'}
            </span>
            <span className="text-[10px] text-slate-400">Just now</span>
          </div>
          
          <h4 className="text-xs font-bold text-white truncate mt-0.5 group-hover:text-[#00C9A7] transition-colors">
            {bannerNotification.title}
          </h4>
          
          <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5 leading-snug">
            {bannerNotification.body}
          </p>
        </div>

        <div className="flex items-center gap-1 self-center">
          <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-bold text-[#00C9A7] bg-white/5 px-2 py-1 rounded-lg">
            <span>View</span>
            <ChevronRight className="w-3 h-3" />
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              dismissBannerNotification();
            }}
            title="Dismiss notification"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
