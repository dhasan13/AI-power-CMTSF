import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface MapComponentProps {
  latitude: number;
  longitude: number;
  accuracy?: number;
  locationName?: string;
  zoom?: number;
  height?: string;
}

export const MapComponent: React.FC<MapComponentProps> = ({
  latitude,
  longitude,
  accuracy,
  locationName,
  zoom = 15,
  height = '300px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Custom pulse marker icon using HTML/SVG to avoid missing PNG assets
    const customIcon = L.divIcon({
      className: 'cmtsf-gps-marker',
      html: `
        <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background: rgba(6, 182, 212, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 18px; height: 18px; border-radius: 50%; background: #0891b2; border: 2.5px solid #ffffff; box-shadow: 0 0 10px rgba(6,182,212,0.8); display: flex; align-items: center; justify-content: center;">
            <div style="width: 6px; height: 6px; border-radius: 50%; background: #ffffff;"></div>
          </div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
    });

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: zoom,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      }).addTo(map);

      const marker = L.marker([latitude, longitude], { icon: customIcon }).addTo(map);
      if (locationName) {
        marker.bindPopup(`<b>Authorized GPS Position</b><br>${locationName}<br><small>Accuracy: ±${Math.round(accuracy || 25)}m</small>`).openPopup();
      }

      let circle: L.Circle | null = null;
      if (accuracy && accuracy > 0) {
        circle = L.circle([latitude, longitude], {
          radius: accuracy,
          color: '#0891b2',
          fillColor: '#06b6d4',
          fillOpacity: 0.15,
          weight: 1.5,
        }).addTo(map);
      }

      mapInstanceRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;

      // Invalidate size in next tick to avoid grey tile glitches
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    } else {
      const map = mapInstanceRef.current;
      map.setView([latitude, longitude], zoom);

      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
        if (locationName) {
          markerRef.current.setPopupContent(`<b>Authorized GPS Position</b><br>${locationName}<br><small>Accuracy: ±${Math.round(accuracy || 25)}m</small>`);
        }
      }

      if (circleRef.current) {
        circleRef.current.setLatLng([latitude, longitude]);
        if (accuracy) {
          circleRef.current.setRadius(accuracy);
        }
      }
    }

    return () => {
      // Map lifecycle managed
    };
  }, [latitude, longitude, accuracy, locationName, zoom]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div
      style={{ height, width: '100%' }}
      className="relative rounded-lg overflow-hidden border border-slate-700 shadow-inner z-0"
    >
      <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
};
export default MapComponent;
