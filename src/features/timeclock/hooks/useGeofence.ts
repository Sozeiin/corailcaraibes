import { useCallback, useEffect, useState } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { Device } from '@capacitor/device';
import { haversineDistance } from '../utils/distance';

interface UseGeofenceOptions {
  lat: number;
  lng: number;
  radius: number; // meters
}

interface GeofenceState {
  distance: number | null;
  accuracy: number | null;
  isWithin: boolean;
  lat: number | null;
  lng: number | null;
  deviceId?: string;
  loading: boolean;
}

export function useGeofence(opts: UseGeofenceOptions) {
  const [state, setState] = useState<GeofenceState>({
    distance: null,
    accuracy: null,
    isWithin: false,
    lat: null,
    lng: null,
    loading: true,
  });

  const refresh = useCallback(async () => {
    try {
      const position = await Geolocation.getCurrentPosition();
      const distance = haversineDistance(
        opts.lat,
        opts.lng,
        position.coords.latitude,
        position.coords.longitude,
      );
      const isWithin = distance <= opts.radius;
      const device = await Device.getId();
      setState({
        distance,
        accuracy: position.coords.accuracy ?? null,
        isWithin,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        deviceId: device.identifier,
        loading: false,
      });
    } catch (e) {
      console.error('Geofence error', e);
      setState((s) => ({ ...s, loading: false }));
    }
  }, [opts.lat, opts.lng, opts.radius]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}
