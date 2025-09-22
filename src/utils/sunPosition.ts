import SunCalc from 'suncalc';

export interface SunPosition {
  azimuth: number;
  altitude: number;
  declination: number;
  rightAscension: number;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  timezone: string;
}

/**
 * Calculate sun position for given location and time
 */
export function calculateSunPosition(lat: number, lng: number, date: Date = new Date()): SunPosition {
  const position = SunCalc.getPosition(date, lat, lng);

  return {
    azimuth: position.azimuth,
    altitude: position.altitude,
    declination: position.declination,
    rightAscension: position.rightAscension
  };
}

/**
 * Determine if it's day or night at given location
 */
export function isDayTime(lat: number, lng: number, date: Date = new Date()): boolean {
  const position = calculateSunPosition(lat, lng, date);
  return position.altitude > 0;
}

/**
 * Get sun intensity based on altitude (0-1)
 */
export function getSunIntensity(lat: number, lng: number, date: Date = new Date()): number {
  const position = calculateSunPosition(lat, lng, date);
  // Convert altitude to intensity (0 when sun is below horizon, 1 at zenith)
  return Math.max(0, Math.sin(position.altitude));
}

/**
 * Get terminator line coordinates (day/night boundary)
 */
export function getTerminatorLine(date: Date = new Date()): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const sunPosition = SunCalc.getPosition(date, 0, 0);

  // Calculate terminator line by finding points where sun altitude is 0
  for (let lng = -180; lng <= 180; lng += 2) {
    // Use solar declination to find latitude where sun is at horizon
    const lat = Math.asin(Math.tan(sunPosition.declination) * Math.tan((lng * Math.PI) / 180)) * (180 / Math.PI);

    if (!isNaN(lat) && lat >= -90 && lat <= 90) {
      points.push([lat, lng]);
    }
  }

  return points;
}

/**
 * Get user's current location using browser geolocation API
 */
export function getUserLocation(): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
      },
      (error) => {
        // Fallback to IP-based location or default
        console.warn('Geolocation failed:', error);
        resolve({
          latitude: 42.3601, // Boston default
          longitude: -71.0589,
          timezone: 'America/New_York'
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 300000 // 5 minutes
      }
    );
  });
}