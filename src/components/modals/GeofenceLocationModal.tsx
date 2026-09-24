import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Crosshair, 
  Save, 
  Layers, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink,
  Building2,
  Compass,
  Maximize2,
  Minimize2,
  Search,
  RefreshCw,
  Navigation,
  Check
} from 'lucide-react';
import { api } from '../../services/api';
import { OfficeSettings } from '../../types';
import { useApp } from '../../context/AppContext';
import { LeafletGeofenceMap } from '../common/LeafletGeofenceMap';

interface GeofenceLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (saved: OfficeSettings) => void;
  initialExpanded?: boolean;
}

export const GeofenceLocationModal: React.FC<GeofenceLocationModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialExpanded = false,
}) => {
  const { triggerToast } = useApp();

  const [office, setOffice] = useState<OfficeSettings | null>(null);
  const [label, setLabel] = useState('Trade Nexus Corporate HQ');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [radiusMeters, setRadiusMeters] = useState<number>(300);
  
  // View controls
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  
  // Geolocation & Status
  const [locating, setLocating] = useState(false);
  const [locatingStatus, setLocatingStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deviceLocation, setDeviceLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceFromDevice, setDistanceFromDevice] = useState<number | null>(null);
  
  // Address Search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);

  // 1. Load office settings & device location when modal opens
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
          setRadiusMeters(300);
        });

      // Quick read of device location in background
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

  // 2. Real-time distance calculation between device and office pin
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

  // Handle marker drag or map click
  const handleLocationChange = async (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);

    // Auto-fetch reverse geocoded address
    try {
      const address = await api.reverseGeocode(lat, lng);
      if (address) {
        setLabel(address);
      }
    } catch {
      // Ignore background error
    }
  };

  // Robust Multi-Tier Live Location Fetcher
  const handleFetchLiveLocation = () => {
    setLocating(true);
    setLocatingStatus('Acquiring live GPS coordinates…');

    const handleSuccess = async (lat: number, lng: number, accuracy?: number) => {
      setLatitude(lat);
      setLongitude(lng);
      setDeviceLocation({ lat, lng });

      const accText = accuracy ? ` (±${Math.round(accuracy)}m)` : '';
      setLocatingStatus(`Fetching full street address${accText}…`);
      triggerToast(`✓ Live location captured${accText}! Resolving address…`);

      try {
        const fetchedAddress = await api.reverseGeocode(lat, lng);
        if (fetchedAddress) {
          setLabel(fetchedAddress);
          triggerToast('✓ Real office street address updated!');
        } else {
          setLabel(`Office Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        }
      } catch {
        setLabel(`Office Pin (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      } finally {
        setLocating(false);
        setLocatingStatus(null);
      }
    };

    if (!navigator.geolocation) {
      fallbackToNetworkLocation(handleSuccess);
      return;
    }

    // Tier 1: Try high accuracy GPS (4s timeout)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        handleSuccess(lat, lng, pos.coords.accuracy);
      },
      (err1) => {
        console.warn('High accuracy geolocation timed out or failed, trying standard accuracy…', err1);
        setLocatingStatus('Connecting via network/Wi-Fi positioning…');

        // Tier 2: Try standard Wi-Fi/Network accuracy (6s timeout)
        navigator.geolocation.getCurrentPosition(
          (pos2) => {
            const lat = Number(pos2.coords.latitude.toFixed(6));
            const lng = Number(pos2.coords.longitude.toFixed(6));
            handleSuccess(lat, lng, pos2.coords.accuracy);
          },
          (err2) => {
            console.warn('Standard geolocation failed, falling back to IP network lookup…', err2);
            fallbackToNetworkLocation(handleSuccess);
          },
          { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
        );
      },
      { enableHighAccuracy: true, timeout: 4000, maximumAge: 0 }
    );
  };

  // Tier 3: Network IP-based location fallback (prevents ever hanging or failing completely)
  const fallbackToNetworkLocation = async (
    onSuccess: (lat: number, lng: number, acc?: number) => void
  ) => {
    setLocatingStatus('Reading approximate location from network…');
    try {
      const res = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en');
      if (res.ok) {
        const data = await res.json();
        if (data.latitude && data.longitude) {
          const lat = Number(Number(data.latitude).toFixed(6));
          const lng = Number(Number(data.longitude).toFixed(6));
          triggerToast('📍 Network location detected. Drag marker or click map for exact building.');
          onSuccess(lat, lng);
          return;
        }
      }
    } catch {
      // Fallback failed
    }

    setLocating(false);
    setLocatingStatus(null);
    triggerToast('✗ Please enable browser location permission or use the search bar below.');
  };

  // Address Search Handler (Forward Geocoding)
  const handleSearchAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);

    try {
      const results = await api.searchAddress(searchQuery.trim());
      setSearchResults(results);
      if (!results.length) {
        triggerToast('No locations found. Try including city name (e.g. Meerpet, Hyderabad).');
      }
    } catch {
      triggerToast('Could not search address. Please try again.');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className={`bg-white rounded-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col transition-all duration-300 ${
        isExpanded 
          ? 'max-w-6xl h-[95vh] my-auto' 
          : 'max-w-xl max-h-[92vh] my-auto'
      }`}>
        
        {/* 1. Top Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/90 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-black text-base text-[#0A2540]">
                  Geofence & Office Location
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Strict Perimeter
                </span>
                {isExpanded && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                    Expanded View
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Set office coordinates, verify live GPS, & define punch-in boundary
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Expand / Minimize Toggle Button */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Minimize View' : 'Expand & Verify Live Location on Large Map'}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-[#00A88B] hover:border-[#00C9A7] transition-all shadow-2xs cursor-pointer"
            >
              {isExpanded ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Minimize</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Expand Map</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors shadow-2xs cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Body Area */}
        <div className={`p-4 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1 ${
          isExpanded ? 'grid grid-cols-1 lg:grid-cols-12 gap-6 space-y-0' : ''
        }`}>

          {/* Left Column in Expanded Mode (Map + Controls) */}
          <div className={`${isExpanded ? 'lg:col-span-7 flex flex-col gap-3' : 'space-y-4'}`}>
            
            {/* Real-time Distance & Device Verification Bar */}
            <div className="bg-[#E6FAF6] border border-[#00C9A7]/40 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 text-[#00A88B]">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span className="font-bold text-[11px]">
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

            {/* Quick Action: Fetch Live Location Button */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#0A2540] text-white p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-[#00C9A7] font-bold text-[11px] uppercase tracking-wider">
                  <Compass className="w-3.5 h-3.5" />
                  <span>Instant Live GPS Auto-Detection</span>
                </div>
                <p className="text-xs text-slate-200 font-medium">
                  {locatingStatus || 'Click to capture current GPS coordinates and auto-fill address.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleFetchLiveLocation}
                disabled={locating}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#00C9A7] hover:bg-[#00B4D8] disabled:opacity-50 text-[#0A2540] font-black text-xs px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Crosshair className={`w-4 h-4 ${locating ? 'animate-spin' : ''}`} />
                <span>{locating ? 'Acquiring GPS & Address…' : 'Fetch Live Location'}</span>
              </button>
            </div>

            {/* Interactive Leaflet Map Preview */}
            <div className="space-y-1.5 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#00A88B]" />
                  <span>Interactive Map & Geofence Boundary</span>
                </label>

                {latitude != null && longitude != null && (
                  <a
                    href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-bold text-[#00A88B] hover:underline flex items-center gap-1"
                  >
                    <span>Open in Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <LeafletGeofenceMap
                latitude={latitude}
                longitude={longitude}
                radiusMeters={radiusMeters}
                deviceLocation={deviceLocation}
                onLocationChange={handleLocationChange}
                isEditable={true}
                height={isExpanded ? '460px' : '230px'}
                className="flex-1"
              />
            </div>
          </div>

          {/* Right Column in Expanded Mode (Search, Inputs & Perimeter) */}
          <div className={`${isExpanded ? 'lg:col-span-5 flex flex-col gap-4' : 'space-y-4'}`}>
            
            {/* Search Office Address by Landmark / Street */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Search className="w-3 h-3 text-[#00A88B]" />
                <span>Search Office Location / Landmark</span>
              </label>
              <form onSubmit={handleSearchAddress} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. Meerpet, TRR College, Hyderabad"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-4 py-2 bg-[#0A2540] hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Search</span>}
                </button>
              </form>

              {/* Search Suggestions Dropdown */}
              {searchResults.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 space-y-1 max-h-48 overflow-y-auto animate-in fade-in z-20">
                  {searchResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectSearchResult(item)}
                      className="p-2 hover:bg-[#E6FAF6] rounded-lg cursor-pointer transition-colors text-left flex items-start gap-2 text-xs"
                    >
                      <MapPin className="w-4 h-4 text-[#00A88B] mt-0.5 flex-shrink-0" />
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
                Office Name & Full Street Address
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <textarea
                  rows={2}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. TRR Engineering College Road, Meerpet, Hyderabad, Telangana 500097"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00C9A7] resize-none"
                />
              </div>
            </div>

            {/* Coordinates (Latitude & Longitude) */}
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#00C9A7]"
                />
              </div>
            </div>

            {/* Perimeter Radius Control & Presets */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
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

        </div>

        {/* 3. Footer Action Bar */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="text-[11px] text-slate-500 truncate max-w-[200px] sm:max-w-md">
            {office?.latitude != null && (
              <span>Saved in system: <strong>{office.label}</strong> ({office.radiusMeters}m)</span>
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
              className="flex items-center gap-2 bg-[#00C9A7] hover:bg-[#00B4D8] disabled:opacity-50 text-[#0A2540] font-black text-xs px-6 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
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
