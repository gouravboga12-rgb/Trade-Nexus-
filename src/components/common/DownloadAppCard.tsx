import React, { useState, useEffect } from 'react';
import { Download, X, Share2, PlusSquare } from 'lucide-react';

interface DownloadAppCardProps {
  className?: string;
}

/**
 * Detects whether the user is currently inside the compiled native app (React Native WebView)
 * or already running as an installed standalone PWA. In that environment, the install option
 * is suppressed completely as requested.
 */
function isInsideAppEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // 1. React Native WebView native bridge injected on window
    if (Boolean((window as any).ReactNativeWebView)) return true;
    // 2. Standalone display mode (installed PWA)
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
    if ((window.navigator as any).standalone === true) return true;
    // 3. User agent inspection for WebView signatures
    const ua = (window.navigator?.userAgent || '').toLowerCase();
    if (ua.includes('reactnativewebview') || (ua.includes('wv') && ua.includes('android'))) return true;
  } catch {}
  return false;
}

export const DownloadAppCard: React.FC<DownloadAppCardProps> = ({ className = '' }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Immediately hide inside the mobile app or if already installed as standalone
    if (isInsideAppEnvironment()) {
      setIsInstalled(true);
      return;
    }

    try {
      if (sessionStorage.getItem('tnx_dismiss_app_card') === 'true') {
        setIsDismissed(true);
      }
    } catch {}

    // Detect iOS devices (iPhone, iPad, iPod)
    const userAgent = (window.navigator.userAgent || '').toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIos(isAppleDevice);

    // Capture standard Chromium / Android beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Track successful PWA install
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('tnx_dismiss_app_card', 'true');
    } catch {}
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.warn('Install prompt error:', err);
        setShowInfoModal(true);
      }
    } else {
      setShowInfoModal(true);
    }
  };

  // Completely hidden when inside mobile app or already installed/dismissed
  if (isInstalled || isDismissed) return null;

  return (
    <>
      <div className={`mt-3 w-full bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs transition-all animate-in fade-in slide-in-from-bottom duration-300 ${className}`}>
        {/* Header with App Logo and Dismiss Button */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            {/* Official App Logo Icon */}
            <div className="w-8 h-8 rounded-xl bg-[#0A2540] p-1 flex items-center justify-center shadow-2xs border border-[#00C9A7]/40 flex-shrink-0">
              <img 
                src="/pwa-192.png" 
                alt="Trade Nexus" 
                className="w-full h-full object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo-icon.png';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-black text-[#0A2540] tracking-tight">
                  Install Page as App
                </h4>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-[#E6FAF6] text-[#00A88B] rounded-md">
                  Web &amp; Mobile
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                Install Trade Nexus directly on your device
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Clean Install Action Button */}
        <button
          type="button"
          onClick={handleInstallClick}
          className="w-full py-2.5 px-4 rounded-xl bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs shadow-md shadow-[#00C9A7]/20 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Install Page as App</span>
        </button>
      </div>

      {/* Guided Installation Modal (for iOS or browsers requiring menu tap) */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#0A2540] p-1 flex items-center justify-center border border-[#00C9A7]/40">
                  <img src="/pwa-192.png" alt="App Icon" className="w-full h-full object-contain rounded-lg" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#0A2540]">Install Trade Nexus</h3>
                  <p className="text-[10px] text-slate-400">Add to your device home screen</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              {isIos ? (
                <>
                  <p className="text-xs text-slate-600 font-medium">
                    To install on your <strong>iPhone or iPad</strong>:
                  </p>
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 space-y-2.5 text-xs text-slate-700">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#0A2540] text-white flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">
                        1
                      </div>
                      <p>Tap the <strong>Share</strong> icon <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" /> at the bottom of Safari.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#0A2540] text-white flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">
                        2
                      </div>
                      <p>Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-slate-700" />.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#0A2540] text-white flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">
                        3
                      </div>
                      <p>Tap <strong>Add</strong> in the top-right corner to place Trade Nexus on your home screen.</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-600 font-medium">
                    To install this page as an app on Chrome or your browser:
                  </p>
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 space-y-2.5 text-xs text-slate-700">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#0A2540] text-white flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">
                        1
                      </div>
                      <p>Click the <strong>menu icon (⋮)</strong> in Chrome or the install icon in the address bar.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#0A2540] text-white flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">
                        2
                      </div>
                      <p>Select <strong>"Install page as app..."</strong> or <strong>"Install Trade Nexus"</strong>.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#0A2540] text-white flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">
                        3
                      </div>
                      <p>Confirm to add the standalone app to your desktop or device.</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowInfoModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
