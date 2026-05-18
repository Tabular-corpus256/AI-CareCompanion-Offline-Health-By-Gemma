import { useState, useEffect, useCallback, useRef } from 'react';
import { Linking } from 'react-native';

// IP geolocation — works without any native module or permission.
// Accuracy: city level (~5-20 km). Sufficient for nearby-hospital search.
export type PermissionStatus = 'unknown' | 'ip' | 'error';

export interface LocationState {
  lat: number;
  lng: number;
  accuracy: number | null;
  locText: string;
  detecting: boolean;
  permissionStatus: PermissionStatus;
  error: string | null;
  retry: () => void;
  openSettings: () => void;
}

const FALLBACK_LAT = 19.076;
const FALLBACK_LNG = 72.8777;

type IpLoc = { lat: number; lng: number; city: string; country: string };

// Three independent free services — tried in order until one succeeds.
async function tryIpInfo(): Promise<IpLoc> {
  // ipinfo.io — 50k req/month free, no key, HTTPS
  const d = await fetch('https://ipinfo.io/json').then(r => r.json());
  const [lat, lng] = (d.loc ?? '').split(',').map(Number);
  if (!lat || !lng) throw new Error('ipinfo no coords');
  return { lat, lng, city: d.city ?? '', country: d.country ?? '' };
}

async function tryIpWho(): Promise<IpLoc> {
  // ipwho.is — completely free, HTTPS, no key
  const d = await fetch('https://ipwho.is/').then(r => r.json());
  if (!d.success) throw new Error('ipwho failed');
  return { lat: Number(d.latitude), lng: Number(d.longitude), city: d.city ?? '', country: d.country ?? '' };
}

async function tryFreeIpApi(): Promise<IpLoc> {
  // freeipapi.com — free tier, HTTPS, no key
  const d = await fetch('https://freeipapi.com/api/json').then(r => r.json());
  if (!d.latitude || !d.longitude) throw new Error('freeipapi no coords');
  return { lat: Number(d.latitude), lng: Number(d.longitude), city: d.cityName ?? '', country: d.countryName ?? '' };
}

async function getLocationFromIP(): Promise<IpLoc> {
  const services = [tryIpInfo, tryIpWho, tryFreeIpApi];
  let lastErr: any;
  for (const fn of services) {
    try { return await fn(); } catch (e) { lastErr = e; }
  }
  throw lastErr ?? new Error('All IP location services failed');
}

export function useLocation(): LocationState {
  const [lat, setLat] = useState(FALLBACK_LAT);
  const [lng, setLng] = useState(FALLBACK_LNG);
  const [locText, setLocText] = useState('Detecting location…');
  const [detecting, setDetecting] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('unknown');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const cancelled = useRef(false);

  const retry = useCallback(() => {
    setDetecting(true);
    setError(null);
    setPermissionStatus('unknown');
    setAttempt(n => n + 1);
  }, []);

  const openSettings = useCallback(() => Linking.openSettings(), []);

  useEffect(() => {
    cancelled.current = false;

    const run = async () => {
      try {
        const loc = await getLocationFromIP();
        if (cancelled.current) return;
        setLat(loc.lat);
        setLng(loc.lng);
        setLocText(loc.city ? `${loc.city}, ${loc.country}` : `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`);
        setPermissionStatus('ip');
        setError(null);
      } catch (e: any) {
        if (cancelled.current) return;
        setError(e?.message ?? 'Could not detect location');
        setLocText('Location unavailable');
        setPermissionStatus('error');
      } finally {
        if (!cancelled.current) setDetecting(false);
      }
    };

    run();
    return () => { cancelled.current = true; };
  }, [attempt]);

  return { lat, lng, accuracy: null, locText, detecting, permissionStatus, error, retry, openSettings };
}
