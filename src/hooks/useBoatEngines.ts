import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { compareEngineComponents } from '@/utils/engineComponentOrder';

export interface BoatEngine {
  id: string;
  component_name: string;
  component_type: string;
  current_engine_hours: number | null;
  last_oil_change_hours: number | null;
  oil_change_interval_hours: number | null;
}

export function useBoatEngines(boatId: string | undefined) {
  return useQuery({
    queryKey: ['boat-engines', boatId],
    queryFn: async () => {
      if (!boatId) return [];
      
      const { data, error } = await supabase
        .from('boat_components')
        .select('id, component_name, component_type, current_engine_hours, last_oil_change_hours, oil_change_interval_hours')
        .eq('boat_id', boatId)
        .or('component_type.ilike.%moteur%,component_type.ilike.%générateur%,component_type.ilike.%generator%,component_type.ilike.%engine%');
      
      if (error) throw error;
      const engines = (data || []) as BoatEngine[];
      return [...engines].sort((a, b) =>
        compareEngineComponents(
          { name: a.component_name, type: a.component_type },
          { name: b.component_name, type: b.component_type }
        )
      );
    },
    enabled: !!boatId,
  });
}
