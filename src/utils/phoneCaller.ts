/**
 * Safely dials a phone number across both Mobile App (React Native WebView) and Web Browsers.
 * - Posts 'CALL_PHONE' message to React Native bridge (for native APK intent handoff).
 * - Triggers telephone protocol so it works instantly on the current installed app, mobile Chrome, Safari, and desktops.
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

  // 2. Trigger telephone call via hidden anchor element click
  try {
    const a = document.createElement('a');
    a.href = telUri;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        document.body.removeChild(a);
      } catch {}
    }, 500);
  } catch (err) {
    // 3. Fallback direct assignment
    window.location.href = telUri;
  }
}
