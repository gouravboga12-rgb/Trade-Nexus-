import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { RotateCw, ArrowDown } from 'lucide-react';

interface PullToRefreshProps {
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ children }) => {
  const { isRefreshing, refreshAllData } = useApp();
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startYRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const THRESHOLD = 65;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let touchStartY = 0;
    let isTracking = false;

    const handleTouchStart = (e: TouchEvent) => {
      // Check if we are at the top of the scroll container and window
      const scrollTop = el.scrollTop || window.scrollY || 0;
      if (scrollTop <= 1) {
        touchStartY = e.touches[0].clientY;
        startYRef.current = touchStartY;
        isTracking = true;
      } else {
        isTracking = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTracking || isRefreshing) return;
      const currentY = e.touches[0].clientY;
      const diff = currentY - touchStartY;

      const scrollTop = el.scrollTop || window.scrollY || 0;
      if (diff > 0 && scrollTop <= 1) {
        // Apply resistance curve
        const pull = Math.min(90, Math.pow(diff, 0.85) * 1.5);
        setPullDistance(pull);
        setIsPulling(true);
      } else {
        setPullDistance(0);
        setIsPulling(false);
      }
    };

    const handleTouchEnd = async () => {
      if (!isTracking) return;
      isTracking = false;

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

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, isRefreshing, refreshAllData]);

  const showIndicator = pullDistance > 10 || isRefreshing;
  const isTriggered = pullDistance >= THRESHOLD;

  return (
    <div ref={containerRef} className="flex-1 flex flex-col overflow-y-auto relative overscroll-y-contain">
      {/* Visual Pull-to-refresh Pill */}
      {showIndicator && (
        <div 
          style={{ transform: `translateY(${Math.max(0, pullDistance - 45)}px)` }}
          className="absolute top-2 left-0 right-0 z-40 flex justify-center pointer-events-none transition-transform duration-75 ease-out"
        >
          <div className="bg-[#0A2540]/90 backdrop-blur-md text-white border border-[#00C9A7]/40 px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-2 text-xs font-bold animate-in fade-in">
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
                <span className="text-slate-200">Pull to refresh</span>
              </>
            )}
          </div>
        </div>
      )}

      {children}
    </div>
  );
};
