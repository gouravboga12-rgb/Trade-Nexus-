/**
 * Safely dials a phone number across both Mobile App (React Native WebView) and Web Browsers.
 * - Posts 'CALL_PHONE' message to React Native bridge (for native APK intent handoff).
 * - In WebViews, triggers tel: via an invisible sub-frame iframe so the top-level document
 *   never navigates, completely eliminating the flash splash screen overlay.
 */
export function dialPhoneNumber(phone: string | number | undefined | null) {
  if (!phone) return;
  const rawStr = String(phone).trim();
  // Keep leading +, digits
  const cleanPhone = rawStr.replace(/[^\d+]/g, '');
  if (!cleanPhone) return;

  const telUri = `tel:${cleanPhone}`;

  // 1. Post message to React Native WebView bridge (for native app shell)
  const rnw = (window as any).ReactNativeWebView;
  if (rnw && typeof rnw.postMessage === 'function') {
    try {
      rnw.postMessage(
        JSON.stringify({
          type: 'CALL_PHONE',
          phone: cleanPhone,
        })
      );
    } catch (err) {
      console.warn('[dialPhoneNumber] Bridge message failed:', err);
    }
  }

  // 2. Trigger tel: URI via hidden iframe so that in WebViews,
  // the main document never navigates (preventing splash loading screen overlay),
  // while the OS interceptor triggers Android's dialer intent.
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    iframe.src = telUri;
    document.body.appendChild(iframe);
    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch {}
    }, 1500);
  } catch (err) {
    // Fallback for regular web browsers
    window.location.href = telUri;
  }
}
