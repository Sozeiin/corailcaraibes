import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RotateCw, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  success: 'default',
  pending: 'secondary',
  retrying: 'outline',
  failed: 'destructive',
};

const ENTITY_LABEL: Record<string, string> = {
  rental: 'Réservation',
  boat: 'Bateau',
};

export function MaintenanceSyncHistory() {
  const queryClient = useQueryClient();
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['maintenance-sync-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_sync_log')
        .select('id, entity_type, entity_id, action, status, attempts, last_error, external_id, last_attempt_at, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleRetry = async (log: { id: string; entity_type: string; entity_id: string; action: string }) => {
    const fn = log.entity_type === 'boat' ? 'sync-boat-to-maintenance' : 'sync-rental-to-maintenance';
    setRetryingId(log.id);
    try {
      const { data, error } = await supabase.functions.invoke(fn, {
        body: { entity_id: log.entity_id, log_id: log.id, action: log.action },
      });
      if (error) throw error;
      const result = data as { success?: boolean; error?: string; status?: number };
      if (result?.success) {
        toast.success('Synchronisation relancée avec succès');
      } else {
        toast.error(`Échec : ${result?.error ?? result?.status ?? 'inconnu'}`);
      }
      queryClient.invalidateQueries({ queryKey: ['maintenance-sync-log'] });
    } catch (e) {
      toast.error(`Relance impossible : ${(e as Error).message}`);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Historique de synchronisation
        </CardTitle>
        <CardDescription>
          100 derniers envois vers Marevo Maintenance. Les échecs sont relancés automatiquement toutes les 5 minutes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </div>
        ) : !logs?.length ? (
          <p className="text-sm text-muted-foreground">Aucune synchronisation enregistrée pour le moment.</p>
        ) : (
          <ScrollArea className="h-[420px] pr-2">
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={STATUS_VARIANT[log.status] ?? 'secondary'}>{log.status}</Badge>
                      <span className="text-sm font-medium">
                        {ENTITY_LABEL[log.entity_type] ?? log.entity_type} · {log.action}
                      </span>
                      {log.attempts > 0 && (
                        <span className="text-xs text-muted-foreground">{log.attempts} tentative(s)</span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString('fr-FR')} · {log.entity_id}
                    </p>
                    {log.last_error && (
                      <p className="truncate text-xs text-destructive">{log.last_error}</p>
                    )}
                  </div>
                  {log.status !== 'success' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRetry(log)}
                      disabled={retryingId === log.id}
                      className="shrink-0"
                    >
                      {retryingId === log.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCw className="mr-2 h-4 w-4" />
                      )}
                      Relancer
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
