import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { insertPunch } from '@/features/timeclock/api/timeclockApi';
import { useGeofence } from '@/features/timeclock/hooks/useGeofence';
import { supabase } from '@/integrations/supabase/client';

export default function TechnicianPointage() {
  const { user } = useAuth();
  const [site, setSite] = useState<any>(null);

  useEffect(() => {
    const loadSite = async () => {
      if (user?.baseId) {
        const { data } = await supabase
          .from('sites')
          .select('*')
          .eq('id', user.baseId)
          .single();
        setSite(data);
      }
    };
    loadSite();
  }, [user?.baseId]);

  const geo = useGeofence(
    site
      ? { lat: site.lat, lng: site.lng, radius: site.geofence_radius_m || 20 }
      : { lat: 0, lng: 0, radius: 0 }
  );

  const handlePunch = async () => {
    if (!site) return;
    try {
      await insertPunch({
        site_id: site.id,
        kind: 'IN',
        client_ts: new Date().toISOString(),
        lat: geo.lat ?? undefined,
        lng: geo.lng ?? undefined,
        accuracy_m: geo.accuracy ?? undefined,
        distance_m: geo.distance ?? undefined,
        is_within_geofence: geo.isWithin,
        device_id: geo.deviceId,
      });
      alert('Pointage enregistré');
    } catch (e) {
      console.error(e);
      alert('Erreur lors du pointage');
    }
  };

  if (!site) return <div>Chargement...</div>;

  return (
    <div className="p-4">
      <div className="mb-4">
        <p>Distance: {geo.distance?.toFixed(1)} m</p>
        <p>
          Statut géofence: {geo.isWithin ? '✅ dans la zone' : '❌ hors zone'}
        </p>
      </div>
      <Button onClick={handlePunch} disabled={!geo.isWithin} className="w-full h-24 text-xl">
        Pointer
      </Button>
    </div>
  );
}
