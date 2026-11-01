import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { RotateCw, ArrowDown } from 'lucide-react';

interface PullToRefreshProps {
  children: React.ReactNode;
  containerId?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ children, containerId = 'main-scroll-container' }) => {
  const { isRefreshing, refreshAllData } = useApp();
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startYRef = useRef(0);
  const isTrackingRef = useRef(false);

  const THRESHOLD = 65;

  useEffect(() => {
    const el = document.getElementById(containerId) || (typeof window !== 'undefined' ? window : null);
    if (!el) return;

    const getScrollTop = (): number => {
      const containerEl = document.getElementById(containerId);
      if (containerEl) return containerEl.scrollTop;
      return window.scrollY || document.documentElement.scrollTop || 0;
    };

    const handleTouchStart = (e: TouchEvent) => {
      // ONLY start tracking if scrolled to the absolute top of the container AND document
      const scrollTop = getScrollTop();
      if (scrollTop <= 0 && e.touches.length === 1) {
        startYRef.current = e.touches[0].clientY;
        isTrackingRef.current = true;
      } else {
        isTrackingRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTrackingRef.current || isRefreshing) return;
      const currentY = e.touches[0].clientY;
      const diff = currentY - startYRef.current;
      const scrollTop = getScrollTop();

      // Only handle downward pull if strictly at the top
      if (diff > 12 && scrollTop <= 0) {
        const pull = Math.min(80, Math.pow(diff, 0.82) * 1.3);
        setPullDistance(pull);
        setIsPulling(true);
      } else if (diff <= 0 || scrollTop > 0) {
        isTrackingRef.current = false;
        setPullDistance(0);
        setIsPulling(false);
      }
    };

    const handleTouchEnd = async () => {
      if (!isTrackingRef.current) return;
      isTrackingRef.current = false;

      if (pullDistance >= THRESHOLD && !isRefreshing) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(25);
          } catch {}
        }
        setPullDistance(THRESHOLD);
        setIsPulling(false);
        try {
          await refreshAllData();
        } finally {
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
        setIsPulling(false);
      }
    };

    el.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
    el.addEventListener('touchmove', handleTouchMove as EventListener, { passive: true });
    el.addEventListener('touchend', handleTouchEnd as EventListener, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart as EventListener);
      el.removeEventListener('touchmove', handleTouchMove as EventListener);
      el.removeEventListener('touchend', handleTouchEnd as EventListener);
    };
  }, [containerId, pullDistance, isRefreshing, refreshAllData]);

  const showIndicator = pullDistance > 12 || isRefreshing;
  const isTriggered = pullDistance >= THRESHOLD;

  return (
    <div className="relative w-full">
      {/* Visual Pull-to-refresh Pill */}
      {showIndicator && (
        <div 
          style={{ transform: `translateY(${Math.max(0, pullDistance - 40)}px)` }}
          className="fixed top-14 left-0 right-0 z-40 flex justify-center pointer-events-none transition-transform duration-75 ease-out"
        >
          <div className="bg-[#0A2540]/95 backdrop-blur-md text-white border border-[#00C9A7]/40 px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-2 text-xs font-bold animate-in fade-in">
            {isRefreshing ? (
              <>
                <RotateCw className="w-3.5 h-3.5 text-[#00C9A7] animate-spin" />
                <span className="text-[#00C9A7]">Syncing latest data...</span>
              </>
            ) : isTriggered ? (
              <>
                <RotateCw className="w-3.5 h-3.5 text-[#00C9A7]" />
                <span className="text-[#00C9A7]">Release to refresh</span>
              </>
            ) : (
              <>
                <ArrowDown className="w-3.5 h-3.5 text-slate-300 animate-bounce" />
                <span className="text-slate-200">Pull down to refresh</span>
              </>
            )}
          </div>
        </div>
      )}

      {children}
    </div>
  );
};
