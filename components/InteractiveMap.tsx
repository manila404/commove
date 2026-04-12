
import React, { useEffect, useRef, useState } from 'react';
import type { EventType } from '../types';
import { CompassIcon, LocateIcon } from '../constants';

declare const L: any;

interface InteractiveMapProps {
  userLocation: { lat: number; lng: number; accuracy?: number };
  events: EventType[];
  isLocationLive?: boolean;
  className?: string;
  centerOnEvent?: { lat: number; lng: number };
  filterPastEvents?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
}

// Local Icons for Zoom controls
const PlusIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);

const MinusIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
    </svg>
);

const InteractiveMap: React.FC<InteractiveMapProps> = ({ 
  userLocation, 
  events, 
  isLocationLive = true,
  className = "relative w-full aspect-[5/4] rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600 shadow-inner z-0",
  centerOnEvent,
  filterPastEvents = false,
  onMapClick
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const [bearing, setBearing] = useState(0);
  const [isMapReady, setIsMapReady] = useState(false);

  // 1. Initialize Map (Runs ONLY once)
  useEffect(() => {
    // Safety check: Ensure DOM element exists and Leaflet library is loaded
    if (!mapContainerRef.current || typeof L === 'undefined') return;
    if (mapRef.current) return; // Prevent double initialization

    try {
      // Determine initial view parameters
      const startLat = centerOnEvent ? centerOnEvent.lat : userLocation.lat;
      const startLng = centerOnEvent ? centerOnEvent.lng : userLocation.lng;
      const startZoom = centerOnEvent ? 16 : 13;

      // Initialize map with rotation enabled if plugin is present
      const mapOptions: any = {
        attributionControl: false,
        zoomControl: false // We will implement custom zoom controls
      };

      // Check if Leaflet Rotate plugin is loaded by checking for Rotate handler or setBearing method
      // Use even more defensive checks to prevent "Cannot read properties of undefined"
      const isRotatePluginLoaded = (typeof L !== 'undefined' && L.Handler && (L.Handler.Rotate || L.Handler.rotate)) || 
                                   (typeof L !== 'undefined' && L.Map && L.Map.prototype && L.Map.prototype.setBearing);
      
      if (isRotatePluginLoaded) {
        try {
          if (typeof L !== 'undefined' && L.Handler && (L.Handler.Rotate || L.Handler.rotate)) {
            mapOptions.rotate = true;
            mapOptions.touchRotate = true;
            mapOptions.rotateControl = false; // We use our own compass
          }
        } catch (err) {
          console.warn("Could not set rotate options", err);
        }
      }

      let map;
      try {
        map = L.map(mapContainerRef.current, mapOptions).setView([startLat, startLng], startZoom);
      } catch (mapError) {
        console.warn("Failed to initialize map with rotation, falling back to standard map", mapError);
        // Fallback: Try without rotation options
        const fallbackOptions = { attributionControl: false, zoomControl: false };
        map = L.map(mapContainerRef.current, fallbackOptions).setView([startLat, startLng], startZoom);
      }

      // Final forced removal of any default controls that might sneak in via plugins
      if (map.zoomControl) map.zoomControl.remove();
      if (map.attributionControl) map.attributionControl.remove();
      try {
        // Handle leaflet-rotate specific control
        if ((map as any).rotateControl) (map as any).rotateControl.remove();
      } catch(e) {}

      const GEOAPIFY_API_KEY = '96056c5a5f684989a8c9bf0eb2b76518';
      L.tileLayer(`https://maps.geoapify.com/v1/tile/osm-carto/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_API_KEY}`, {
        attribution: 'Map &copy; <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap</a> contributors',
        maxZoom: 20
      }).addTo(map);

      // Initialize layer group for event markers
      markersLayerRef.current = L.layerGroup().addTo(map);

      // Listen for rotation events to update the compass if plugin is loaded
      if (isRotatePluginLoaded && typeof map.getBearing === 'function') {
        map.on('rotate', () => {
           setBearing(map.getBearing());
        });
      }

      mapRef.current = map;
      setIsMapReady(true);

    } catch (e) {
      console.error("Error initializing map:", e);
    }

    // Cleanup function runs only on component unmount
    return () => {
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
            setIsMapReady(false);
        }
    };
  }, []); // Empty dependency array ensures this runs once

  // Handle map clicks
  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;
    const map = mapRef.current;

    const handleClick = (e: any) => {
        if (onMapClick) {
            onMapClick(e.latlng.lat, e.latlng.lng);
        }
    };

    map.on('click', handleClick);

    return () => {
        map.off('click', handleClick);
    };
  }, [isMapReady, onMapClick]);

  // 2. Handle User Location Updates
  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;
    const map = mapRef.current;

    const userIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `
            <div class="relative flex items-center justify-center w-6 h-6">
                <div class="absolute w-full h-full bg-blue-500 rounded-full animate-ping opacity-75"></div>
                <div class="relative w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md"></div>
            </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    if (isLocationLive) {
        const accuracyText = userLocation.accuracy 
            ? `Accuracy: ±${Math.round(userLocation.accuracy)} meters` 
            : 'Accuracy: Unknown';

        const popupContent = `
            <div class="text-center min-w-[150px]">
               <h3 class="font-bold text-gray-800 mb-1">You are here</h3>
               <p class="text-xs text-gray-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">${accuracyText}</p>
            </div>
        `;

        if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
            userMarkerRef.current.setPopupContent(popupContent);
            if (!map.hasLayer(userMarkerRef.current)) {
                userMarkerRef.current.addTo(map);
            }
        } else {
            userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { 
                icon: userIcon,
                draggable: false 
            })
            .addTo(map)
            .bindPopup(popupContent);
        }

        if (userLocation.accuracy) {
            if (accuracyCircleRef.current) {
                accuracyCircleRef.current.setLatLng([userLocation.lat, userLocation.lng]);
                accuracyCircleRef.current.setRadius(userLocation.accuracy);
                if (!map.hasLayer(accuracyCircleRef.current)) {
                    accuracyCircleRef.current.addTo(map);
                }
            } else {
                accuracyCircleRef.current = L.circle([userLocation.lat, userLocation.lng], {
                    radius: userLocation.accuracy,
                    color: '#3b82f6',
                    fillColor: '#3b82f6',
                    fillOpacity: 0.25, 
                    weight: 2,
                    dashArray: '5, 5' 
                }).addTo(map);
            }
        }
    } else {
        // Safe removal logic
        if (userMarkerRef.current) {
            try { userMarkerRef.current.remove(); } catch(e) {}
            userMarkerRef.current = null;
        }
        if (accuracyCircleRef.current) {
            try { accuracyCircleRef.current.remove(); } catch(e) {}
            accuracyCircleRef.current = null;
        }
    }
  }, [userLocation, isLocationLive, isMapReady]);

  // 3. Handle Event Markers Updates
  useEffect(() => {
    if (!isMapReady || !mapRef.current || !markersLayerRef.current) return;
    
    // Clear existing markers safely
    markersLayerRef.current.clearLayers();

    const now = new Date();
    const upcomingEvents = filterPastEvents ? events.filter(event => {
        try {
            // Ensure date and time are parsed correctly
            const eventEnd = new Date(`${event.date}T${event.endTime || '23:59'}`);
            
            if (isNaN(eventEnd.getTime())) {
                console.warn(`Invalid date for event: ${event.name}, date: ${event.date}, time: ${event.endTime}`);
                return true; // Keep if date is invalid to avoid hiding potentially valid events
            }
            
            const isLiveOrUpcoming = eventEnd > now;
            
            console.log(`Event: ${event.name}, End: ${eventEnd.toISOString()}, Now: ${now.toISOString()}, Keep: ${isLiveOrUpcoming}`);
            
            return isLiveOrUpcoming;
        } catch (e) {
            console.error(`Error parsing date for event: ${event.name}`, e);
            return true; // If date parsing fails, keep the event to be safe
        }
    }) : events;

    upcomingEvents.forEach(event => {
        // Critical Safety Check: Ensure lat/lng are valid numbers
        if (typeof event.lat !== 'number' || typeof event.lng !== 'number' || isNaN(event.lat) || isNaN(event.lng)) {
            return;
        }

        // Define if it's new or upcoming
        const eventStart = new Date(`${event.date}T${event.startTime}`);
        const isUpcoming = eventStart > now;
        const isNew = event.submittedAt && (Date.now() - event.submittedAt < 24 * 60 * 60 * 1000);
        const isDraft = event.id === 'draft';
        
        const isSpecial = isUpcoming || isNew || isDraft;

        const eventIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `
                <div class="relative w-10 h-10 drop-shadow-md hover:scale-110 transition-transform duration-200">
                     <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16 0 C10.48 0 6 4.48 6 10 C6 16.8 16 32 16 32 S26 16.8 26 10 C26 4.48 21.52 0 16 0 Z" fill="${isSpecial ? '#EF4444' : '#6D28D9'}"></path>
                        <circle cx="16" cy="10" r="4" fill="white"></circle>
                        ${isDraft ? '<circle cx="16" cy="10" r="2.5" fill="#EF4444" class="animate-pulse"></circle>' : ''}
                        ${!isDraft && isSpecial ? '<circle cx="24" cy="8" r="4" fill="#FBBF24" class="animate-pulse"></circle>' : ''}
                     </svg>
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -45]
        });

        const categories = Array.isArray(event.category) ? event.category : [event.category];
        const popupContent = `
            <div class="min-w-[200px] p-1 font-sans">
              <h3 class="font-bold text-primary-700 text-base m-0 leading-tight">${event.name}</h3>
              <div class="flex items-center mt-2 text-xs text-gray-600 font-semibold">
                 <span>📅 ${event.date}</span>
                 <span class="mx-1">•</span>
                 <span>🕒 ${event.startTime}</span>
              </div>
              <p class="text-xs text-gray-600 m-0 mt-1 truncate">📍 ${event.venue}</p>
              <div class="mt-2 flex flex-wrap gap-1">
                ${categories.map(cat => `<span class="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-full border border-gray-200">${cat}</span>`).join('')}
              </div>
            </div>
        `;

        try {
            const marker = L.marker([event.lat, event.lng], { 
                icon: eventIcon, 
                draggable: isDraft 
            });
            
            if (isDraft && onMapClick) {
                marker.on('dragend', (e: any) => {
                    const pos = e.target.getLatLng();
                    onMapClick(pos.lat, pos.lng);
                });
            }
            
            marker.bindPopup(popupContent).addTo(markersLayerRef.current);
        } catch (err) {
            console.warn("Skipping invalid marker for event:", event.name);
        }
    });

  }, [events, isMapReady]);

  // 4. Handle "Fly To" Center Logic
  useEffect(() => {
    if (!isMapReady || !mapRef.current || !centerOnEvent) return;
    
    try {
        if (typeof centerOnEvent.lat === 'number' && typeof centerOnEvent.lng === 'number') {
            const currentCenter = mapRef.current.getCenter();
            const dist = L.latLng(currentCenter).distanceTo([centerOnEvent.lat, centerOnEvent.lng]);
            // Only fly if distance is significant to avoid jitter
            if (dist > 50) { 
                 mapRef.current.flyTo([centerOnEvent.lat, centerOnEvent.lng], 16, { duration: 1.5 });
            }
        }
    } catch (e) {
        console.warn("FlyTo error", e);
    }
  }, [centerOnEvent, isMapReady]);

  const handleResetBearing = () => {
    if (mapRef.current && typeof mapRef.current.setBearing === 'function') {
        mapRef.current.setBearing(0);
        setBearing(0);
    }
  };

  const handleRecenter = () => {
    if (mapRef.current) {
        mapRef.current.flyTo([userLocation.lat, userLocation.lng], 16, {
            duration: 1.5
        });
    }
  };

  const handleZoomIn = () => {
    if (mapRef.current) {
        mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
        mapRef.current.zoomOut();
    }
  };

  // Check if className already contains 'relative', if not add it. 
  // This ensures absolute children are positioned correctly relative to this container.
  const containerClass = className?.includes('relative') ? className : `relative ${className}`;

  return (
    <div className={containerClass}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      
      {/* Status Overlay - Top Center */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 dark:bg-gray-800/90 backdrop-blur-md px-6 py-2.5 rounded-full shadow-2xl flex flex-col items-center border border-white/20 dark:border-gray-700 pointer-events-none scale-90 md:scale-100 origin-center">
          <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-[0.2em] mb-0.5">Live Connection</span>
          <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isLocationLive ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}></span>
              <span className="font-black text-[12px] text-gray-900 dark:text-white leading-none">
                  {isLocationLive ? 'STABLE' : 'SEARCHING...'}
              </span>
          </div>
      </div>

      {/* Zoom Controls - Top Left */}
      <div className="absolute top-6 left-6 z-[1000] flex flex-col rounded-2xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-2xl border border-white/20 dark:border-gray-700 overflow-hidden">
             <button 
                onClick={handleZoomIn}
                className="w-12 h-12 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 active:scale-95"
                title="Explore Closer"
             >
                <PlusIcon className="w-6 h-6" />
             </button>
             <button 
                onClick={handleZoomOut}
                className="w-12 h-12 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors active:scale-95"
                title="Bigger Picture"
             >
                <MinusIcon className="w-6 h-6" />
             </button>
      </div>

      {/* Recenter Button - Bottom Right */}
      <button 
        onClick={handleRecenter}
        className="absolute bottom-24 right-6 z-[1000] bg-white/95 dark:bg-gray-800/95 backdrop-blur-md text-primary-600 rounded-full shadow-2xl w-16 h-16 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-all border border-white/20 dark:border-gray-700 hover:scale-110 active:scale-90"
        title="Centrer on Me"
      >
        <LocateIcon className="w-9 h-9 pointer-events-none" />
      </button>
    </div>
  );
};

export default InteractiveMap;
