import { useState, useEffect } from 'react';
import { calculateSunPosition, getUserLocation, getSunIntensity, isDayTime, type UserLocation, type SunPosition } from '../utils/sunPosition';

export interface SunState {
  position: SunPosition | null;
  userLocation: UserLocation | null;
  sunIntensity: number;
  isDay: boolean;
  loading: boolean;
  error: string | null;
}

export function useSunPosition() {
  const [sunState, setSunState] = useState<SunState>({
    position: null,
    userLocation: null,
    sunIntensity: 0.5,
    isDay: true,
    loading: true,
    error: null
  });

  // Update sun position every minute
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const updateSunPosition = (location: UserLocation) => {
      const now = new Date();
      const position = calculateSunPosition(location.latitude, location.longitude, now);
      const intensity = getSunIntensity(location.latitude, location.longitude, now);
      const isDay = isDayTime(location.latitude, location.longitude, now);

      setSunState(prev => ({
        ...prev,
        position,
        sunIntensity: intensity,
        isDay,
        loading: false
      }));
    };

    const initializeLocation = async () => {
      try {
        const location = await getUserLocation();
        setSunState(prev => ({
          ...prev,
          userLocation: location,
          error: null
        }));

        updateSunPosition(location);

        // Update every minute
        intervalId = setInterval(() => {
          updateSunPosition(location);
        }, 60000);

      } catch (error) {
        setSunState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to get location',
          loading: false
        }));
      }
    };

    initializeLocation();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  return sunState;
}