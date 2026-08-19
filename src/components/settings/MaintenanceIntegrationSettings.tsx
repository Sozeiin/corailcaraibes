import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, KeyRound, Loader2, Plug, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { MaintenanceSyncHistory } from './MaintenanceSyncHistory';

export function MaintenanceIntegrationSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);

  const { data: integration, isLoading } = useQuery({
    queryKey: ['maintenance-integration'],
    enabled: user?.role === 'direction',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_integrations')
        .select('id, maintenance_api_url, webhook_secret, inbound_api_key, inbound_api_key_created_at, marevo_tenant_id, is_active, updated_at')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (integration) {
      setApiUrl(integration.maintenance_api_url ?? '');
      setWebhookSecret(integration.webhook_secret ?? '');
      setTenantId(integration.marevo_tenant_id ?? '');
      setIsActive(integration.is_active ?? true);
    }
  }, [integration]);

  if (user?.role !== 'direction') {
    return (
      <p className="text-sm text-muted-foreground">
        Cette configuration est réservée au profil direction.
      </p>
    );
  }

  const generateSecret = () => {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    setWebhookSecret(Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join(''));
  };

  const randomHex = (bytes: number) => {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  const handleGenerateInboundKey = async () => {
    if (!integration?.id) {
      toast.error("Enregistrez d'abord la configuration avant de générer une clé");
      return;
    }
    if (
      integration.inbound_api_key &&
      !window.confirm('Générer une nouvelle clé invalidera la clé actuelle utilisée par Marevo. Continuer ?')
    ) {
      return;
    }
    setGeneratingKey(true);
    try {
      const newKey = `cc_${randomHex(24)}`;
      const { error } = await supabase
        .from('maintenance_integrations')
        .update({ inbound_api_key: newKey, inbound_api_key_created_at: new Date().toISOString() })
        .eq('id', integration.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['maintenance-integration'] });
      toast.success('Nouvelle clé API générée — copiez-la dans Marevo');
    } catch (e) {
      toast.error(`Génération impossible : ${(e as Error).message}`);
    } finally {
      setGeneratingKey(false);
    }
  };

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiée`);
    } catch {
      toast.error('Copie impossible, sélectionnez le texte manuellement');
    }
  };

  const handleSave = async () => {
    if (!apiUrl.trim()) {
      toast.error("L'URL de l'API Maintenance est requise");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('save-maintenance-credentials', {
        body: {
          maintenance_api_url: apiUrl.trim(),
          ...(apiKey.trim() ? { maintenance_api_key: apiKey.trim() } : {}),
          ...(webhookSecret.trim() ? { webhook_secret: webhookSecret.trim() } : {}),
          marevo_tenant_id: tenantId.trim() || null,
          is_active: isActive,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error(JSON.stringify((data as any).error));

      setApiKey('');
      toast.success('Configuration enregistrée');
      queryClient.invalidateQueries({ queryKey: ['maintenance-integration'] });
    } catch (e) {
      toast.error(`Échec de l'enregistrement : ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-maintenance-connection', {
        body: {},
      });
      if (error) throw error;
      const result = data as { ok?: boolean; error?: string; status?: number };
      if (result?.ok) {
        toast.success('Connexion à Marevo Maintenance réussie');
      } else if (result?.error === 'no_integration') {
        toast.error("Aucune clé API enregistrée : sauvegardez d'abord la configuration");
      } else {
        toast.error(`Échec de la connexion (${result?.status ?? 'erreur'})`);
      }
    } catch (e) {
      toast.error(`Test impossible : ${(e as Error).message}`);
    } finally {
      setTesting(false);
    }
  };

  const webhookUrl = `https://gdhiiynmlokocelkqsiz.supabase.co/functions/v1/receive-maintenance-webhook`;

  return (
    <Tabs defaultValue="config" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-flex">
        <TabsTrigger value="config">Configuration</TabsTrigger>
        <TabsTrigger value="history">Historique de synchronisation</TabsTrigger>
      </TabsList>

      <TabsContent value="config">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5" />
              Intégration Marevo Maintenance
              {integration && (
                <Badge variant={integration.is_active ? 'default' : 'secondary'}>
                  {integration.is_active ? 'Active' : 'Désactivée'}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Les réservations et les bateaux sont envoyés automatiquement à Marevo Maintenance.
              La clé API reste stockée chiffrée côté serveur et n'est jamais renvoyée à l'application.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="mi-url">URL de l'API Maintenance</Label>
                  <Input
                    id="mi-url"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="https://xxxx.supabase.co/functions/v1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mi-key">Clé API (x-api-key)</Label>
                  <Input
                    id="mi-key"
                    type="password"
                    autoComplete="new-password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={integration ? '•••••••• (inchangée)' : 'Coller la clé API Marevo'}
                  />
                  <p className="text-xs text-muted-foreground">
                    Laissez vide pour conserver la clé déjà enregistrée.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mi-secret">Secret de webhook</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="mi-secret"
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                      placeholder="Généré automatiquement si vide"
                    />
                    <Button type="button" variant="outline" onClick={generateSecret}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Générer
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground break-all">
                    URL à configurer côté Marevo : {webhookUrl} (en-tête <code>x-webhook-secret</code>)
                  </p>
                </div>

                <div className="space-y-2 rounded-lg border p-3">
                  <Label className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4" />
                    Clé API Corail Caraïbes (à coller dans Marevo)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    C'est la clé que Marevo doit utiliser pour appeler Corail Caraïbes (en-tête <code>x-api-key</code>).
                    La clé <code>mk_…</code> demandée par Marevo, elle, est fournie par Marevo et se colle dans le champ « Clé API » ci-dessus.
                  </p>
                  {integration?.inbound_api_key ? (
                    <>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input readOnly value={integration.inbound_api_key} className="font-mono text-xs" />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => copyToClipboard(integration.inbound_api_key!, 'Clé API')}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copier
                        </Button>
                      </div>
                      {integration.inbound_api_key_created_at && (
                        <p className="text-xs text-muted-foreground">
                          Générée le {new Date(integration.inbound_api_key_created_at).toLocaleString('fr-FR')}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucune clé générée pour le moment.</p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateInboundKey}
                    disabled={generatingKey}
                  >
                    {generatingKey ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="mr-2 h-4 w-4" />
                    )}
                    {integration?.inbound_api_key ? 'Régénérer la clé' : 'Générer une clé API'}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mi-tenant">Identifiant tenant Marevo (optionnel)</Label>
                  <Input
                    id="mi-tenant"
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    placeholder="uuid du tenant côté Maintenance"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">Synchronisation active</p>
                    <p className="text-sm text-muted-foreground">
                      Désactivez pour suspendre les envois sans perdre la configuration.
                    </p>
                  </div>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sauvegarder
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleTest}
                    disabled={testing}
                    className="w-full sm:w-auto"
                  >
                    {testing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="mr-2 h-4 w-4" />
                    )}
                    Tester la connexion
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="history">
        <MaintenanceSyncHistory />
      </TabsContent>
    </Tabs>
  );
}
