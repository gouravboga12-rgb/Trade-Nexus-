import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Crosshair, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Navigation, 
  ExternalLink, 
  Building2,
  Check,
  Save,
  Compass
} from 'lucide-react';
import { LeafletGeofenceMap } from '../common/LeafletGeofenceMap';
import { api } from '../../services/api';
import { OfficeSettings } from '../../types';
import { useApp } from '../../context/AppContext';

interface InAppLiveMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  office: OfficeSettings | null;
  onSaved?: (saved: OfficeSettings) => void;
}

export const InAppLiveMapModal: React.FC<InAppLiveMapModalProps> = ({
  isOpen,
  onClose,
  office,
  onSaved,
}) => {
  const { triggerToast } = useApp();

  const [latitude, setLatitude] = useState<number | null>(office?.latitude ?? 17.373359);
  const [longitude, setLongitude] = useState<number | null>(office?.longitude ?? 78.538697);
  const [radiusMeters, setRadiusMeters] = useState<number>(office?.radiusMeters ?? 100);
  const [label, setLabel] = useState<string>(office?.label || 'Trade Nexus Office');
  
  const [deviceLocation, setDeviceLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceFromDevice, setDistanceFromDevice] = useState<number | null>(null);
  const [isVerifyingLocation, setIsVerifyingLocation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when office prop changes
  useEffect(() => {
    if (office) {
      if (office.latitude != null) setLatitude(office.latitude);
      if (office.longitude != null) setLongitude(office.longitude);
      if (office.radiusMeters) setRadiusMeters(office.radiusMeters);
      if (office.label) setLabel(office.label);
    }
  }, [office]);

  // Read device location
  useEffect(() => {
    if (isOpen && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDeviceLocation({
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
          });
        },
        () => {},
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
      );
    }
  }, [isOpen]);

  // Calculate real-time distance
  useEffect(() => {
    if (deviceLocation && latitude != null && longitude != null) {
      const R = 6371000;
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const dLat = toRad(latitude - deviceLocation.lat);
      const dLng = toRad(longitude - deviceLocation.lng);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(deviceLocation.lat)) * Math.cos(toRad(latitude)) * Math.sin(dLng / 2) ** 2;
      const d = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
      setDistanceFromDevice(d);
    } else {
      setDistanceFromDevice(null);
    }
  }, [deviceLocation, latitude, longitude]);

  if (!isOpen) return null;

  // Handle pin movement on map
  const handleLocationChange = async (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);

    try {
      const addr = await api.reverseGeocode(lat, lng);
      if (addr) setLabel(addr);
    } catch {
      // Ignore background error
    }
  };

  // Re-verify device GPS
  const handleVerifyLocation = () => {
    setIsVerifyingLocation(true);
    if (!navigator.geolocation) {
      triggerToast('Geolocation not supported by browser');
      setIsVerifyingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setDeviceLocation({ lat, lng });
        setIsVerifyingLocation(false);
        triggerToast(`✓ Live device GPS verified! (±${Math.round(pos.coords.accuracy)}m)`);
      },
      () => {
        navigator.geolocation.getCurrentPosition(
          (pos2) => {
            const lat = Number(pos2.coords.latitude.toFixed(6));
            const lng = Number(pos2.coords.longitude.toFixed(6));
            setDeviceLocation({ lat, lng });
            setIsVerifyingLocation(false);
            triggerToast('✓ Live device location verified via network');
          },
          (err) => {
            setIsVerifyingLocation(false);
            triggerToast(`✗ Could not read location: ${err.message || 'Permission denied'}`);
          },
          { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
        );
      },
      { enableHighAccuracy: true, timeout: 4000, maximumAge: 0 }
    );
  };

  // Save changes if pin was modified
  const handleSaveLocation = async () => {
    if (latitude == null || longitude == null) return;
    setIsSaving(true);
    try {
      const saved = await api.updateOffice({
        label: label.trim(),
        latitude,
        longitude,
        radiusMeters,
      });
      if (onSaved) onSaved(saved);
      triggerToast(`✓ Office location saved! Perimeter: ${saved.radiusMeters}m`);
      onClose();
    } catch (err: any) {
      triggerToast(`✗ Error saving: ${err.message || 'Failed'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-hidden animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-6xl h-[94vh] sm:h-[92vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-5 border-b border-slate-100 bg-slate-50/95 flex-shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-display font-black text-sm sm:text-base text-[#0A2540] truncate max-w-[150px] sm:max-w-md">
                  In-App Live Map
                </h3>
                <span className="text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {radiusMeters}m Geofence
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate max-w-[200px] sm:max-w-lg mt-0.5">
                {label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {latitude != null && longitude != null && (
              <a
                href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-1 text-xs font-bold text-[#00A88B] hover:text-[#0A2540] bg-[#E6FAF6] px-3 py-1.5 rounded-xl border border-[#00C9A7]/40 transition-colors shadow-2xs"
              >
                <span>Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors shadow-2xs cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Real-time Distance Status Strip */}
        <div className="bg-[#E6FAF6] border-b border-[#00C9A7]/30 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${
              distanceFromDevice != null
                ? distanceFromDevice <= radiusMeters
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-amber-500'
                : 'bg-slate-400'
            }`} />
            <span className="font-bold text-[#0A2540]">
              {distanceFromDevice != null ? (
                distanceFromDevice <= radiusMeters ? (
                  <span className="text-emerald-800">
                    ✓ Your device is inside the perimeter ({distanceFromDevice}m away from pin) — Punch-in allowed
                  </span>
                ) : (
                  <span className="text-amber-800">
                    ⚠ Your device is outside perimeter ({distanceFromDevice >= 1000 ? `${(distanceFromDevice/1000).toFixed(1)} km` : `${distanceFromDevice}m`} away) — Punch-in blocked
                  </span>
                )
              ) : (
                <span className="text-slate-600">Verifying live device position…</span>
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={handleVerifyLocation}
            disabled={isVerifyingLocation}
            className="self-start sm:self-auto flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-[#00C9A7] text-[#00A88B] font-bold text-[11px] px-3 py-1 rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Crosshair className={`w-3.5 h-3.5 ${isVerifyingLocation ? 'animate-spin' : ''}`} />
            <span>{isVerifyingLocation ? 'Verifying…' : 'Re-verify GPS'}</span>
          </button>
        </div>

        {/* Full Interactive Leaflet Map Area */}
        <div className="flex-1 w-full h-full relative overflow-hidden bg-slate-100">
          <LeafletGeofenceMap
            latitude={latitude}
            longitude={longitude}
            radiusMeters={radiusMeters}
            deviceLocation={deviceLocation}
            onLocationChange={handleLocationChange}
            isEditable={true}
            height="100%"
            className="w-full h-full rounded-none border-0"
          />
        </div>

        {/* Footer Action Bar */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 flex-shrink-0">
          <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">
            <span>Drag marker or tap map to adjust office coordinates.</span>
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold text-xs transition-all cursor-pointer text-center"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleSaveLocation}
              disabled={isSaving}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs px-5 py-2 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving…' : 'Save Location'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
