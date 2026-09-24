import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Crosshair, 
  Save, 
  Layers, 
  CheckCircle2, 
  ExternalLink,
  Building2,
  Compass,
  Search,
  RefreshCw,
  Check
} from 'lucide-react';
import { api } from '../../services/api';
import { OfficeSettings } from '../../types';
import { useApp } from '../../context/AppContext';
import { InAppLiveMapModal } from './InAppLiveMapModal';

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
  const [radiusMeters, setRadiusMeters] = useState<number>(100);
  const [mapStyle, setMapStyle] = useState<'streets-v12' | 'satellite-streets-v12'>('streets-v12');

  // Dedicated full in-app live map modal
  const [showInAppLiveMap, setShowInAppLiveMap] = useState(false);

  // Status & live locating state
  const [locating, setLocating] = useState(false);
  const [locatingStatus, setLocatingStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deviceLocation, setDeviceLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceFromDevice, setDistanceFromDevice] = useState<number | null>(null);

  // Address search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);

  const mapboxToken = (import.meta as any).env?.VITE_MAPBOX_TOKEN || '';

  // 1. Fetch office settings & device location on modal open
  useEffect(() => {
    if (isOpen) {
      api.getOffice()
        .then((data) => {
          if (data) {
            setOffice(data);
            setLabel(data.label || 'Trade Nexus Corporate HQ');
            setLatitude(data.latitude ?? null);
            setLongitude(data.longitude ?? null);
            setRadiusMeters(data.radiusMeters || 100);
          }
        })
        .catch(() => {
          setRadiusMeters(100);
        });

      if (typeof navigator !== 'undefined' && navigator.geolocation) {
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
    }
  }, [isOpen]);

  // 2. Real-time distance calculation between device and office coordinates
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

  // Multi-tier Live GPS Auto-Detection
  const handleFetchLiveLocation = () => {
    setLocating(true);
    setLocatingStatus('Acquiring live GPS coordinates…');

    const handleSuccess = async (lat: number, lng: number, accuracy?: number) => {
      setLatitude(lat);
      setLongitude(lng);
      setDeviceLocation({ lat, lng });

      const accText = accuracy ? ` (±${Math.round(accuracy)}m)` : '';
      setLocatingStatus(`Resolving street address${accText}…`);
      triggerToast(`✓ Live location captured${accText}! Resolving address…`);

      try {
        const fetchedAddress = await api.reverseGeocode(lat, lng);
        if (fetchedAddress) {
          setLabel(fetchedAddress);
          triggerToast('✓ Real office street address updated!');
        } else {
          setLabel(`Office Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        }
      } catch {
        setLabel(`Office Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      } finally {
        setLocating(false);
        setLocatingStatus(null);
      }
    };

    if (!navigator.geolocation) {
      fallbackToNetworkLocation(handleSuccess);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        handleSuccess(lat, lng, pos.coords.accuracy);
      },
      () => {
        setLocatingStatus('Connecting via network positioning…');
        navigator.geolocation.getCurrentPosition(
          (pos2) => {
            const lat = Number(pos2.coords.latitude.toFixed(6));
            const lng = Number(pos2.coords.longitude.toFixed(6));
            handleSuccess(lat, lng, pos2.coords.accuracy);
          },
          () => {
            fallbackToNetworkLocation(handleSuccess);
          },
          { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
        );
      },
      { enableHighAccuracy: true, timeout: 4000, maximumAge: 0 }
    );
  };

  const fallbackToNetworkLocation = async (
    onSuccess: (lat: number, lng: number) => void
  ) => {
    setLocatingStatus('Reading approximate location from network…');
    try {
      const res = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en');
      if (res.ok) {
        const data = await res.json();
        if (data.latitude && data.longitude) {
          const lat = Number(Number(data.latitude).toFixed(6));
          const lng = Number(Number(data.longitude).toFixed(6));
          triggerToast('📍 Network location detected.');
          onSuccess(lat, lng);
          return;
        }
      }
    } catch {
      // Fallback
    }

    setLocating(false);
    setLocatingStatus(null);
    triggerToast('✗ Please enable browser location permission or use search bar.');
  };

  // Address Search
  const handleSearchAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);

    try {
      const results = await api.searchAddress(searchQuery.trim());
      setSearchResults(results);
      if (!results.length) {
        triggerToast('No locations found. Try adding city name.');
      }
    } catch {
      triggerToast('Could not search address.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (item: { display_name: string; lat: string; lon: string }) => {
    const lat = Number(Number(item.lat).toFixed(6));
    const lng = Number(Number(item.lon).toFixed(6));
    setLatitude(lat);
    setLongitude(lng);
    setLabel(item.display_name);
    setSearchResults([]);
    setSearchQuery('');
    triggerToast('✓ Location selected & coordinates updated!');
  };

  // Save Office Location permanently
  const handleSave = async () => {
    if (!label.trim()) {
      triggerToast('✗ Please enter an office name or address');
      return;
    }
    if (latitude == null || longitude == null) {
      triggerToast('✗ Please capture or enter office Latitude & Longitude');
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
      triggerToast(`✓ Office location saved! Strict punch-in perimeter: ${saved.radiusMeters}m`);
      onClose();
    } catch (err: any) {
      triggerToast(`✗ Could not save office location: ${err.message || 'Error'}`);
    } finally {
      setSaving(false);
    }
  };

  // Mapbox static map preview URL (with OpenStreetMap fallback if token absent)
  const mapUrl = (latitude != null && longitude != null)
    ? (mapboxToken
        ? `https://api.mapbox.com/styles/v1/mapbox/${mapStyle}/static/pin-l-building+00C9A7(${longitude},${latitude})/${longitude},${latitude},15.5,0/640x300@2x?access_token=${mapboxToken}`
        : `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=16&size=640x300&markers=${latitude},${longitude},lightblue1`
      )
    : null;

  const currentOfficeState: OfficeSettings = {
    id: office?.id || 'office-hq',
    label: label.trim(),
    latitude: latitude ?? 17.373359,
    longitude: longitude ?? 78.538697,
    radiusMeters,
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-xl max-h-[94vh] sm:max-h-[92vh] my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
          
          {/* 1. Header (Mobile-optimized layout: no word breaks, clear touch-friendly action banner) */}
          <div className="p-3.5 sm:p-5 border-b border-slate-100 bg-slate-50/95 flex-shrink-0">
            {/* Top row: Icon + Title + Strict Pill + Close Button */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-display font-black text-sm sm:text-base text-[#0A2540]">
                      Geofence & Office Location
                    </h3>
                    <span className="text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Strict Perimeter
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
                    Set office coordinates, verify live GPS & punch-in boundary
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors shadow-2xs cursor-pointer flex-shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* High-visibility Action Banner: "Open Map in App" (Full-width, thumb-friendly touch target) */}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowInAppLiveMap(true)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-[#0A2540] hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-sm transition-all active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-200 animate-pulse" />
                  <span className="tracking-wide">Open Map in App (Live Point Location)</span>
                </div>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md font-mono flex items-center gap-1">
                  <span>View Live Map</span>
                  <span>→</span>
                </span>
              </button>
            </div>
          </div>

          {/* 2. Scrollable Body */}
          <div className="p-3.5 sm:p-6 overflow-y-auto space-y-3.5 sm:space-y-4 text-xs flex-1">

            {/* Distance & Device Verification Bar */}
            <div className="bg-[#E6FAF6] border border-[#00C9A7]/40 rounded-2xl p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 shadow-2xs">
              <div className="flex items-center gap-2 text-[#00A88B] min-w-0">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 text-emerald-600" />
                <span className="font-bold text-[10px] sm:text-[11px] truncate">
                  {latitude != null && longitude != null
                    ? `Configured Geofence: Within ${radiusMeters}m of office`
                    : 'Office location not yet configured'}
                </span>
              </div>

              {distanceFromDevice != null && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-500 font-medium">Your device:</span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    distanceFromDevice <= radiusMeters 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {distanceFromDevice >= 1000 ? `${(distanceFromDevice/1000).toFixed(1)} km` : `${distanceFromDevice}m`} away
                  </span>
                  {distanceFromDevice <= radiusMeters ? (
                    <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> In Office
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-700 font-bold">Outside Office</span>
                  )}
                </div>
              )}
            </div>

            {/* Instant Live GPS Auto-Detection */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#0A2540] text-white p-3 sm:p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5 text-[#00C9A7] font-bold text-[10px] sm:text-[11px] uppercase tracking-wider">
                  <Compass className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Instant Live GPS Auto-Detection</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-200 font-medium leading-snug">
                  {locatingStatus || 'Click to capture current GPS coordinates and auto-fill address.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleFetchLiveLocation}
                disabled={locating}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#00C9A7] hover:bg-[#00B4D8] disabled:opacity-50 text-[#0A2540] font-black text-xs px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap flex-shrink-0"
              >
                <Crosshair className={`w-4 h-4 ${locating ? 'animate-spin' : ''}`} />
                <span>{locating ? 'Acquiring GPS…' : 'Fetch Live Location'}</span>
              </button>
            </div>

            {/* Interactive Map Preview & Geofence Boundary */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-1 flex-wrap">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#00A88B]" />
                  <span>Map Preview & Geofence</span>
                </label>

                {latitude != null && longitude != null && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setMapStyle(mapStyle === 'streets-v12' ? 'satellite-streets-v12' : 'streets-v12')}
                      className="text-[10px] font-bold text-slate-600 hover:text-[#0A2540] underline cursor-pointer"
                    >
                      {mapStyle === 'streets-v12' ? 'Satellite' : 'Street'}
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

              {/* Map Preview Box (Clickable, opens in-app live map) */}
              <div 
                onClick={() => setShowInAppLiveMap(true)}
                className="relative aspect-[16/9] sm:aspect-[21/9] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shadow-inner group cursor-pointer"
                title="Tap to open full in-app live interactive map"
              >
                {mapUrl ? (
                  <>
                    <img
                      src={mapUrl}
                      alt="Office Geofence Preview"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    {/* Radar Radius Ring Overlay Simulation */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="relative flex items-center justify-center">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-[#00C9A7] bg-[#00C9A7]/15 animate-ping" />
                        <div className="absolute w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-dashed border-[#00C9A7]/80 bg-[#00C9A7]/20 flex items-center justify-center">
                          <span className="text-[9px] font-mono font-bold text-[#0A2540] bg-white/95 px-1.5 py-0.5 rounded shadow-xs">
                            {radiusMeters}m
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Mobile-friendly tap badge */}
                    <div className="absolute bottom-2 right-2 bg-slate-900/85 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-md">
                      <Layers className="w-3.5 h-3.5 text-[#00C9A7]" />
                      <span>Tap for In-App Live Map</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-3 text-slate-400 space-y-1">
                    <MapPin className="w-6 h-6 sm:w-8 sm:h-8 mx-auto text-slate-300" />
                    <p className="font-semibold text-xs text-slate-500">No coordinates selected</p>
                    <p className="text-[10px]">Fetch live location or search below to load map preview.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Search Office Address by Landmark / Street */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Search className="w-3 h-3 text-[#00A88B]" />
                <span>Search Location / Landmark</span>
              </label>
              <form onSubmit={handleSearchAddress} className="flex gap-1.5">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. Meerpet, Uppal, Hyderabad"
                    className="w-full pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-3.5 py-2 bg-[#0A2540] hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1 flex-shrink-0"
                >
                  {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Search</span>}
                </button>
              </form>

              {/* Search Suggestions Dropdown */}
              {searchResults.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 space-y-1 max-h-40 overflow-y-auto animate-in fade-in z-20">
                  {searchResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectSearchResult(item)}
                      className="p-2 hover:bg-[#E6FAF6] rounded-lg cursor-pointer transition-colors text-left flex items-start gap-2 text-xs"
                    >
                      <MapPin className="w-3.5 h-3.5 text-[#00A88B] mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <strong className="block text-slate-800 font-semibold leading-tight truncate">
                          {item.display_name.split(',').slice(0, 2).join(',')}
                        </strong>
                        <span className="text-[10px] text-slate-500 font-normal line-clamp-2">
                          {item.display_name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Fields: Office Name & Street Address */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Office Name / Street Address
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <textarea
                  rows={2}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Trade Nexus HQ, Financial District, Hyderabad"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7] resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* Latitude & Longitude Inputs */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
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
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
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
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                />
              </div>
            </div>

            {/* Perimeter Radius Settings & Presets */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Allowed Punch-In Perimeter
                </label>
                <span className="font-mono font-black text-xs sm:text-sm text-[#00A88B]">
                  {radiusMeters} meters
                </span>
              </div>

              {/* 5 Presets grid: strictly 5 equal columns */}
              <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
                {[50, 100, 200, 300, 500].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRadiusMeters(preset)}
                    className={`py-1.5 sm:py-2 rounded-xl font-mono text-[10px] sm:text-xs font-bold transition-all cursor-pointer text-center ${
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
                className="w-full accent-[#00C9A7] cursor-pointer h-2"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                <span>Strict (50m)</span>
                <span>Recommended (100m-300m)</span>
                <span>Relaxed (1500m)</span>
              </div>
            </div>

          </div>

          {/* 3. Sticky Responsive Footer */}
          <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 flex-shrink-0">
            <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">
              {office?.latitude != null ? (
                <span>Saved: <strong>{office.label}</strong> ({office.radiusMeters}m)</span>
              ) : (
                <span>Not configured yet</span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold text-xs transition-all cursor-pointer text-center"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || latitude == null || longitude == null}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-[#00C9A7] hover:bg-[#00B4D8] disabled:opacity-50 text-[#0A2540] font-black text-xs px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving…' : 'Save Office Location'}</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Dedicated Full In-App Live Map Modal */}
      <InAppLiveMapModal
        isOpen={showInAppLiveMap}
        onClose={() => setShowInAppLiveMap(false)}
        office={currentOfficeState}
        onSaved={(saved) => {
          setOffice(saved);
          if (saved.latitude != null) setLatitude(saved.latitude);
          if (saved.longitude != null) setLongitude(saved.longitude);
          if (saved.radiusMeters) setRadiusMeters(saved.radiusMeters);
          if (saved.label) setLabel(saved.label);
          if (onSaved) onSaved(saved);
        }}
      />
    </>
  );
};
