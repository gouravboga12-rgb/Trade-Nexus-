import { useCallback, useRef, useState } from 'react';

export interface CaptureResult {
  /** Photo of the person, taken at check-in. */
  photo: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Why the location is missing, when it is. */
  locationError: string | null;
}

/**
 * Takes the two pieces of proof a check-in needs: a photo from the camera and
 * a position from the device.
 *
 * The browser asks the employee for permission each time, and they may refuse.
 * A refusal never blocks the check-in — the record is simply saved without that
 * piece, and Admin sees it marked as not shared. Blocking would mean a phone
 * setting could stop someone working.
 */
export function useCheckInCapture() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          typeof window !== 'undefined' && window.isSecureContext === false
            ? 'Camera requires a secure HTTPS connection. Please access Trade Nexus via HTTPS.'
            : 'Camera access is not supported on this browser or device.'
        );
        setIsCameraOn(false);
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraOn(true);
      return true;
    } catch (err) {
      const name = (err as Error).name;
      setCameraError(
        name === 'NotAllowedError'
          ? 'Camera permission was declined. Allow it in your browser to check in with a photo.'
          : name === 'NotFoundError'
          ? 'No camera found on this device.'
          : 'Could not start the camera.'
      );
      setIsCameraOn(false);
      return false;
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraOn(false);
  }, []);

  /** Grab a still from the live camera as a compressed JPEG. */
  const takePhoto = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    // 0.7 keeps the file small enough to store alongside the record
    return canvas.toDataURL('image/jpeg', 0.7);
  }, []);

  const getLocation = useCallback(
    () =>
      new Promise<{ latitude: number | null; longitude: number | null; error: string | null }>(
        (resolve) => {
          if (!navigator.geolocation) {
            resolve({ latitude: null, longitude: null, error: 'This device cannot report a location.' });
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (pos) =>
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                error: null,
              }),
            (err) =>
              resolve({
                latitude: null,
                longitude: null,
                error:
                  err.code === err.PERMISSION_DENIED
                    ? 'Location permission was declined.'
                    : 'Could not read your location.',
              }),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        }
      ),
    []
  );

  /** Photo and location together — what a check-in submits. */
  const capture = useCallback(async (): Promise<CaptureResult> => {
    const photo = takePhoto();
    const loc = await getLocation();
    return {
      photo,
      latitude: loc.latitude,
      longitude: loc.longitude,
      locationError: loc.error,
    };
  }, [takePhoto, getLocation]);

  return { videoRef, isCameraOn, cameraError, startCamera, stopCamera, capture };
}
