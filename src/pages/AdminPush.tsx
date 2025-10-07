import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, Send, TestTube, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function AdminPush() {
  const { toast } = useToast();
  const [adminToken, setAdminToken] = useState('');
  const [isTokenVisible, setIsTokenVisible] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Test notification
  const [testUserId, setTestUserId] = useState('');
  const [isTestLoading, setIsTestLoading] = useState(false);

  // Grouped notification
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifUrl, setNotifUrl] = useState('');
  const [notifUserIds, setNotifUserIds] = useState('');
  const [notifBaseId, setNotifBaseId] = useState('');
  const [isSendLoading, setIsSendLoading] = useState(false);

  // Fetch subscriptions
  const { data: subscriptions, refetch } = useQuery({
    queryKey: ['push-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select(`
          *,
          profiles:user_id (name, email),
          bases:base_id (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isAuthenticated,
  });

  async function verifyToken() {
    if (!adminToken) {
      toast({
        title: 'Token requis',
        description: 'Veuillez saisir le token d\'administration',
        variant: 'destructive',
      });
      return;
    }

    // Simple validation - the real check happens server-side
    setIsAuthenticated(true);
    toast({
      title: 'Authentifié',
      description: 'Token accepté (validation complète côté serveur)',
    });
  }

  async function sendTestNotification() {
    if (!testUserId) {
      toast({
        title: 'User ID requis',
        description: 'Veuillez saisir un User ID',
        variant: 'destructive',
      });
      return;
    }

    setIsTestLoading(true);

    try {
      const response = await fetch(
        `https://gdhiiynmlokocelkqsiz.supabase.co/functions/v1/test-push`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': adminToken,
          },
          body: JSON.stringify({ userId: testUserId }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'envoi');
      }

      toast({
        title: '✅ Notification de test envoyée',
        description: result.message,
      });

      setTestUserId('');
    } catch (error: any) {
      toast({
        title: '❌ Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsTestLoading(false);
    }
  }

  async function sendGroupedNotification() {
    if (!notifTitle) {
      toast({
        title: 'Titre requis',
        description: 'Veuillez saisir un titre de notification',
        variant: 'destructive',
      });
      return;
    }

    if (!notifUserIds && !notifBaseId) {
      toast({
        title: 'Cible requise',
        description: 'Veuillez spécifier des User IDs ou un Base ID',
        variant: 'destructive',
      });
      return;
    }

    setIsSendLoading(true);

    try {
      const userIdsArray = notifUserIds
        ? notifUserIds.split(',').map(id => id.trim()).filter(Boolean)
        : undefined;

      const response = await fetch(
        `https://gdhiiynmlokocelkqsiz.supabase.co/functions/v1/send-web-push`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': adminToken,
          },
          body: JSON.stringify({
            userIds: userIdsArray,
            baseId: notifBaseId || undefined,
            title: notifTitle,
            body: notifBody,
            url: notifUrl,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'envoi');
      }

      toast({
        title: '✅ Notifications envoyées',
        description: `${result.sentCount} notification(s) envoyée(s) sur ${result.totalSubscriptions} abonnement(s)`,
      });

      // Reset form
      setNotifTitle('');
      setNotifBody('');
      setNotifUrl('');
      setNotifUserIds('');
      setNotifBaseId('');
    } catch (error: any) {
      toast({
        title: '❌ Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSendLoading(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Administration Push Notifications
            </CardTitle>
            <CardDescription>
              Saisissez le token d'administration pour accéder
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Token d'administration</Label>
              <div className="flex gap-2">
                <Input
                  id="token"
                  type={isTokenVisible ? 'text' : 'password'}
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                  placeholder="Saisissez le PUSH_ADMIN_TOKEN"
                  onKeyDown={(e) => e.key === 'Enter' && verifyToken()}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsTokenVisible(!isTokenVisible)}
                >
                  {isTokenVisible ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button onClick={verifyToken} className="w-full">
              Se connecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Bell className="h-8 w-8" />
          Administration Push Notifications
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestion des notifications Web Push
        </p>
      </div>

      {/* Test Notification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Notification de test
          </CardTitle>
          <CardDescription>
            Envoyer une notification de test à un utilisateur
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="testUserId">User ID</Label>
            <Input
              id="testUserId"
              value={testUserId}
              onChange={(e) => setTestUserId(e.target.value)}
              placeholder="uuid de l'utilisateur"
            />
          </div>
          <Button
            onClick={sendTestNotification}
            disabled={isTestLoading}
            className="w-full"
          >
            {isTestLoading ? 'Envoi en cours...' : (
              <>
                <TestTube className="mr-2 h-4 w-4" />
                Envoyer test
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Grouped Notification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Notification groupée
          </CardTitle>
          <CardDescription>
            Envoyer une notification à plusieurs utilisateurs ou une base
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={notifTitle}
              onChange={(e) => setNotifTitle(e.target.value)}
              placeholder="Titre de la notification"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={notifBody}
              onChange={(e) => setNotifBody(e.target.value)}
              placeholder="Corps du message"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL (optionnel)</Label>
            <Input
              id="url"
              value={notifUrl}
              onChange={(e) => setNotifUrl(e.target.value)}
              placeholder="/interventions ou /boats/123"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="userIds">User IDs (CSV)</Label>
              <Textarea
                id="userIds"
                value={notifUserIds}
                onChange={(e) => setNotifUserIds(e.target.value)}
                placeholder="uuid1, uuid2, uuid3"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseId">Ou Base ID</Label>
              <Input
                id="baseId"
                value={notifBaseId}
                onChange={(e) => setNotifBaseId(e.target.value)}
                placeholder="uuid de la base"
              />
            </div>
          </div>

          <Button
            onClick={sendGroupedNotification}
            disabled={isSendLoading}
            className="w-full"
          >
            {isSendLoading ? 'Envoi en cours...' : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Envoyer notification
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Subscriptions List */}
      <Card>
        <CardHeader>
          <CardTitle>Abonnements actifs</CardTitle>
          <CardDescription>
            Liste de tous les abonnements push enregistrés
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptions && subscriptions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Base</TableHead>
                  <TableHead>Plateforme</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub: any) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{sub.profiles?.name || 'Inconnu'}</div>
                        <div className="text-xs text-muted-foreground">
                          {sub.profiles?.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{sub.bases?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{sub.platform}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs">
                      {sub.endpoint.substring(0, 50)}...
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(sub.created_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      {sub.active ? (
                        <Badge variant="default">Actif</Badge>
                      ) : (
                        <Badge variant="secondary">Inactif</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Aucun abonnement enregistré
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
