/**
 * Safely dials a phone number across both Mobile App (React Native WebView) and Web Browsers.
 * - In React Native WebView: posts 'CALL_PHONE' message to trigger native Android Linking.openURL(`tel:${phone}`)
 *   without reloading the webview or triggering splash loading screen.
 * - In Web Browser: sets window.location.href to `tel:${phone}`.
 */
export function dialPhoneNumber(phone: string | number | undefined | null) {
  if (!phone) return;
  const rawStr = String(phone).trim();
  // Keep leading +, digits
  const cleanPhone = rawStr.replace(/[^\d+]/g, '');
  if (!cleanPhone) return;

  const rnw = (window as any).ReactNativeWebView;
  if (rnw && typeof rnw.postMessage === 'function') {
    try {
      rnw.postMessage(
        JSON.stringify({
          type: 'CALL_PHONE',
          phone: cleanPhone,
        })
      );
      return;
    } catch (err) {
      console.warn('[dialPhoneNumber] Bridge message failed, falling back to tel: URI', err);
    }
  }

  // Fallback for regular web browsers
  window.location.href = `tel:${cleanPhone}`;
}

