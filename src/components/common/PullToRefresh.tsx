import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { RotateCw } from 'lucide-react';

interface PullToRefreshProps {
  children: React.ReactNode;
  containerId?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ children, containerId = 'main-scroll-container' }) => {
  const { isRefreshing, refreshAllData } = useApp();
  const [pullDistance, setPullDistance] = useState(0);
  const startYRef = useRef(0);
  const isTrackingRef = useRef(false);

  const THRESHOLD = 65;

  useEffect(() => {
    // Listen for custom trigger from mobile app shell bridge
    const handleNativeBridgeRefresh = () => {
      if (!isRefreshing) {
        refreshAllData().catch(console.warn);
      }
    };
    window.addEventListener('tnx:native-pull-refresh', handleNativeBridgeRefresh);
    (window as any).__triggerTradeNexusResume = handleNativeBridgeRefresh;

    const el = document.getElementById(containerId) || (typeof window !== 'undefined' ? window : null);
    if (!el) {
      return () => {
        window.removeEventListener('tnx:native-pull-refresh', handleNativeBridgeRefresh);
      };
    }

    const getScrollTop = (): number => {
      const containerEl = document.getElementById(containerId);
      const docTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      if (containerEl && containerEl.scrollTop > 0) return containerEl.scrollTop;
      return docTop;
    };

    const handleTouchStart = (e: TouchEvent) => {
      // ONLY start tracking if scrolled to the absolute top of both container AND document
      const scrollTop = getScrollTop();
      if (scrollTop <= 1 && e.touches.length === 1) {
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
      if (diff > 8 && scrollTop <= 1) {
        const pull = Math.min(85, Math.pow(diff, 0.8) * 1.35);
        setPullDistance(pull);
      } else if (diff <= 0 || scrollTop > 1) {
        isTrackingRef.current = false;
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!isTrackingRef.current) return;
      isTrackingRef.current = false;

      if (pullDistance >= THRESHOLD && !isRefreshing) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(20);
          } catch {}
        }
        setPullDistance(THRESHOLD);
        try {
          await refreshAllData();
        } finally {
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };

    el.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
    el.addEventListener('touchmove', handleTouchMove as EventListener, { passive: true });
    el.addEventListener('touchend', handleTouchEnd as EventListener, { passive: true });
    window.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
    window.addEventListener('touchmove', handleTouchMove as EventListener, { passive: true });
    window.addEventListener('touchend', handleTouchEnd as EventListener, { passive: true });

    return () => {
      window.removeEventListener('tnx:native-pull-refresh', handleNativeBridgeRefresh);
      el.removeEventListener('touchstart', handleTouchStart as EventListener);
      el.removeEventListener('touchmove', handleTouchMove as EventListener);
      el.removeEventListener('touchend', handleTouchEnd as EventListener);
      window.removeEventListener('touchstart', handleTouchStart as EventListener);
      window.removeEventListener('touchmove', handleTouchMove as EventListener);
      window.removeEventListener('touchend', handleTouchEnd as EventListener);
    };
  }, [containerId, pullDistance, isRefreshing, refreshAllData]);

  const showIndicator = pullDistance > 14 || isRefreshing;
  const isTriggered = pullDistance >= THRESHOLD || isRefreshing;

  return (
    <div className="relative w-full">
      {/* Clean Native Minimalist Pull Spinner (No text banners or header mentions) */}
      {showIndicator && (
        <div 
          style={{ transform: `translateY(${Math.max(0, pullDistance - 25)}px)` }}
          className="fixed top-12 left-0 right-0 z-40 flex justify-center pointer-events-none transition-transform duration-75 ease-out"
        >
          <div className="w-9 h-9 rounded-full bg-white shadow-md border border-slate-200/90 flex items-center justify-center text-[#00C9A7]">
            <RotateCw className={`w-4 h-4 text-[#00C9A7] ${isTriggered ? 'animate-spin' : ''}`} style={{ transform: `rotate(${pullDistance * 4}deg)` }} />
          </div>
        </div>
      )}

      {children}
    </div>
  );
};
