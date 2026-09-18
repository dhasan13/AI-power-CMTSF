import React, { useEffect, useState, useRef } from "react";
import L from "leaflet";

/**
 * LocationPanel - CMTSF-Net Independent GPS Location Telemetry
 * Supports browser Geolocation watchPosition, Leaflet map rendering, and reverse geocoding.
 */
export default function LocationPanel({
  externalLocation = null,
  onLocationUpdate = null,
  autoStart = false,
}) {
  const [location, setLocation] = useState(externalLocation);
  const [error, setError] = useState("");
  const [enabled, setEnabled] = useState(autoStart || !!externalLocation);
  const [permissionStatus, setPermissionStatus] = useState("Prompt");
  const [showMap, setShowMap] = useState(true);
  const [geocodedAddress, setGeocodedAddress] = useState("");

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  // Synchronize with external prop if provided
  useEffect(() => {
    if (externalLocation) {
      setLocation(externalLocation);
      setEnabled(true);
      setPermissionStatus("Granted");
      if (externalLocation.approximate_location) {
        setGeocodedAddress(externalLocation.approximate_location);
      }
    }
  }, [externalLocation]);

  // Geolocation watch effect
  useEffect(() => {
    if (!enabled) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      setPermissionStatus("Denied");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const timeString = new Date().toLocaleTimeString("en-US", { hour12: false });
        const isoString = new Date().toISOString();

        setPermissionStatus("Granted");
        setError("");

        const newLoc = {
          latitude: Number(latitude.toFixed(6)),
          longitude: Number(longitude.toFixed(6)),
          accuracy: Math.round(accuracy),
          timestamp: timeString,
          isoTimestamp: isoString,
          status: "Active",
          source: "browser_gps",
        };

        setLocation(newLoc);
        if (onLocationUpdate) {
          onLocationUpdate(newLoc);
        }

        // Send to backend API: POST /api/location
        try {
          fetch("/api/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude: newLoc.latitude,
              longitude: newLoc.longitude,
              accuracy: newLoc.accuracy,
              timestamp: isoString,
              source: "browser_gps",
            }),
          });
        } catch {
          // Backend offline or local preview
        }

        // Reverse geocode from actual service
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14`,
            { headers: { "User-Agent": "CMTSF-Net-GPS-Monitor/1.0" } }
          );
          if (res.ok) {
            const data = await res.json();
            if (data && data.address) {
              const city =
                data.address.city ||
                data.address.town ||
                data.address.village ||
                data.address.municipality ||
                data.address.suburb;
              const district =
                data.address.county ||
                data.address.state_district ||
                data.address.district;
              const state = data.address.state;
              const country = data.address.country;
              const parts = [city, district, state, country].filter(Boolean);
              if (parts.length > 0) {
                const fullLoc = parts.join(", ");
                setGeocodedAddress(fullLoc);
                newLoc.city = city;
                newLoc.district = district;
                newLoc.state = state;
                newLoc.country = country;
                newLoc.approximate_location = fullLoc;
                if (onLocationUpdate) onLocationUpdate(newLoc);
              }
            }
          }
        } catch {
          // Keep empty if service unavailable; do NOT display fake city
        }
      },
      (err) => {
        setPermissionStatus("Denied");
        setError(err.message || "Location permission denied or unavailable.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      try {
        fetch("/api/location", { method: "DELETE" });
      } catch {}
    };
  }, [enabled, onLocationUpdate]);

  // Leaflet Map Rendering
  useEffect(() => {
    if (!showMap || !location || !location.latitude || !location.longitude || !mapContainerRef.current) {
      return;
    }

    const lat = location.latitude;
    const lng = location.longitude;
    const acc = location.accuracy || 25;

    const customIcon = L.divIcon({
      className: "cmtsf-gps-marker",
      html: `
        <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background: rgba(6, 182, 212, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 18px; height: 18px; border-radius: 50%; background: #0891b2; border: 2.5px solid #ffffff; box-shadow: 0 0 10px rgba(6,182,212,0.8); display: flex; align-items: center; justify-content: center;">
            <div style="width: 6px; height: 6px; border-radius: 50%; background: #ffffff;"></div>
          </div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
      }).addTo(map);

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
      marker.bindPopup(`<b>Authorized GPS Location</b><br>Accuracy: ±${acc}m`);

      const circle = L.circle([lat, lng], {
        radius: acc,
        color: "#0891b2",
        fillColor: "#06b6d4",
        fillOpacity: 0.15,
        weight: 1.5,
      }).addTo(map);

      mapInstanceRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;

      setTimeout(() => map.invalidateSize(), 150);
    } else {
      const map = mapInstanceRef.current;
      map.setView([lat, lng], map.getZoom() || 15);
      if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
      if (circleRef.current) {
        circleRef.current.setLatLng([lat, lng]);
        circleRef.current.setRadius(acc);
      }
    }
  }, [location, showMap]);

  const handleToggleSharing = () => {
    if (enabled) {
      setEnabled(false);
      setLocation(null);
      setPermissionStatus("Prompt");
      setGeocodedAddress("");
      if (onLocationUpdate) onLocationUpdate(null);
      try {
        fetch("/api/location", { method: "DELETE" });
      } catch {}
    } else {
      setError("");
      setEnabled(true);
    }
  };

  return (
    <div id="location-panel" className="location-panel bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
          LOCATION STATUS
        </h2>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
          Independent Channel
        </span>
      </div>

      <div className="space-y-1 font-mono text-xs text-slate-300">
        <div className="flex justify-between py-1 border-b border-slate-800/60">
          <span className="text-slate-400">GPS Status:</span>
          <span className={`font-semibold ${enabled && location ? "text-emerald-400" : "text-slate-400"}`}>
            {enabled && location ? "Active" : enabled ? "Acquiring..." : "Inactive"}
          </span>
        </div>

        <div className="flex justify-between py-1 border-b border-slate-800/60">
          <span className="text-slate-400">Permission:</span>
          <span className={`font-semibold ${permissionStatus === "Granted" ? "text-emerald-400" : permissionStatus === "Denied" ? "text-rose-400" : "text-amber-400"}`}>
            {permissionStatus}
          </span>
        </div>

        {location ? (
          <>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Latitude:</span>
              <span className="font-bold text-white">{location.latitude}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Longitude:</span>
              <span className="font-bold text-white">{location.longitude}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Accuracy:</span>
              <span className="font-medium text-slate-200">{Math.round(location.accuracy)} metres</span>
            </div>

            {geocodedAddress && (
              <div className="py-2 border-b border-slate-800/60">
                <span className="text-[10px] text-slate-500 uppercase block">Approximate Location</span>
                <span className="text-sm font-bold text-cyan-300 block mt-0.5">{geocodedAddress}</span>
              </div>
            )}

            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Last Updated:</span>
              <span className="text-cyan-400">{location.timestamp}</span>
            </div>
          </>
        ) : (
          <div className="py-4 text-center text-slate-400">
            <p className="text-xs font-semibold text-slate-300">
              {permissionStatus === "Denied" ? "Location unavailable." : "Location not active."}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {permissionStatus === "Denied"
                ? "Permission was denied or blocked. Enable location in browser settings."
                : "Click below to grant GPS permission for live dashboard display."}
            </p>
          </div>
        )}

        {error && (
          <div className="p-2 rounded bg-rose-950/40 border border-rose-800/60 text-rose-300 text-[11px]">
            {error}
          </div>
        )}
      </div>

      {/* Interactive Map (Rendered only after GPS permission is granted) */}
      {location && showMap && (
        <div className="pt-2">
          <div
            ref={mapContainerRef}
            style={{ height: "260px", width: "100%" }}
            className="rounded-lg overflow-hidden border border-slate-700 shadow-inner"
          />
          <div className="text-[10px] text-slate-500 flex justify-between items-center mt-1">
            <span>OpenStreetMap • GPS Marker with Accuracy Ring</span>
            <span className="text-emerald-400 font-mono">● LIVE GPS</span>
          </div>
        </div>
      )}

      {/* Buttons: [Open Map] [Stop Location Sharing] / [Enable GPS] */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        {location && (
          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-mono font-medium transition-colors cursor-pointer"
          >
            {showMap ? "Hide Map" : "Open Map"}
          </button>
        )}

        <button
          type="button"
          onClick={handleToggleSharing}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
            enabled
              ? "bg-rose-900/40 hover:bg-rose-800/60 text-rose-300 border border-rose-700"
              : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-900/30"
          }`}
        >
          {enabled ? "Stop Location Sharing" : "Enable GPS"}
        </button>
      </div>

      <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-800/60">
        Privacy Guarantee: Location is collected only after user permission. Location is never inferred from voice analysis.
      </p>
    </div>
  );
}
