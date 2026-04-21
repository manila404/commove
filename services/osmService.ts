
const GEOAPIFY_API_KEY = '96056c5a5f684989a8c9bf0eb2b76518';

/**
 * Searches for address suggestions using Geoapify Autocomplete API (OSM powered).
 */
export const searchAddressGeoapify = async (query: string): Promise<any[]> => {
    if (query.length < 3) return [];
    
    try {
        const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&apiKey=${GEOAPIFY_API_KEY}&filter=countrycode:ph&limit=10`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Geoapify autocomplete error: ${response.statusText}`);
        
        const data = await response.json();
        if (!data.features) return [];

        return data.features.map((f: any) => ({
            name: f.properties.name || f.properties.formatted.split(',')[0],
            address: f.properties.formatted,
            city: f.properties.city || f.properties.municipality || '',
            province: f.properties.state || f.properties.region || '',
            lat: f.properties.lat,
            lng: f.properties.lon,
            isGeoapify: true
        }));
    } catch (error) {
        console.error("Address search error (Geoapify):", error);
        return [];
    }
};

/**
 * Searches for address suggestions using Nominatim (OpenStreetMap) API.
 */
export const searchAddress = async (query: string, type: 'province' | 'city' | 'street'): Promise<any[]> => {
    if (query.length < 3) return [];
    
    try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=15&countrycodes=ph`;
        const response = await fetch(url, {
            headers: {
                'Accept-Language': 'en-US,en;q=0.9',
                'User-Agent': 'EventApp/1.0'
            }
        });
        if (!response.ok) throw new Error(`Nominatim autocomplete error: ${response.statusText}`);
        
        const data = await response.json();
        return data.map((f: any) => ({
            displayName: f.display_name,
            province: f.address.state || f.address.region,
            city: f.address.city || f.address.town || f.address.county,

            street: f.address.road,
            lat: parseFloat(f.lat),
            lng: parseFloat(f.lon)
        }));
    } catch (error) {
        console.error("Address search error (Nominatim):", error);
        return [];
    }
};

/**
 * Fetches street names around a specific coordinate using Overpass API.
 */
export const getStreetsFromOSM = async (lat: number, lng: number): Promise<string[]> => {
    try {
        const query = `
            [out:json];
            way(around:1000,${lat},${lng})["highway"]["name"];
            out tags;
        `;
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Overpass API error: ${response.statusText}`);
        
        const data = await response.json();
        const streets = new Set<string>();
        
        if (data && data.elements) {
            data.elements.forEach((e: any) => {
                if (e.tags && e.tags.name) streets.add(e.tags.name);
            });
        }
        
        return Array.from(streets).sort();
    } catch (e) {
        console.error("Failed to fetch streets (Overpass):", e);
        return [];
    }
};

/**
 * Reverse geocodes coordinates to an address string using Nominatim API.
 */
export const reverseGeocode = async (lat: number, lng: number): Promise<{ displayName: string, city: string } | null> => {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
        const response = await fetch(url, {
            headers: {
                'Accept-Language': 'en-US,en;q=0.9',
                'User-Agent': 'EventApp/1.0'
            }
        });
        if (!response.ok) throw new Error(`Nominatim reverse geocoding error: ${response.statusText}`);
        
        const data = await response.json();
        if (data && data.address) {
            return {
                displayName: data.display_name,
                city: data.address.city || data.address.town || data.address.county || ''
            };
        }
        return null;
    } catch (error) {
        console.error("Reverse geocoding error (Nominatim):", error);
        return null;
    }
};

/**
 * Geocodes an address string to precise coordinates using Nominatim API.
 */
export const geocodeLocation = async (query: string): Promise<{ lat: number; lng: number; displayName: string } | null> => {
    try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=ph`;
        const response = await fetch(url, {
            headers: {
                'Accept-Language': 'en-US,en;q=0.9',
                'User-Agent': 'EventApp/1.0'
            }
        });
        if (!response.ok) throw new Error(`Nominatim geocoding error: ${response.statusText}`);
        
        const data = await response.json();
        if (data && data.length > 0) {
            const f = data[0];
            return {
                lat: parseFloat(f.lat),
                lng: parseFloat(f.lon),
                displayName: f.display_name
            };
        }
        return null;
    } catch (error) {
        console.error("Geocoding error (Nominatim):", error);
        return null;
    }
};
