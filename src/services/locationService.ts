/**
 * Location Service for CMTSF-Net Monitor
 * =====================================
 * Privacy Safeguards:
 * 1. Location is NEVER inferred from voice characteristics or acoustic signatures.
 * 2. Only explicitly collected via user-authorized Browser Geolocation.
 * 3. Never silently acquired or shared without permission.
 * 4. Reverse geocoding displays City, District, State, Country ONLY when verified by an actual geocoding service.
 */

import { LocationInfo } from '../types/cmtsf';

export const DEFAULT_PRIVACY_NOTICE =
  'Privacy: Location is collected only after user permission. Location is never inferred from voice.';

/**
 * Reverse geocodes coordinates via OpenStreetMap Nominatim service.
 * Strictly adheres to rule: Do not display a city name unless it comes from an actual geocoding service.
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number
): Promise<{
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  approximate_location?: string;
}> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`,
      {
        headers: {
          'User-Agent': 'CMTSF-Net-GPS-Monitor/1.0 (contact: security@cmtsf-net.org)',
          'Accept': 'application/json',
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const city =
          addr.city ||
          addr.town ||
          addr.village ||
          addr.municipality ||
          addr.suburb;
        const district =
          addr.county ||
          addr.state_district ||
          addr.district;
        const state = addr.state;
        const country = addr.country;

        const parts = [city, district, state, country].filter(Boolean);
        const approximate_location = parts.length > 0 ? parts.join(', ') : undefined;

        return {
          city,
          district,
          state,
          country,
          approximate_location,
        };
      }
    }
  } catch (err) {
    console.warn('Reverse geocoding network check failed or offline:', err);
  }

  // If geocoding service is unavailable or coordinate is uninhabited/ocean, return undefined
  // DO NOT invent or fake city names!
  return {};
}

/**
 * Sends validated location payload to backend API: POST /api/location
 */
export async function syncLocationToBackend(locationData: {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  source: 'browser_gps';
  city?: string;
  district?: string;
  state?: string;
  country?: string;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: Math.round(locationData.accuracy),
        timestamp: locationData.timestamp,
        source: locationData.source,
        city: locationData.city,
        district: locationData.district,
        state: locationData.state,
        country: locationData.country,
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Backend location sync endpoint not available:', err);
    return false;
  }
}

/**
 * Notifies backend that location sharing is stopped: DELETE /api/location
 */
export async function stopLocationSharingOnBackend(): Promise<void> {
  try {
    await fetch('/api/location', {
      method: 'DELETE',
    });
  } catch {
    // Ignore backend offline
  }
}

/**
 * Fetches current location registration and permission status from backend: GET /api/location-status
 */
export async function fetchLocationStatusFromBackend(): Promise<{
  status: string;
  message?: string;
  data: LocationInfo | null;
}> {
  try {
    const res = await fetch('/api/location-status');
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Ignore
  }
  return { status: 'unavailable', data: null };
}

/**
 * Watches browser GPS position using navigator.geolocation.watchPosition
 * Options: { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
 */
export function watchBrowserGpsLocation(
  onUpdate: (loc: LocationInfo) => void,
  onError: (errorMsg: string) => void
): () => void {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onError('Geolocation is not supported by this browser.');
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      const isoTimestamp = new Date().toISOString();
      const timeOnly = new Date().toLocaleTimeString('en-US', { hour12: false });

      // Validate bounds
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        onError('Received out-of-range coordinates from device GPS.');
        return;
      }

      // Reverse geocode via actual geocoding service
      const geo = await reverseGeocodeCoordinates(latitude, longitude);

      const locInfo: LocationInfo = {
        source: 'browser_gps',
        status: 'Active',
        permission: 'granted',
        latitude: Number(latitude.toFixed(6)),
        longitude: Number(longitude.toFixed(6)),
        accuracy: Math.round(accuracy),
        accuracy_meters: Math.round(accuracy),
        timestamp: timeOnly,
        city: geo.city,
        district: geo.district,
        state: geo.state,
        region: geo.state,
        country: geo.country,
        approximate_location: geo.approximate_location,
        privacy_notice: DEFAULT_PRIVACY_NOTICE,
      };

      // Notify callback
      onUpdate(locInfo);

      // Sync with backend API
      syncLocationToBackend({
        latitude: locInfo.latitude,
        longitude: locInfo.longitude,
        accuracy: locInfo.accuracy,
        timestamp: isoTimestamp,
        source: 'browser_gps',
        city: geo.city,
        district: geo.district,
        state: geo.state,
        country: geo.country,
      });
    },
    (err) => {
      let msg = err.message;
      if (err.code === 1) {
        msg = 'Location permission denied by user or browser policy.';
      } else if (err.code === 2) {
        msg = 'Location unavailable (position could not be determined).';
      } else if (err.code === 3) {
        msg = 'Location request timed out.';
      }
      onError(msg);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    }
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
    stopLocationSharingOnBackend();
  };
}

/**
 * One-shot GPS request
 */
export async function requestBrowserGpsLocation(): Promise<LocationInfo> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const isoTimestamp = new Date().toISOString();
        const timeOnly = new Date().toLocaleTimeString('en-US', { hour12: false });

        const geo = await reverseGeocodeCoordinates(latitude, longitude);

        const loc: LocationInfo = {
          source: 'browser_gps',
          status: 'Active',
          permission: 'granted',
          latitude: Number(latitude.toFixed(6)),
          longitude: Number(longitude.toFixed(6)),
          accuracy: Math.round(accuracy || 25),
          accuracy_meters: Math.round(accuracy || 25),
          city: geo.city,
          district: geo.district,
          state: geo.state,
          region: geo.state,
          country: geo.country,
          approximate_location: geo.approximate_location,
          timestamp: timeOnly,
          privacy_notice: DEFAULT_PRIVACY_NOTICE,
        };

        syncLocationToBackend({
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          timestamp: isoTimestamp,
          source: 'browser_gps',
          city: geo.city,
          district: geo.district,
          state: geo.state,
          country: geo.country,
        });

        resolve(loc);
      },
      (err) => {
        reject(new Error(err.message || 'Location permission denied by user.'));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );
  });
}
