// Utility functions for geocoding addresses to extract location information

export interface LocationInfo {
  city: string | null;
  state: string | null;
  stateCode: string | null;
  locationDisplay: string | null;
  lat?: number;
  lng?: number;
}

/**
 * Extracts city and state information from a Google Maps place object
 */
export function extractLocationFromPlace(place: google.maps.places.PlaceResult): LocationInfo {
  let city: string | null = null;
  let state: string | null = null;
  let stateCode: string | null = null;

  if (place.address_components) {
    for (const component of place.address_components) {
      const types = component.types || [];
      
      // Extract city (locality)
      if (types.includes('locality')) {
        city = component.long_name;
      }
      
      // Extract state (administrative_area_level_1)
      if (types.includes('administrative_area_level_1')) {
        state = component.long_name;
        stateCode = component.short_name;
      }
    }
  }

  // Create display string
  let locationDisplay: string | null = null;
  if (city && stateCode) {
    locationDisplay = `${city}, ${stateCode}`;
  } else if (state) {
    locationDisplay = state;
  }

  return {
    city,
    state,
    stateCode,
    locationDisplay,
    lat: place.geometry?.location?.lat(),
    lng: place.geometry?.location?.lng()
  };
}

/**
 * Geocodes an address string to extract location information
 * This function must be called from client-side where Google Maps is loaded
 */
export async function geocodeAddress(address: string): Promise<LocationInfo> {
  return new Promise((resolve, reject) => {
    if (!window.google || !window.google.maps) {
      reject(new Error('Google Maps not loaded'));
      return;
    }

    const geocoder = new window.google.maps.Geocoder();
    
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const place = results[0];
        let city: string | null = null;
        let state: string | null = null;
        let stateCode: string | null = null;

        // Extract components
        for (const component of place.address_components) {
          const types = component.types || [];
          
          if (types.includes('locality')) {
            city = component.long_name;
          }
          
          if (types.includes('administrative_area_level_1')) {
            state = component.long_name;
            stateCode = component.short_name;
          }
        }

        // Create display string
        let locationDisplay: string | null = null;
        if (city && stateCode) {
          locationDisplay = `${city}, ${stateCode}`;
        } else if (state) {
          locationDisplay = state;
        }

        resolve({
          city,
          state,
          stateCode,
          locationDisplay,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        });
      } else {
        reject(new Error(`Geocoding failed: ${status}`));
      }
    });
  });
}

/**
 * Simple location matching function
 * Returns a score based on how well two locations match
 */
export function getLocationMatchScore(
  userLocation: LocationInfo,
  campaignLocation: { city?: string | null; state?: string | null }
): number {
  if (!campaignLocation.city && !campaignLocation.state) {
    // National campaign
    return 1;
  }

  let score = 0;

  // Exact city match (highest priority)
  if (userLocation.city && campaignLocation.city && 
      userLocation.city.toLowerCase() === campaignLocation.city.toLowerCase()) {
    score += 100;
  }

  // State match
  if (userLocation.state && campaignLocation.state) {
    const userState = userLocation.stateCode || userLocation.state;
    const campaignState = campaignLocation.state;
    
    if (userState.toLowerCase() === campaignState.toLowerCase()) {
      score += 10;
    }
  }

  return score;
}

/**
 * Cache for geocoding results to minimize API calls
 */
const geocodingCache = new Map<string, LocationInfo>();

/**
 * Geocodes an address with caching
 */
export async function geocodeAddressWithCache(address: string): Promise<LocationInfo> {
  // Check cache first
  const cached = geocodingCache.get(address);
  if (cached) {
    return cached;
  }

  // Geocode and cache result
  const result = await geocodeAddress(address);
  geocodingCache.set(address, result);
  
  // Also cache in localStorage for persistence
  try {
    const cacheData = localStorage.getItem('geocodingCache');
    const cache = cacheData ? JSON.parse(cacheData) : {};
    cache[address] = result;
    localStorage.setItem('geocodingCache', JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to cache geocoding result:', e);
  }

  return result;
}

/**
 * Loads geocoding cache from localStorage
 */
export function loadGeocodingCache(): void {
  try {
    const cacheData = localStorage.getItem('geocodingCache');
    if (cacheData) {
      const cache = JSON.parse(cacheData);
      Object.entries(cache).forEach(([address, location]) => {
        geocodingCache.set(address, location as LocationInfo);
      });
    }
  } catch (e) {
    console.warn('Failed to load geocoding cache:', e);
  }
}