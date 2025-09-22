/**
 * Geographic data utilities for enhanced globe visualization
 */

export interface CountryData {
  id: string;
  name: string;
  geometry: GeoJSON.Geometry;
  properties: Record<string, unknown>;
}

/**
 * Fetch world countries topology data
 */
export async function fetchCountriesData(): Promise<CountryData[]> {
  try {
    // Use Natural Earth data - a public domain map dataset
    const response = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@3/countries-110m.json');
    const world = await response.json();

    // Convert topojson to geojson features
    const { feature } = await import('topojson-client');
    const countries = feature(world, world.objects.countries);

    return countries.features.map((country: GeoJSON.Feature) => ({
      id: String(country.id),
      name: (country.properties?.NAME as string) || 'Unknown',
      geometry: country.geometry as GeoJSON.Geometry,
      properties: country.properties || {}
    }));
  } catch (error) {
    console.warn('Failed to load countries data:', error);
    return [];
  }
}

/**
 * Get enhanced location data with country context
 */
export function getLocationWithCountryContext(lat: number, lng: number) {
  // This would typically use a reverse geocoding service
  // For now, return basic location info
  return {
    coordinates: [lat, lng] as [number, number],
    country: 'Unknown',
    region: 'Unknown',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

/**
 * Calculate distance between two coordinates in kilometers
 */
export function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generate great circle path between two points
 */
export function generateGreatCirclePath(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
  numPoints: number = 100
): Array<[number, number]> {
  const path: Array<[number, number]> = [];

  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;

    // Spherical interpolation
    const lat1Rad = lat1 * Math.PI / 180;
    const lng1Rad = lng1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    const lng2Rad = lng2 * Math.PI / 180;

    const d = 2 * Math.asin(Math.sqrt(
      Math.pow(Math.sin((lat1Rad - lat2Rad) / 2), 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) *
      Math.pow(Math.sin((lng1Rad - lng2Rad) / 2), 2)
    ));

    const a = Math.sin((1 - f) * d) / Math.sin(d);
    const b = Math.sin(f * d) / Math.sin(d);

    const x = a * Math.cos(lat1Rad) * Math.cos(lng1Rad) +
              b * Math.cos(lat2Rad) * Math.cos(lng2Rad);
    const y = a * Math.cos(lat1Rad) * Math.sin(lng1Rad) +
              b * Math.cos(lat2Rad) * Math.sin(lng2Rad);
    const z = a * Math.sin(lat1Rad) + b * Math.sin(lat2Rad);

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * 180 / Math.PI;
    const lng = Math.atan2(y, x) * 180 / Math.PI;

    path.push([lat, lng]);
  }

  return path;
}