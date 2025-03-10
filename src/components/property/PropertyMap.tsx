import { useEffect, useRef } from 'react';
import { useGoogleMaps } from '../../hooks/useGoogleMaps';
import LoadingSpinner from '../common/LoadingSpinner';

// Add type definitions for Google Maps
declare global {
  interface Window {
    google: typeof google;
  }
}

interface PropertyMapProps {
  address: string;
  className?: string;
}

interface GeocodeResult {
  geometry: {
    location: google.maps.LatLng;
  };
}

export default function PropertyMap({ address, className = '' }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const { mapsLoaded, error } = useGoogleMaps();
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!mapsLoaded || !mapRef.current) return;

    // Initialize map only once
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });
    }

    // Geocode address and update map
    const geocoder = new window.google.maps.Geocoder();
    
    geocoder.geocode(
      { address },
      (
        results: google.maps.GeocoderResult[] | null,
        status: google.maps.GeocoderStatus
      ) => {
        if (status === 'OK' && results?.[0] && mapInstanceRef.current) {
          const location = results[0].geometry.location;
          mapInstanceRef.current.setCenter(location);

          // Remove existing marker if any
          if (markerRef.current) {
            markerRef.current.setMap(null);
          }

          // Create new marker
          markerRef.current = new window.google.maps.Marker({
            map: mapInstanceRef.current,
            position: location,
            animation: window.google.maps.Animation.DROP
          });
        }
      }
    );

    // Cleanup function
    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      // Don't need to explicitly cleanup map instance as it's handled by Google Maps
    };
  }, [mapsLoaded, address]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <p className="text-red-600">Failed to load map</p>
      </div>
    );
  }

  if (!mapsLoaded) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <LoadingSpinner />
      </div>
    );
  }

  return <div ref={mapRef} className={className} />;
}