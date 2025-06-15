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
    // Create full address from available components
    let fullAddress = address;
    
    // If city, state, pincode are provided separately, use them
    if (city || state || pincode) {
      const addressParts = [address, city, state, pincode].filter(Boolean);
      fullAddress = addressParts.join(', ');
    }
    
    // Fallback: if no structured address components, try to use the full address as-is
    if (!fullAddress || fullAddress.trim() === '') {
      setError("No address information available");
      setLoading(false);
      return;
    }

    try {
      // Create a Google Maps embed URL from the address
      const formattedAddress = encodeURIComponent(fullAddress);
      
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

  // Create display address for description
  const displayAddress = [address, city, state, pincode].filter(Boolean).join(', ') || address;

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
            <p className="text-center">{error}</p>
            {address && (
              <p className="text-sm text-gray-500 mt-2 text-center">Address: {address}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Location</CardTitle>
        <CardDescription>{displayAddress}</CardDescription>
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
