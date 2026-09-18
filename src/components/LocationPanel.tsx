import React, { useEffect, useState, useRef } from 'react';
import {
  MapPin,
  Navigation,
  Shield,
  AlertCircle,
  Clock,
  Eye,
  EyeOff,
  Crosshair,
  ExternalLink,
} from 'lucide-react';
import { LocationInfo } from '../types/cmtsf';
import {
  DEFAULT_PRIVACY_NOTICE,
  reverseGeocodeCoordinates,
  syncLocationToBackend,
  stopLocationSharingOnBackend,
} from '../services/locationService';
import { MapComponent } from './MapComponent';

interface LocationPanelProps {
  location: LocationInfo | null;
  onLocationUpdate: (loc: LocationInfo | null) => void;
  isStreaming?: boolean;
}

export const LocationPanel: React.FC<LocationPanelProps> = ({
  location,
  onLocationUpdate,
  isStreaming = false,
}) => {
  const [error, setError] = useState<string>('');
  const [enabled, setEnabled] = useState<boolean>(!!location);
  const [permissionStatus, setPermissionStatus] = useState<'Granted' | 'Prompt' | 'Denied'>('Prompt');
  const [showMap, setShowMap] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const watchIdRef = useRef<number | null>(null);

  // Sync internal enabled state when external location prop changes
  useEffect(() => {
    if (location) {
      setEnabled(true);
      setPermissionStatus('Granted');
    }
  }, [location]);

  // Geolocation watchPosition hook
  useEffect(() => {
    if (!enabled) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      setPermissionStatus('Denied');
      return;
    }

    setIsLoading(true);

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        setIsLoading(false);
        const { latitude, longitude, accuracy } = position.coords;
        const timeString = new Date().toLocaleTimeString('en-US', { hour12: false });
        const isoString = new Date().toISOString();

        setPermissionStatus('Granted');
        setError('');

        // Reverse geocode via actual geocoding service
        const geo = await reverseGeocodeCoordinates(latitude, longitude);

        const newLoc: LocationInfo = {
          source: 'browser_gps',
          status: 'Active',
          permission: 'granted',
          latitude: Number(latitude.toFixed(6)),
          longitude: Number(longitude.toFixed(6)),
          accuracy: Math.round(accuracy),
          accuracy_meters: Math.round(accuracy),
          timestamp: timeString,
          city: geo.city,
          district: geo.district,
          state: geo.state,
          region: geo.state,
          country: geo.country,
          approximate_location: geo.approximate_location,
          privacy_notice: DEFAULT_PRIVACY_NOTICE,
        };

        onLocationUpdate(newLoc);

        // Notify backend API
        syncLocationToBackend({
          latitude: newLoc.latitude,
          longitude: newLoc.longitude,
          accuracy: newLoc.accuracy,
          timestamp: isoString,
          source: 'browser_gps',
          city: geo.city,
          district: geo.district,
          state: geo.state,
          country: geo.country,
        });
      },
      (err) => {
        setIsLoading(false);
        setPermissionStatus('Denied');
        let msg = err.message;
        if (err.code === 1) {
          msg = 'Location permission denied by user or browser policy.';
        } else if (err.code === 2) {
          msg = 'Location unavailable: unable to determine device coordinates.';
        } else if (err.code === 3) {
          msg = 'Location acquisition request timed out.';
        }
        setError(msg);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled, onLocationUpdate]);

  const handleToggleSharing = () => {
    if (enabled) {
      setEnabled(false);
      onLocationUpdate(null);
      setPermissionStatus('Prompt');
      stopLocationSharingOnBackend();
    } else {
      setError('');
      setEnabled(true);
    }
  };

  return (
    <div
      id="location-panel"
      className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur-sm space-y-4 font-mono"
    >
      {/* 1. Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
              LOCATION STATUS
            </h2>
            <span className="text-[11px] text-slate-400">
              Independent Browser GPS Telemetry
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {location && (
            <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>LIVE GPS</span>
            </span>
          )}
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
            Non-Voice Channel
          </span>
        </div>
      </div>

      {/* 2. Strict Privacy Safeguard Banner */}
      <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2.5">
        <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-slate-200">Privacy Guarantee</p>
          <p className="text-slate-400 text-[10px] leading-relaxed">
            The system <strong className="text-amber-300 font-medium">never infers location from voice analysis</strong>.
            GPS telemetry is requested explicitly via the browser Geolocation API and updated independently while live monitoring is active.
          </p>
        </div>
      </div>

      {/* 3. Location Status Table */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-4 space-y-2.5 text-xs">
        <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
          <span className="text-slate-400">GPS Status:</span>
          <span className={`font-semibold flex items-center gap-1.5 ${
            enabled && location ? 'text-emerald-400' : enabled ? 'text-cyan-400 animate-pulse' : 'text-slate-400'
          }`}>
            <Navigation className="w-3.5 h-3.5" />
            <span>{enabled && location ? 'Active' : enabled ? 'Acquiring GPS...' : 'Inactive'}</span>
          </span>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
          <span className="text-slate-400">Permission:</span>
          <span className={`font-semibold ${
            permissionStatus === 'Granted' ? 'text-emerald-400' : permissionStatus === 'Denied' ? 'text-rose-400' : 'text-amber-400'
          }`}>
            {permissionStatus}
          </span>
        </div>

        {location ? (
          <>
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Latitude:</span>
              <span className="font-bold text-white tracking-wide">{location.latitude}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Longitude:</span>
              <span className="font-bold text-white tracking-wide">{location.longitude}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Accuracy:</span>
              <span className="text-slate-200 font-medium">{Math.round(location.accuracy)} metres</span>
            </div>

            {location.approximate_location && (
              <div className="py-2 border-b border-slate-800/60">
                <span className="text-[10px] text-slate-500 uppercase block">Approximate Location:</span>
                <span className="text-sm font-bold text-cyan-300 block mt-0.5">
                  {location.approximate_location}
                </span>
                <span className="text-[9px] text-slate-500 block mt-0.5">
                  Reverse geocoded via OpenStreetMap Nominatim
                </span>
              </div>
            )}

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>Last Updated:</span>
              </span>
              <span className="text-cyan-400 font-bold">{location.timestamp}</span>
            </div>
          </>
        ) : (
          <div className="py-4 text-center space-y-1.5">
            <p className="text-xs font-semibold text-slate-300">
              {permissionStatus === 'Denied' ? 'Location unavailable.' : 'Location not sharing.'}
            </p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              {permissionStatus === 'Denied'
                ? 'Browser GPS permission was denied. Check browser site settings if location is needed.'
                : 'Click "Enable GPS" or start live monitoring with location authorized.'}
            </p>
          </div>
        )}

        {error && (
          <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/50 text-rose-300 text-[11px] flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* 4. Interactive Leaflet Map (Rendered only after GPS permission is granted) */}
      {location && location.latitude !== null && location.longitude !== null && showMap && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-semibold text-slate-300">
              <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
              <span>Interactive Leaflet Map</span>
            </span>
            <span className="text-[10px] text-slate-500">
              ±{Math.round(location.accuracy)}m confidence ring
            </span>
          </div>

          <MapComponent
            latitude={location.latitude}
            longitude={location.longitude}
            accuracy={location.accuracy}
            locationName={location.approximate_location || `Coordinates: ${location.latitude}, ${location.longitude}`}
            height="260px"
          />

          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
            <span>Tile Source: OpenStreetMap contributors</span>
            <a
              href={`https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>View full OSM</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      )}

      {/* 5. Control Buttons: [Open Map] / [Stop Location Sharing] */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {location && (
          <button
            id="btn-toggle-map"
            type="button"
            onClick={() => setShowMap(!showMap)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            {showMap ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showMap ? 'Hide Map' : 'Open Map'}</span>
          </button>
        )}

        <button
          id="btn-toggle-gps-sharing"
          type="button"
          onClick={handleToggleSharing}
          disabled={isLoading}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            enabled
              ? 'bg-rose-900/50 hover:bg-rose-800 text-rose-200 border border-rose-700'
              : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-900/30'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>{enabled ? 'Stop Location Sharing' : 'Enable GPS'}</span>
        </button>
      </div>

      <div className="text-[10px] text-slate-500 italic pt-2 border-t border-slate-800/60">
        Important Notice: Browser GPS functions over HTTPS/localhost with device location services enabled.
        Desktop computers without dedicated GPS sensors use Wi-Fi network routing points.
      </div>
    </div>
  );
};
