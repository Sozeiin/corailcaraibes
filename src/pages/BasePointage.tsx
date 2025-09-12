import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatMinutes } from '@/features/timeclock/utils/dateUtils';

interface Session {
  id: string;
  user_id: string;
  start_ts: string;
  end_ts: string | null;
  duration_regular_min: number;
  duration_overtime_min: number;
  has_anomaly: boolean;
}

export default function BasePointage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user?.baseId) return;
      const { data } = await supabase
        .from('time_sessions')
        .select('*')
        .eq('site_id', user.baseId)
        .order('start_ts', { ascending: false });
      setSessions(data || []);
    };
    load();
  }, [user?.baseId]);

  return (
    <div className="p-4">
      <h1 className="text-xl mb-4">Sessions de l'équipe</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>Utilisateur</th>
            <th>Début</th>
            <th>Fin</th>
            <th>Normales</th>
            <th>Sup.</th>
            <th>Anomalie</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id} className="border-t">
              <td>{s.user_id}</td>
              <td>{new Date(s.start_ts).toLocaleString()}</td>
              <td>{s.end_ts ? new Date(s.end_ts).toLocaleString() : '-'}</td>
              <td>{formatMinutes(s.duration_regular_min)}</td>
              <td>{formatMinutes(s.duration_overtime_min)}</td>
              <td>{s.has_anomaly ? '⚠️' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
