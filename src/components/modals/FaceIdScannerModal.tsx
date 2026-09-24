import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useCheckInCapture } from '../../hooks/useCheckInCapture';
import { 
  X, 
  Camera, 
  CheckCircle2, 
  MapPin, 
  AlertTriangle, 
  LogOut, 
  MapPinOff, 
  ShieldAlert,
  Compass
} from 'lucide-react';
import { api } from '../../services/api';
import { OfficeSettings } from '../../types';

export const FaceIdScannerModal: React.FC = () => {
  const {
    isFaceIdModalOpen,
    setIsFaceIdModalOpen,
    faceIdModalMode,
    profile,
    recordCheckIn,
    recordCheckOut,
    triggerToast,
  } = useApp();

  const { videoRef, isCameraOn, cameraError, startCamera, stopCamera, capture } = useCheckInCapture();

  const [phase, setPhase] = useState<'IDLE' | 'CAPTURING' | 'DONE'>('IDLE');
  const [note, setNote] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Office & Geofence states
  const [office, setOffice] = useState<OfficeSettings | null>(null);
  const [checkingLocation, setCheckingLocation] = useState(true);
  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distanceToOffice, setDistanceToOffice] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const isCheckOut = faceIdModalMode === 'CHECK_OUT';

  // Haversine formula to compute distance in meters
  const computeDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  // 1. Fetch office settings and user's GPS when modal opens
  useEffect(() => {
    if (isFaceIdModalOpen) {
      setPhase('IDLE');
      setNote(null);
      setErrorMessage(null);
      setCheckingLocation(true);
      setGeoError(null);
      void startCamera();

      // Fetch office settings from database
      api.getOffice()
        .then((off) => {
          setOffice(off);
        })
        .catch(() => setOffice(null));

      // Query live location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            };
            setCurrentCoords(coords);
            setCheckingLocation(false);
          },
          (err) => {
            setGeoError(
              err.code === 1
                ? 'Location permission was declined. Please allow location access to verify office presence.'
                : 'Could not read device GPS coordinates.'
            );
            setCheckingLocation(false);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        setGeoError('This device does not support GPS geolocation.');
        setCheckingLocation(false);
      }
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isFaceIdModalOpen, startCamera, stopCamera]);

  // 2. Evaluate distance against office settings
  useEffect(() => {
    if (office?.latitude != null && office?.longitude != null && currentCoords) {
      const dist = computeDistanceMeters(
        currentCoords.latitude,
        currentCoords.longitude,
        office.latitude,
        office.longitude
      );
      setDistanceToOffice(dist);
    } else {
      setDistanceToOffice(null);
    }
  }, [office, currentCoords]);

  if (!isFaceIdModalOpen) return null;

  const close = () => {
    stopCamera();
    setIsFaceIdModalOpen(false);
  };

  // Geofence rules:
  // Punch-in is blocked if office is configured AND distance > radiusMeters (e.g. 300m)
  const isOfficeConfigured = office?.latitude != null && office?.longitude != null;
  const radius = office?.radiusMeters || 300;
  const isOutOfBounds = !isCheckOut && isOfficeConfigured && distanceToOffice != null && distanceToOffice > radius;
  const isLocationDenied = !isCheckOut && isOfficeConfigured && geoError != null;

  const handleCapture = async () => {
    if (isOutOfBounds) {
      triggerToast('✗ Cannot punch in: You are outside the office perimeter.');
      return;
    }

    setPhase('CAPTURING');
    setNote(null);
    setErrorMessage(null);

    try {
      const result = await capture();

      if (isCheckOut) {
        await recordCheckOut({
          photo: result.photo,
          latitude: result.latitude ?? currentCoords?.latitude ?? null,
          longitude: result.longitude ?? currentCoords?.longitude ?? null,
        });
      } else {
        await recordCheckIn({
          photo: result.photo,
          latitude: result.latitude ?? currentCoords?.latitude ?? null,
          longitude: result.longitude ?? currentCoords?.longitude ?? null,
        });
      }

      setNote(result.locationError);
      setPhase('DONE');
      stopCamera();
      setTimeout(close, 1800);
    } catch (err: any) {
      setPhase('IDLE');
      setErrorMessage(err.message || 'Check-in failed');
    }
  };

  const distanceFormatted = distanceToOffice != null 
    ? (distanceToOffice >= 1000 ? `${(distanceToOffice / 1000).toFixed(1)} km` : `${distanceToOffice}m`)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-200 animate-in slide-in-from-bottom duration-200 max-h-[95vh] overflow-y-auto">

        {/* 1. Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isCheckOut ? 'bg-rose-50 text-rose-600' : 'bg-[#E6FAF6] text-[#00C9A7]'}`}>
              {isCheckOut ? <LogOut className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-display font-black text-base text-[#0A2540]">
                {isCheckOut ? 'Face ID Punch Out' : 'Face ID Punch In'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {isCheckOut ? 'Verify face to end your shift' : 'Face verification + 300m GPS perimeter check'}
              </p>
            </div>
          </div>
          <button
            onClick={close}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Geofence Perimeter Live Banner */}
        {!isCheckOut && (
          <div className="mt-3">
            {checkingLocation ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 flex items-center gap-2 text-slate-500 text-xs">
                <Compass className="w-4 h-4 animate-spin text-[#00A88B]" />
                <span>Checking your distance from office…</span>
              </div>
            ) : isOutOfBounds ? (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-start gap-2.5 text-rose-800 animate-in fade-in">
                <MapPinOff className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <strong className="block font-bold">Outside Office Perimeter ({distanceFormatted} away)</strong>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    Attendance can only be marked within <strong>{radius}m</strong> of {office?.label || 'the office'}. You are currently too far away to punch in.
                  </p>
                </div>
              </div>
            ) : isLocationDenied ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2.5 text-amber-800 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="block font-bold">Location Permission Required</strong>
                  <p className="text-[11px] text-amber-700 mt-0.5">{geoError}</p>
                </div>
              </div>
            ) : isOfficeConfigured && distanceToOffice != null ? (
              <div className="bg-[#E6FAF6] border border-[#00C9A7]/40 rounded-2xl p-2.5 flex items-center justify-between text-xs text-[#00A88B]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="font-bold">At Office ({distanceFormatted} from center)</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  Allowed &lt; {radius}m
                </span>
              </div>
            ) : null}
          </div>
        )}

        {/* 3. Live Camera View */}
        <div className="my-4 relative aspect-[4/3] rounded-3xl overflow-hidden bg-slate-900 flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover ${isCameraOn ? '' : 'opacity-0'}`}
          />

          {!isCameraOn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <Camera className="w-8 h-8 text-slate-500" />
              <p className="text-xs text-slate-300 font-semibold">
                {cameraError || 'Starting camera…'}
              </p>
              {cameraError && (
                <button
                  onClick={() => void startCamera()}
                  className="mt-1 text-[11px] font-bold text-[#00C9A7] underline cursor-pointer"
                >
                  Try again
                </button>
              )}
            </div>
          )}

          {isCameraOn && phase === 'IDLE' && (
            <div className={`absolute inset-6 border-2 border-dashed ${
              isOutOfBounds 
                ? 'border-rose-400/80' 
                : isCheckOut 
                ? 'border-rose-400/70' 
                : 'border-[#00C9A7]/70'
            } rounded-[28px] pointer-events-none animate-pulse`} />
          )}

          {phase === 'DONE' && (
            <div className="absolute inset-0 bg-emerald-600/90 flex flex-col items-center justify-center gap-2 text-white animate-in zoom-in-95">
              <CheckCircle2 className="w-12 h-12" />
              <span className="font-display font-black text-base">
                {isCheckOut ? 'Punched Out Successfully' : 'Punched In Successfully'}
              </span>
              <span className="text-xs text-emerald-100 font-mono">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>

        {/* 4. Guidance / Error Feedback */}
        <div className="space-y-2 text-center mb-4">
          {errorMessage && (
            <p className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 flex items-center gap-1.5 justify-center">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </p>
          )}

          <p className="text-xs font-semibold text-slate-600">
            {phase === 'IDLE' && (
              isOutOfBounds
                ? 'You are not within the office boundary.'
                : `Look directly at the camera, then tap ${isCheckOut ? 'Punch Out' : 'Punch In'}.`
            )}
            {phase === 'CAPTURING' && 'Verifying face and recording coordinates…'}
            {phase === 'DONE' && `Attendance recorded for ${profile.name || 'you'}.`}
          </p>

          {note && (
            <p className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-1.5 justify-center">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{note}</span>
            </p>
          )}

          {phase === 'IDLE' && (
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 justify-center font-medium">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Selfie photo and location are strictly private (Admin view only).</span>
            </p>
          )}
        </div>

        {/* 5. Action Button */}
        <div>
          <button
            onClick={handleCapture}
            disabled={phase !== 'IDLE' || isOutOfBounds || isLocationDenied || !isCameraOn}
            className={`w-full py-3.5 rounded-2xl font-display font-black text-sm shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
              isOutOfBounds
                ? 'bg-rose-500 text-white'
                : isCheckOut
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/25'
                : 'bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] shadow-[#00C9A7]/25'
            }`}
          >
            {isCheckOut ? <LogOut className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
            <span>
              {phase === 'CAPTURING'
                ? 'Verifying…'
                : isOutOfBounds
                ? `Blocked: Outside Office (${distanceFormatted})`
                : isLocationDenied
                ? 'Location Required'
                : isCheckOut
                ? 'Scan Face & Punch Out'
                : 'Scan Face & Punch In'}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
