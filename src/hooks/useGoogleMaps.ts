import { useEffect, useState } from 'react';

let scriptLoaded = false;

export function useGoogleMaps() {
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (window.google?.maps) {
      setMapsLoaded(true);
      return;
    }

    if (scriptLoaded) return;

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDJjY7sLBjcSOqt8-d86iIB1s_WZGtkltc&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      scriptLoaded = true;
      setMapsLoaded(true);
    };
    script.onerror = () => setError(new Error('Failed to load Google Maps'));

    document.head.appendChild(script);

    return () => {
      // Don't remove the script as it might be used by other components
    };
  }, []);

  return { mapsLoaded, error };
}