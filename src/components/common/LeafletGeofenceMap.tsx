import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, MapPin, Navigation, Crosshair, ZoomIn, ZoomOut } from 'lucide-react';

interface LeafletGeofenceMapProps {
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  deviceLocation?: { lat: number; lng: number } | null;
  onLocationChange?: (lat: number, lng: number) => void;
  isEditable?: boolean;
  height?: string;
  className?: string;
}

export const LeafletGeofenceMap: React.FC<LeafletGeofenceMapProps> = ({
  latitude,
  longitude,
  radiusMeters,
  deviceLocation,
  onLocationChange,
  isEditable = true,
  height = '320px',
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const officeMarkerRef = useRef<L.Marker | null>(null);
  const officeCircleRef = useRef<L.Circle | null>(null);
  const deviceMarkerRef = useRef<L.Marker | null>(null);
  const distanceLineRef = useRef<L.Polyline | null>(null);

  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');

  // Custom Office Pin Icon
  const createOfficeIcon = (radius: number) => {
    return L.divIcon({
      className: 'custom-office-pin-wrapper',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; margin-left: -22px; margin-top: -22px;">
          <div style="position: absolute; width: 44px; height: 44px; border-radius: 9999px; background: rgba(0, 201, 167, 0.25); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 32px; height: 32px; border-radius: 9999px; background: #0A2540; border: 2.5px solid #00C9A7; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.35); cursor: ${isEditable ? 'grab' : 'default'};">
            <svg style="width: 18px; height: 18px; color: #00C9A7;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
  };

  // Custom Device Location Icon
  const createDeviceIcon = () => {
    return L.divIcon({
      className: 'custom-device-pin-wrapper',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; margin-left: -16px; margin-top: -16px;">
          <div style="position: absolute; width: 32px; height: 32px; border-radius: 9999px; background: rgba(14, 165, 233, 0.35); animation: pulse 2s infinite;"></div>
          <div style="width: 18px; height: 18px; border-radius: 9999px; background: #0284c7; border: 3px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Remove any leftover leaflet id to prevent "Map container is already initialized" error
    if ((mapContainerRef.current as any)._leaflet_id) {
      try {
        delete (mapContainerRef.current as any)._leaflet_id;
      } catch (e) {}
    }

    const defaultLat = latitude ?? 17.314;
    const defaultLng = longitude ?? 78.529;

    let map: L.Map;
    try {
      map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: 16,
        zoomControl: false,
      });
    } catch (err) {
      console.warn('Leaflet initialization retry:', err);
      if ((mapContainerRef.current as any)._leaflet_id) {
        delete (mapContainerRef.current as any)._leaflet_id;
      }
      map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: 16,
        zoomControl: false,
      });
    }

    const streetUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const streetLayer = L.tileLayer(streetUrl, {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    tileLayerRef.current = streetLayer;
    mapInstanceRef.current = map;

    // Handle Map Click for Location Setting
    if (isEditable && onLocationChange) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const lat = Number(e.latlng.lat.toFixed(6));
        const lng = Number(e.latlng.lng.toFixed(6));
        onLocationChange(lat, lng);
      });
    }

    // Force size calculation after render
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
    setTimeout(() => {
      map.invalidateSize();
    }, 500);

    return () => {
      try {
        map.remove();
      } catch (e) {}
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Switch Street / Satellite Tiles
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    tileLayerRef.current.remove();

    if (mapType === 'satellite') {
      const satLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye',
        }
      ).addTo(mapInstanceRef.current);
      tileLayerRef.current = satLayer;
    } else {
      const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapInstanceRef.current);
      tileLayerRef.current = streetLayer;
    }
  }, [mapType]);

  // 3. Update Office Marker & Geofence Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (latitude != null && longitude != null) {
      const latLng: [number, number] = [latitude, longitude];

      // Update or create Office Marker
      if (officeMarkerRef.current) {
        officeMarkerRef.current.setLatLng(latLng);
        officeMarkerRef.current.setIcon(createOfficeIcon(radiusMeters));
      } else {
        const marker = L.marker(latLng, {
          icon: createOfficeIcon(radiusMeters),
          draggable: isEditable,
        }).addTo(map);

        if (isEditable && onLocationChange) {
          marker.on('dragend', () => {
            const pos = marker.getLatLng();
            onLocationChange(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
          });
        }

        officeMarkerRef.current = marker;
      }

      // Update or create Geofence Perimeter Circle
      if (officeCircleRef.current) {
        officeCircleRef.current.setLatLng(latLng);
        officeCircleRef.current.setRadius(radiusMeters);
      } else {
        const circle = L.circle(latLng, {
          radius: radiusMeters,
          color: '#00C9A7',
          weight: 2.5,
          dashArray: '6, 6',
          fillColor: '#00C9A7',
          fillOpacity: 0.22,
        }).addTo(map);
        officeCircleRef.current = circle;
      }

      // Smooth pan if outside current view
      if (!map.getBounds().contains(latLng)) {
        map.panTo(latLng);
      }
    }
  }, [latitude, longitude, radiusMeters, isEditable]);

  // 4. Update Device Location Marker & Distance Line
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (deviceLocation && deviceLocation.lat && deviceLocation.lng) {
      const deviceLatLng: [number, number] = [deviceLocation.lat, deviceLocation.lng];

      if (deviceMarkerRef.current) {
        deviceMarkerRef.current.setLatLng(deviceLatLng);
      } else {
        const marker = L.marker(deviceLatLng, {
          icon: createDeviceIcon(),
        }).addTo(map);
        marker.bindTooltip('Your Device Live Location', { permanent: false, direction: 'top' });
        deviceMarkerRef.current = marker;
      }

      // Draw dashed line between Device and Office
      if (latitude != null && longitude != null) {
        const lineCoords: [number, number][] = [deviceLatLng, [latitude, longitude]];
        if (distanceLineRef.current) {
          distanceLineRef.current.setLatLngs(lineCoords);
        } else {
          const polyline = L.polyline(lineCoords, {
            color: '#0A2540',
            weight: 2,
            dashArray: '4, 6',
            opacity: 0.7,
          }).addTo(map);
          distanceLineRef.current = polyline;
        }
      }
    } else {
      if (deviceMarkerRef.current) {
        deviceMarkerRef.current.remove();
        deviceMarkerRef.current = null;
      }
      if (distanceLineRef.current) {
        distanceLineRef.current.remove();
        distanceLineRef.current = null;
      }
    }
  }, [deviceLocation, latitude, longitude]);

  // Invalidate map size on demand
  useEffect(() => {
    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [height]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleRecenter = () => {
    if (latitude != null && longitude != null && mapInstanceRef.current) {
      mapInstanceRef.current.setView([latitude, longitude], 17);
    }
  };

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-slate-200/90 shadow-inner group ${className}`}
      style={{ height, minHeight: height }}
    >
      {/* Map DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" style={{ height: '100%', minHeight: height }} />

      {/* Floating Controls Overlay */}
      <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2 pointer-events-auto">
        {/* Layer Switcher */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl p-1 shadow-md border border-slate-200 flex items-center gap-1 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setMapType('streets')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              mapType === 'streets'
                ? 'bg-[#0A2540] text-[#00C9A7] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Streets
          </button>
          <button
            type="button"
            onClick={() => setMapType('satellite')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              mapType === 'satellite'
                ? 'bg-[#0A2540] text-[#00C9A7] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Satellite
          </button>
        </div>

        {/* Zoom & Recenter Controls */}
        <div className="bg-white/95 backdrop-blur-md rounded-xl p-1 shadow-md border border-slate-200 flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          {latitude != null && longitude != null && (
            <button
              type="button"
              onClick={handleRecenter}
              title="Recenter to Office Pin"
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#E6FAF6] text-[#00A88B] transition-colors cursor-pointer border-t border-slate-100 pt-1"
            >
              <Crosshair className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Floating Status / Instructions Tag */}
      {isEditable && (
        <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl px-3 py-1.5 shadow-md flex items-center gap-2 text-[10px] font-semibold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-[#00C9A7] animate-pulse" />
            <span>Click map or drag pin to place office location</span>
          </div>
        </div>
      )}

      {/* Geofence Perimeter Badge Top-Left */}
      {latitude != null && longitude != null && (
        <div className="absolute top-3 left-3 z-10 pointer-events-none">
          <div className="bg-[#0A2540]/90 backdrop-blur-md border border-[#00C9A7]/40 rounded-xl px-3 py-1.5 shadow-md flex items-center gap-2 text-[11px] font-bold text-white">
            <span className="w-2 h-2 rounded-full bg-[#00C9A7]" />
            <span>{radiusMeters}m Perimeter Active</span>
          </div>
        </div>
      )}
    </div>
  );
};
