import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Crosshair, 
  Save, 
  ShieldCheck, 
  Navigation, 
  Layers, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink,
  Building2,
  Compass
} from 'lucide-react';
import { api } from '../../services/api';
import { OfficeSettings } from '../../types';
import { useApp } from '../../context/AppContext';

interface GeofenceLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (saved: OfficeSettings) => void;
}

export const GeofenceLocationModal: React.FC<GeofenceLocationModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const { triggerToast } = useApp();

  const [office, setOffice] = useState<OfficeSettings | null>(null);
  const [label, setLabel] = useState('Trade Nexus Corporate HQ');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [radiusMeters, setRadiusMeters] = useState<number>(300);
  const [mapStyle, setMapStyle] = useState<'streets-v12' | 'satellite-streets-v12'>('streets-v12');

  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deviceLocation, setDeviceLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceFromDevice, setDistanceFromDevice] = useState<number | null>(null);

  const mapboxToken = (import.meta as any).env?.VITE_MAPBOX_TOKEN || '';

  // Load office settings when opened
  useEffect(() => {
    if (isOpen) {
      api.getOffice()
        .then((data) => {
          if (data) {
            setOffice(data);
            setLabel(data.label || 'Trade Nexus Corporate HQ');
            setLatitude(data.latitude ?? null);
            setLongitude(data.longitude ?? null);
            setRadiusMeters(data.radiusMeters || 300);
          }
        })
        .catch(() => {
          // Defaults if not saved yet
          setRadiusMeters(300);
        });

      // Also read current device position for distance reference
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setDeviceLocation({
              lat: Number(pos.coords.latitude.toFixed(6)),
              lng: Number(pos.coords.longitude.toFixed(6)),
            });
          },
          () => {},
          { enableHighAccuracy: true, timeout: 8000 }
        );
      }
    }
  }, [isOpen]);

  // Calculate distance between current device and office preview
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

  // Live GPS Fetcher
  const handleFetchLiveLocation = () => {
    if (!navigator.geolocation) {
      triggerToast('✗ Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        setLocating(false);
        triggerToast('✓ Live office GPS coordinates captured!');
      },
      (err) => {
        setLocating(false);
        triggerToast(`✗ Failed to get location: ${err.message || 'Permission denied'}`);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Save Office Location permanently
  const handleSave = async () => {
    if (!label.trim()) {
      triggerToast('✗ Please enter an office name / address');
      return;
    }
    if (latitude == null || longitude == null) {
      triggerToast('✗ Please fetch or enter office Latitude & Longitude');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<OfficeSettings> = {
        label: label.trim(),
        latitude,
        longitude,
        radiusMeters: Math.max(50, Math.min(2000, radiusMeters)),
      };

      const saved = await api.updateOffice(payload);
      setOffice(saved);
      if (onSaved) onSaved(saved);
      triggerToast(`✓ Office location saved! Allowed punch perimeter: ${saved.radiusMeters}m`);
      onClose();
    } catch (err: any) {
      triggerToast(`✗ Could not save office location: ${err.message || 'Error'}`);
    } finally {
      setSaving(false);
    }
  };

  // Mapbox static map preview URL
  const mapUrl = (latitude != null && longitude != null && mapboxToken)
    ? `https://api.mapbox.com/styles/v1/mapbox/${mapStyle}/static/pin-l-building+00C9A7(${longitude},${latitude})/${longitude},${latitude},15.5,0/640x300@2x?access_token=${mapboxToken}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto flex flex-col max-h-[92vh]">
        
        {/* 1. Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-black text-base text-[#0A2540]">
                  Geofence & Office Location
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Strict Perimeter
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Set office coordinates & punch-in boundary for all employees
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors shadow-2xs cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Scrollable Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">

          {/* Location status alert banner */}
          {latitude == null || longitude == null ? (
            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 flex items-start gap-2.5 text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-[11px]">Office location is not configured yet</p>
                <p className="text-[10px] text-amber-700 mt-0.5">
                  Employees cannot be checked for office presence until you record the office GPS coordinates. Click <strong>Fetch Live Location</strong> below when in the office.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-[#E6FAF6] border border-[#00C9A7]/30 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#00A88B]">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span className="font-bold text-[11px]">
                  Geofence Active: Within {radiusMeters}m of office
                </span>
              </div>
              {distanceFromDevice != null && (
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  distanceFromDevice <= radiusMeters 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  Your device: {distanceFromDevice >= 1000 ? `${(distanceFromDevice/1000).toFixed(1)}km` : `${distanceFromDevice}m`} away
                </span>
              )}
            </div>
          )}

          {/* Quick Action: Fetch Live Location Button */}
          <div className="bg-gradient-to-r from-slate-900 to-[#0A2540] text-white p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-[#00C9A7] font-bold text-[11px] uppercase tracking-wider">
                <Compass className="w-3.5 h-3.5" />
                <span>Instant Auto-Detection</span>
              </div>
              <p className="text-xs text-slate-200 font-medium">
                Are you currently at the office? Capture the exact GPS coordinates instantly.
              </p>
            </div>
            <button
              type="button"
              onClick={handleFetchLiveLocation}
              disabled={locating}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#00C9A7] hover:bg-[#00B4D8] disabled:opacity-50 text-[#0A2540] font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Crosshair className={`w-4 h-4 ${locating ? 'animate-spin' : ''}`} />
              <span>{locating ? 'Reading GPS…' : 'Fetch Live Location'}</span>
            </button>
          </div>

          {/* Mapbox Visual Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-[#00A88B]" />
                <span>Mapbox Visual Map Preview</span>
              </label>

              {latitude != null && longitude != null && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMapStyle(mapStyle === 'streets-v12' ? 'satellite-streets-v12' : 'streets-v12')}
                    className="text-[10px] font-bold text-slate-600 hover:text-[#0A2540] underline cursor-pointer"
                  >
                    Switch to {mapStyle === 'streets-v12' ? 'Satellite' : 'Street'} View
                  </button>
                  <a
                    href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-bold text-[#00A88B] hover:underline flex items-center gap-0.5"
                  >
                    <span>Google Maps</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              )}
            </div>

            <div className="relative aspect-[21/9] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shadow-inner group">
              {mapUrl ? (
                <>
                  <img
                    src={mapUrl}
                    alt="Office Mapbox Geofence"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Radar Radius Ring Overlay Simulation */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative flex items-center justify-center">
                      <div className="w-24 h-24 rounded-full border-2 border-[#00C9A7] bg-[#00C9A7]/15 animate-ping" />
                      <div className="absolute w-20 h-20 rounded-full border-2 border-dashed border-[#00C9A7]/80 bg-[#00C9A7]/20 flex items-center justify-center">
                        <span className="text-[9px] font-mono font-bold text-[#0A2540] bg-white/90 px-1.5 py-0.5 rounded shadow-xs">
                          {radiusMeters}m Radius
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center p-4 text-slate-400 space-y-1">
                  <MapPin className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-semibold text-xs text-slate-500">No coordinates selected</p>
                  <p className="text-[10px]">Fetch your live location or enter coordinates below to load the map preview.</p>
                </div>
              )}
            </div>
          </div>

          {/* Form Fields: Name / Address */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Office Name / Street Address
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Trade Nexus HQ, Financial District, Hyderabad"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
              />
            </div>
          </div>

          {/* Latitude & Longitude Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Latitude (GPS)
              </label>
              <input
                type="number"
                step="0.000001"
                value={latitude ?? ''}
                onChange={(e) => setLatitude(e.target.value ? Number(e.target.value) : null)}
                placeholder="17.314000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-[#00C9A7]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Longitude (GPS)
              </label>
              <input
                type="number"
                step="0.000001"
                value={longitude ?? ''}
                onChange={(e) => setLongitude(e.target.value ? Number(e.target.value) : null)}
                placeholder="78.529000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-[#00C9A7]"
              />
            </div>
          </div>

          {/* Perimeter Radius Settings & Presets */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Allowed Punch-In Perimeter Radius
              </label>
              <span className="font-mono font-black text-sm text-[#00A88B]">
                {radiusMeters} meters
              </span>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1.5">
              {[100, 200, 300, 500, 1000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setRadiusMeters(preset)}
                  className={`flex-1 py-1.5 rounded-xl font-mono text-[10px] font-bold transition-all cursor-pointer ${
                    radiusMeters === preset
                      ? 'bg-[#0A2540] text-[#00C9A7] shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {preset}m
                </button>
              ))}
            </div>

            {/* Slider */}
            <input
              type="range"
              min={50}
              max={1500}
              step={25}
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(Number(e.target.value))}
              className="w-full accent-[#00C9A7] cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-400 font-mono">
              <span>Strict (50m)</span>
              <span>Recommended (200m - 300m)</span>
              <span>Relaxed (1500m)</span>
            </div>
          </div>

        </div>

        {/* 3. Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500">
            {office?.latitude != null && (
              <span>Last saved: <strong>{office.label}</strong> ({office.radiusMeters}m)</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold text-xs transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || latitude == null || longitude == null}
              className="flex items-center gap-2 bg-[#00C9A7] hover:bg-[#00B4D8] disabled:opacity-50 text-[#0A2540] font-black text-xs px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving…' : 'Save Office Location'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
