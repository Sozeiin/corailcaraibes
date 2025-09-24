import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface TimeRule {
  id: string;
  site_id: string;
  daily_regular_minutes: number;
  auto_lunch_minutes: number;
  lunch_window_start: string;
  lunch_window_end: string;
  round_minutes: number;
  overtime_after_hour: string | null;
}

export default function TimeRulesPage() {
  const { user } = useAuth();
  const [rules, setRules] = useState<TimeRule[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('time_rules').select('*');
      setRules(data || []);
    };
    load();
  }, []);

  const handleSave = async (rule: TimeRule) => {
    await supabase.from('time_rules').update(rule).eq('id', rule.id);
    alert('Règles enregistrées');
  };

  if (user?.role !== 'direction') return <div>Accès refusé</div>;

  return (
    <div className="p-4">
      <h1 className="text-xl mb-4">Règles de pointage</h1>
      {rules.map((r) => (
        <div key={r.id} className="border p-4 mb-4 rounded">
          <p>Site: {r.site_id}</p>
          <p>Durée journalière: {r.daily_regular_minutes} min</p>
          <p>Pause auto: {r.auto_lunch_minutes} min</p>
          <Button onClick={() => handleSave(r)} className="mt-2">Sauvegarder</Button>
        </div>
      ))}
    </div>
  );
}
