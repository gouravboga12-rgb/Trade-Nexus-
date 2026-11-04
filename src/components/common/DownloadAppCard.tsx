import React, { useState, useEffect } from 'react';
import { Download, X, Share2, PlusSquare, Smartphone, CheckCircle2, ArrowRight } from 'lucide-react';

interface DownloadAppCardProps {
  className?: string;
}

export const DownloadAppCard: React.FC<DownloadAppCardProps> = ({ className = '' }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [showIosModal, setShowIosModal] = useState<boolean>(false);

  useEffect(() => {
    // Check if dismissed in this session
    if (typeof window !== 'undefined') {
      try {
        if (sessionStorage.getItem('tnx_dismiss_app_card') === 'true') {
          setIsDismissed(true);
        }
      } catch {}

      // Check if already running as standalone PWA
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      if (isStandalone) {
        setIsInstalled(true);
      }

      // Detect iOS devices (iPhone, iPad, iPod)
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isAppleDevice = /iphone|ipad|ipod/.test(userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      setIsIos(isAppleDevice);
    }

    // Listen for PWA install prompt on Android / Chromium
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
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
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosModal(true);
    } else {
      // Direct prompt fallback: offer both PWA installation guidance and direct APK download
      setShowIosModal(true);
    }
  };

  if (isDismissed || isInstalled) return null;

  return (
    <>
      <div className={`mt-3 w-full bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-sm transition-all animate-in fade-in slide-in-from-bottom duration-300 ${className}`}>
        {/* Header with App Logo and Dismiss X */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            {/* Official App Logo Icon */}
            <div className="w-8 h-8 rounded-xl bg-[#0A2540] p-1 flex items-center justify-center shadow-xs border border-[#00C9A7]/40 flex-shrink-0">
              <img 
                src="/pwa-192.png" 
                alt="Trade Nexus App Icon" 
                className="w-full h-full object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo-icon.png';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-black text-[#0A2540] tracking-tight">
                  Download App
                </h4>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-[#E6FAF6] text-[#00A88B] rounded-md">
                  Android &amp; iOS
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

        {/* Big Action Button (Matching Reference image copy 66.png) */}
        <button
          type="button"
          onClick={handleInstallClick}
          className="w-full py-2.5 px-4 rounded-xl bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs shadow-md shadow-[#00C9A7]/25 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Now</span>
        </button>

        {/* Small APK Direct Download Link for Android Users */}
        <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-slate-400 font-medium">
          <span>Or get the</span>
          <a
            href="/TradeNexus.apk"
            download="TradeNexus.apk"
            className="text-[#00A88B] hover:text-[#0A2540] font-bold underline transition-colors"
          >
            Direct Android APK (.apk)
          </a>
        </div>
      </div>

      {/* iOS / Device Installation Modal */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#0A2540] p-1 flex items-center justify-center border border-[#00C9A7]/40">
                  <img src="/pwa-192.png" alt="App Icon" className="w-full h-full object-contain rounded-lg" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#0A2540]">Install Trade Nexus</h3>
                  <p className="text-[10px] text-slate-400">Available on iOS &amp; Android</p>
                </div>
              </div>
              <button
                onClick={() => setShowIosModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
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
                      <p>Tap <strong>Add</strong> in the top-right corner to place the app on your home screen.</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-600 font-medium">
                    Install as an app on your phone, tablet, or desktop:
                  </p>
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 space-y-2 text-xs text-slate-700">
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#00C9A7] flex-shrink-0" />
                      <span>Opens in dedicated standalone app window.</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#00C9A7] flex-shrink-0" />
                      <span>Instant launch with official Trade Nexus app icon.</span>
                    </p>
                  </div>

                  <a
                    href="/TradeNexus.apk"
                    download="TradeNexus.apk"
                    className="w-full py-2.5 px-3 rounded-xl bg-[#0A2540] text-white hover:bg-[#00C9A7] hover:text-[#0A2540] font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs block text-center"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Native Android APK (102 MB)</span>
                  </a>
                </>
              )}
            </div>

            <button
              onClick={() => setShowIosModal(false)}
              className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

