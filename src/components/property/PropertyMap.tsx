import { useEffect, useRef } from 'react';
import { useGoogleMaps } from '../../hooks/useGoogleMaps';
import LoadingSpinner from '../common/LoadingSpinner';

interface PropertyMapProps {
  address: string;
  className?: string;
}

export default function PropertyMap({ address, className = '' }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const { mapsLoaded, error } = useGoogleMaps();
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (!mapsLoaded || !mapRef.current) return;

    // Only create map instance if it doesn't exist
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false
      });
    }

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results?.[0] && mapInstanceRef.current) {
        const location = results[0].geometry.location;
        mapInstanceRef.current.setCenter(location);
        
        new google.maps.Marker({
          map: mapInstanceRef.current,
          position: location,
          animation: google.maps.Animation.DROP
        });
      }
    });

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        // @ts-ignore
        mapInstanceRef.current = null;
      }
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