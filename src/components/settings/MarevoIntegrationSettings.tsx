import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Plug,
  RefreshCw,
  Save,
  Ship,
  Zap,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const SUPABASE_FUNCTIONS_URL = 'https://gdhiiynmlokocelkqsiz.supabase.co/functions/v1';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;


interface MarevoConfigRow {
  id: string;
  marevo_base_url: string;
  marevo_api_base_url: string | null;
  marevo_app_id: string | null;
  marevo_api_key: string | null;
  marevo_tenant_id: string | null;
  webhook_secret: string | null;
  sync_enabled: boolean;
  sync_boats_enabled: boolean;
  sync_bookings_enabled: boolean;
  last_sync_at: string | null;
  updated_at: string;
}

interface SyncLogRow {
  id: string;
  direction: string;
  endpoint: string | null;
  entity_type: string;
  entity_id: string | null;
  request_payload: unknown;
  response_payload: unknown;
  http_status: number | null;
  status: string;
  error_message: string | null;
  attempt: number;
  created_at: string;
}

interface BoatMappingRow {
  id: string;
  name: string;
  model: string | null;
  status: string | null;
  bases: { name: string } | null;
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  success: 'default',
  skipped: 'secondary',
  error: 'destructive',
};

function randomSecret(length = 64) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

function FieldCheck({ filled }: { filled: boolean }) {
  if (!filled) return null;
  return <Check className="h-4 w-4 text-primary" aria-label="Renseigné" />;
}

export function MarevoIntegrationSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isDirection = user?.role === 'direction';

  const [baseUrl, setBaseUrl] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('https://marevobooking.base44.app/api');
  const [appId, setAppId] = useState('');
  const [importing, setImporting] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncBoats, setSyncBoats] = useState(true);
  const [syncBookings, setSyncBookings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const { data: config, isLoading } = useQuery({
    queryKey: ['marevo-config', user?.id],
    enabled: !!user?.id && isDirection,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marevo_integration_config')
        .select('*')
        .eq('singleton', true)
        .maybeSingle();
      if (error) throw error;
      return (data as MarevoConfigRow) ?? null;
    },
  });

  const { data: logs } = useQuery({
    queryKey: ['marevo-sync-log', user?.id],
    enabled: !!user?.id && isDirection,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marevo_sync_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as SyncLogRow[];
    },
  });

  const { data: boats } = useQuery({
    queryKey: ['marevo-fleet-mapping', user?.id],
    enabled: !!user?.id && isDirection,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boats')
        .select('id, name, model, status, bases(name)')
        .order('name');
      if (error) throw error;
      return (data ?? []) as BoatMappingRow[];
    },
  });


  useEffect(() => {
    if (!config) return;
    setBaseUrl(config.marevo_base_url ?? '');
    setApiBaseUrl(config.marevo_api_base_url ?? 'https://marevobooking.base44.app/api');
    setAppId(config.marevo_app_id ?? '');
    setApiKey(config.marevo_api_key ?? '');
    setTenantId(config.marevo_tenant_id ?? '');
    setWebhookSecret(config.webhook_secret ?? '');
    setSyncEnabled(config.sync_enabled);
    setSyncBoats(config.sync_boats_enabled);
    setSyncBookings(config.sync_bookings_enabled);
  }, [config]);

  const inboundWebhookUrl = useMemo(() => `${SUPABASE_FUNCTIONS_URL}/marevo-webhook`, []);
  const fleetSyncUrl = useMemo(() => `${SUPABASE_FUNCTIONS_URL}/marevo-fleet-sync`, []);

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copié`);
    } catch {
      toast.error('Copie impossible');
    }
  };

  const copyMappingJson = () => {
    const payload = {
      event: 'boat.sync',
      boats: (boats ?? []).map((b) => ({
        marevo_boat_id: b.id,
        name: b.name,
        status: b.status ?? 'available',
      })),
    };
    copy(JSON.stringify(payload, null, 2), 'Correspondance de la flotte');
  };

  const exportMappingCsv = () => {
    const escape = (v: string | null | undefined) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      'corail_boat_id,nom,modele,base,statut',
      ...(boats ?? []).map((b) =>
        [escape(b.id), escape(b.name), escape(b.model), escape(b.bases?.name), escape(b.status)].join(','),
      ),
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `correspondance-flotte-corail-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('Export CSV généré');
  };


  const handleSave = async () => {
    if (!baseUrl.trim()) {
      toast.error("L'URL Marevo est obligatoire");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        singleton: true,
        marevo_base_url: baseUrl.trim(),
        marevo_api_base_url: apiBaseUrl.trim() || null,
        marevo_app_id: appId.trim() || null,
        marevo_api_key: apiKey.trim() || null,
        marevo_tenant_id: tenantId.trim() || null,
        webhook_secret: webhookSecret.trim() || null,
        sync_enabled: syncEnabled,
        sync_boats_enabled: syncBoats,
        sync_bookings_enabled: syncBookings,
      };
      const { error } = await supabase
        .from('marevo_integration_config')
        .upsert(payload, { onConflict: 'singleton' });
      if (error) throw error;
      toast.success('Configuration enregistrée');
      await queryClient.invalidateQueries({ queryKey: ['marevo-config'] });
    } catch (e) {
      toast.error(`Enregistrement impossible : ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const invoke = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('marevo-sync', { body });
    if (error) throw error;
    return data as { success?: boolean; message?: string; error?: string; skipped?: boolean };
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await invoke({ action: 'test_connection' });
      const message = res.message ?? res.error ?? 'Réponse inattendue';
      setTestResult(message);
      res.success ? toast.success(message) : toast.error(message);
    } catch (e) {
      const message = (e as Error).message;
      setTestResult(message);
      toast.error(`Test impossible : ${message}`);
    } finally {
      setTesting(false);
      queryClient.invalidateQueries({ queryKey: ['marevo-sync-log'] });
    }
  };

  const handleImportBookings = async () => {
    setImporting(true);
    try {
      const res = (await invoke({ action: 'pull_bookings' })) as {
        success?: boolean;
        imported?: number;
        cancelled?: number;
        error?: string;
      };
      if (res.success) {
        toast.success(
          `${res.imported ?? 0} réservation(s) importée(s) · ${res.cancelled ?? 0} annulation(s) traitée(s)`,
        );
      } else {
        toast.error(res.error ?? 'Import impossible');
      }
    } catch (e) {
      toast.error(`Import impossible : ${(e as Error).message}`);
    } finally {
      setImporting(false);
      queryClient.invalidateQueries({ queryKey: ['marevo-sync-log'] });
      queryClient.invalidateQueries({ queryKey: ['marevo-config'] });
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const res = await invoke({ action: 'sync_all' });
      if (res.skipped) toast.info('Synchronisation désactivée : rien envoyé');
      else if (res.success) toast.success('Synchronisation lancée');
      else toast.error(res.error ?? 'Échec de la synchronisation');
    } catch (e) {
      toast.error(`Synchronisation impossible : ${(e as Error).message}`);
    } finally {
      setSyncing(false);
      queryClient.invalidateQueries({ queryKey: ['marevo-sync-log'] });
      queryClient.invalidateQueries({ queryKey: ['marevo-config'] });
    }
  };

  if (!isDirection) {
    return (
      <p className="text-sm text-muted-foreground">
        Cette configuration est réservée au profil direction.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement de la configuration…
      </div>
    );
  }

  const inboundWebhookUrlWithToken = webhookSecret
    ? `${inboundWebhookUrl}?apikey=${SUPABASE_PUBLISHABLE_KEY}&token=${webhookSecret}`
    : inboundWebhookUrl;
  const checkinAliasUrlWithToken = webhookSecret
    ? `${SUPABASE_FUNCTIONS_URL}/create-checkin-from-booking?apikey=${SUPABASE_PUBLISHABLE_KEY}&token=${webhookSecret}`
    : `${SUPABASE_FUNCTIONS_URL}/create-checkin-from-booking`;
  const fleetSyncUrlWithToken = webhookSecret
    ? `${fleetSyncUrl}?apikey=${SUPABASE_PUBLISHABLE_KEY}&token=${webhookSecret}`
    : fleetSyncUrl;


  const handleGenerateInboundKey = async () => {
    const key = `cc_${randomSecret(56)}`;
    setSaving(true);
    try {
      const { error } = await supabase.from('marevo_integration_config').upsert(
        {
          singleton: true,
          marevo_base_url: baseUrl.trim() || 'https://marevo.invalid',
          marevo_api_key: apiKey.trim() || null,
          marevo_tenant_id: tenantId.trim() || null,
          webhook_secret: key,
          sync_enabled: syncEnabled,
          sync_boats_enabled: syncBoats,
          sync_bookings_enabled: syncBookings,
        },
        { onConflict: 'singleton' },
      );
      if (error) throw error;
      setWebhookSecret(key);
      setShowSecret(true);
      await navigator.clipboard.writeText(key).catch(() => undefined);
      toast.success('Clé API Corail Caraïbes générée et copiée');
      await queryClient.invalidateQueries({ queryKey: ['marevo-config'] });
    } catch (e) {
      toast.error(`Génération impossible : ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-5 w-5" />
            Connecter Marevo Booking à Corail Caraïbes
          </CardTitle>
          <CardDescription>
            Générez la clé API Corail Caraïbes, puis collez la clé et l'URL du webhook dans Marevo Booking.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Clé API Corail Caraïbes <FieldCheck filled={!!webhookSecret} />
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                readOnly
                type={showSecret ? 'text' : 'password'}
                value={webhookSecret}
                placeholder="Aucune clé générée"
                className="flex-1 font-mono text-xs"
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="icon" onClick={() => setShowSecret((v) => !v)}>
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!webhookSecret}
                  onClick={() => copy(webhookSecret, 'Clé API')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button type="button" onClick={handleGenerateInboundKey} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="mr-2 h-4 w-4" />
                  )}
                  {webhookSecret ? 'Régénérer' : 'Générer la clé'}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              La clé est enregistrée immédiatement. Régénérer invalide l'ancienne clé.
            </p>
          </div>

          <div className="space-y-2">
            <Label>URL API check-in/statuts Corail (à coller dans Marevo Booking)</Label>
            <div className="flex gap-2">
              <Input readOnly value={inboundWebhookUrlWithToken} className="font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => copy(inboundWebhookUrlWithToken, 'URL API check-in/statuts')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Endpoint entrant : création/mise à jour des réservations, création des fiches check-in, et
              réception des statuts. Ne pas utiliser l'URL flotte ici. Marevo peut aussi envoyer la clé dans
              l'en-tête <code>x-api-key</code>, <code>x-webhook-secret</code> ou{' '}
              <code>Authorization: Bearer</code> au lieu du paramètre <code>token</code>. N'utilisez jamais
              l'en-tête <code>apikey</code> pour la clé Corail : il est réservé à la clé publique ci-dessous.
            </p>
            <p className="text-xs text-muted-foreground">
              Alias équivalent (si Marevo attend <code>create-checkin-from-booking</code>) :{' '}
              <code className="break-all">{checkinAliasUrlWithToken}</code>
            </p>
          </div>

          <div className="space-y-2">
            <Label>Clé publique Supabase (en-tête « apikey », si Marevo l'exige)</Label>
            <div className="flex gap-2">
              <Input readOnly value={SUPABASE_PUBLISHABLE_KEY} className="font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => copy(SUPABASE_PUBLISHABLE_KEY, 'Clé publique')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Si Marevo répond « Clé API invalide » pour chaque bateau, c'est que sa clé est envoyée dans
              l'en-tête <code>apikey</code> : collez-y cette clé publique et laissez la clé Corail dans le{' '}
              <code>token</code> de l'URL.
            </p>
          </div>

        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Ship className="h-5 w-5" />
                Correspondance de la flotte
              </CardTitle>
              <CardDescription>
                Marevo doit envoyer l'identifiant Corail du bateau dans le champ <code>marevo_boat_id</code>.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={copyMappingJson} disabled={!boats?.length}>
                <Copy className="mr-2 h-4 w-4" />
                Copier (JSON)
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={exportMappingCsv} disabled={!boats?.length}>
                <Download className="mr-2 h-4 w-4" />
                Exporter CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL de synchronisation flotte Corail</Label>
            <div className="flex gap-2">
              <Input readOnly value={fleetSyncUrlWithToken} className="font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => copy(fleetSyncUrlWithToken, 'URL de synchronisation flotte')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Endpoint dédié exclusivement à la flotte. Corps attendu :{' '}
              <code>{'{ "event": "boat.sync", "boats": [{ "marevo_boat_id": "<uuid Corail>", "name": "…", "status": "available" }] }'}</code>
            </p>
          </div>

          <ScrollArea className="h-64 rounded-md border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                <tr className="text-left">
                  <th className="p-2 font-medium">Bateau</th>
                  <th className="hidden p-2 font-medium sm:table-cell">Base</th>
                  <th className="p-2 font-medium">Identifiant Corail</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {(boats ?? []).map((b) => (
                  <tr key={b.id} className="border-t">
                    <td className="p-2">
                      <div className="font-medium">{b.name}</div>
                      <div className="text-muted-foreground">{b.model ?? '—'}</div>
                    </td>
                    <td className="hidden p-2 sm:table-cell">{b.bases?.name ?? '—'}</td>
                    <td className="p-2 font-mono break-all">{b.id}</td>
                    <td className="p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => copy(b.id, `Identifiant ${b.name}`)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {!boats?.length && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">
                      Aucun bateau
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5" />
                Marevo Maintenance
              </CardTitle>
              <CardDescription>
                Connexion sortante et entrante entre Corail Caraïbes et Marevo Maintenance.
              </CardDescription>
            </div>
            {config && (
              <Badge variant="secondary">
                Configuration enregistrée · {new Date(config.updated_at).toLocaleString('fr-FR')}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="marevo-url" className="flex items-center gap-2">
              URL Marevo (ou URL de webhook complète) <FieldCheck filled={!!baseUrl.trim()} />
            </Label>
            <Input
              id="marevo-url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://…/functions/v1 ou URL de webhook avec token"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="marevo-api-url" className="flex items-center gap-2">
                URL de l'API Marevo Booking <FieldCheck filled={!!apiBaseUrl.trim()} />
              </Label>
              <Input
                id="marevo-api-url"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                placeholder="https://marevobooking.base44.app/api"
              />
              <p className="text-xs text-muted-foreground">
                Permet de lire les réservations et d'écrire le check-in / check-out dans la réservation Marevo.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="marevo-app-id" className="flex items-center gap-2">
                Identifiant application Marevo (optionnel) <FieldCheck filled={!!appId.trim()} />
              </Label>
              <Input
                id="marevo-app-id"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="697a49abec23233c4c28d9f8"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="marevo-key" className="flex items-center gap-2">
                Clé API Marevo <FieldCheck filled={!!apiKey.trim()} />
              </Label>
              <div className="flex gap-2">
                <Input
                  id="marevo-key"
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Clé API Marevo Booking"
                  autoComplete="off"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => setShowKey((v) => !v)}>
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="marevo-tenant" className="flex items-center gap-2">
                Identifiant tenant Marevo (optionnel) <FieldCheck filled={!!tenantId.trim()} />
              </Label>
              <Input
                id="marevo-tenant"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="6984dc4e…"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="marevo-secret" className="flex items-center gap-2">
              Secret webhook entrant <FieldCheck filled={!!webhookSecret.trim()} />
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex flex-1 gap-2">
                <Input
                  id="marevo-secret"
                  type={showSecret ? 'text' : 'password'}
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="64 caractères"
                  autoComplete="off"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => setShowSecret((v) => !v)}>
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setWebhookSecret(randomSecret(64))}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Générer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!webhookSecret}
                  onClick={() => copy(webhookSecret, 'Secret')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              À renseigner côté Marevo dans l'en-tête <code>x-webhook-secret</code>.
            </p>
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Synchronisation automatique</p>
                <p className="text-xs text-muted-foreground">
                  Envoi automatique + synchronisation planifiée toutes les 15 minutes
                </p>
              </div>
              <Switch checked={syncEnabled} onCheckedChange={setSyncEnabled} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm">Réservations (check-in)</p>
              <Switch checked={syncBookings} onCheckedChange={setSyncBookings} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm">Bateaux</p>
              <Switch checked={syncBoats} onCheckedChange={setSyncBoats} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">URL du webhook entrant (Marevo → Corail)</Label>
            <div className="flex gap-2">
              <Input readOnly value={inboundWebhookUrl} className="font-mono text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={() => copy(inboundWebhookUrl, 'URL')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleImportBookings} disabled={importing}>
              {importing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Importer les réservations
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Sauvegarder la configuration
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing || !baseUrl.trim()}>
              {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plug className="mr-2 h-4 w-4" />}
              Tester la connexion
            </Button>
            <Button variant="outline" onClick={handleSyncNow} disabled={syncing}>
              {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              Synchroniser maintenant
            </Button>
          </div>

          {testResult && <p className="text-sm text-muted-foreground">{testResult}</p>}
          {config?.last_sync_at && (
            <p className="text-xs text-muted-foreground">
              Dernière synchronisation : {new Date(config.last_sync_at).toLocaleString('fr-FR')}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Historique de synchronisation</CardTitle>
              <CardDescription>50 derniers événements, entrants et sortants</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['marevo-sync-log'] })}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!logs?.length ? (
            <p className="text-sm text-muted-foreground">Aucun événement enregistré.</p>
          ) : (
            <ScrollArea className="h-[420px] pr-2">
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={STATUS_VARIANT[log.status] ?? 'secondary'}>{log.status}</Badge>
                      <Badge variant="outline">{log.direction === 'inbound' ? 'entrant' : 'sortant'}</Badge>
                      <span className="text-sm font-medium">
                        {log.entity_type} · {log.endpoint ?? '—'}
                      </span>
                      {log.http_status ? (
                        <span className="text-xs text-muted-foreground">HTTP {log.http_status}</span>
                      ) : null}
                      {log.attempt > 1 && (
                        <span className="text-xs text-muted-foreground">tentative {log.attempt}</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString('fr-FR')}
                      {log.entity_id ? ` · ${log.entity_id}` : ''}
                    </p>
                    {log.error_message && (
                      <p className="mt-1 text-xs text-destructive">{log.error_message}</p>
                    )}
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                    >
                      {expanded === log.id ? 'Masquer le détail' : 'Voir le détail'}
                    </Button>
                    {expanded === log.id && (
                      <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted p-2 text-[11px]">
                        {JSON.stringify(
                          { request: log.request_payload, response: log.response_payload },
                          null,
                          2,
                        )}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
