import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { AlertTriangle } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

interface PropertyLocationMapProps {
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export default function PropertyLocationMap({ 
  address, 
  city, 
  state, 
  pincode 
}: PropertyLocationMapProps) {
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address || !city || !state) {
      setError("Incomplete address information");
      setLoading(false);
      return;
    }

    try {
      // Create a Google Maps embed URL from the address
      const formattedAddress = encodeURIComponent(`${address}, ${city}, ${state} ${pincode}`);
      
      // Note: In a production environment, you would want to use an API key
      // For this demo, we'll use the keyless embed which has usage limitations
      const url = `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${formattedAddress}`;
      
      setMapUrl(url);
      setError(null);
    } catch (err) {
      console.error("Error creating map URL:", err);
      setError("Failed to load map");
    } finally {
      setLoading(false);
    }
  }, [address, city, state, pincode]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full bg-muted rounded-md flex flex-col items-center justify-center text-destructive">
            <AlertTriangle className="w-8 h-8 mb-2" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Location</CardTitle>
        <CardDescription>{`${address}, ${city}, ${state} ${pincode}`}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full rounded-md overflow-hidden">
          {mapUrl ? (
            <iframe
              title="Property Location"
              width="100%"
              height="100%"
              frameBorder="0"
              src={mapUrl}
              allowFullScreen
            ></iframe>
          ) : (
            <div className="h-full w-full bg-muted flex items-center justify-center">
              <p className="text-muted-foreground">Map not available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
