import { supabase } from '@/integrations/supabase/client';

export type PunchKind = 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END';

export interface TimePunchInput {
  site_id: string;
  kind: PunchKind;
  client_ts: string;
  lat?: number;
  lng?: number;
  accuracy_m?: number;
  distance_m?: number;
  is_within_geofence?: boolean;
  device_id?: string;
  notes?: string;
}

export async function insertPunch(punch: TimePunchInput) {
  const { data, error } = await supabase
    .from('time_punches')
    .insert(punch)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchTimeRules(siteId: string) {
  const { data, error } = await supabase
    .from('time_rules')
    .select('*')
    .eq('site_id', siteId)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchSessions(userId: string, start: string, end: string) {
  const { data, error } = await supabase
    .from('time_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('start_ts', start)
    .lt('start_ts', end)
    .order('start_ts');
  if (error) throw error;
  return data;
}
