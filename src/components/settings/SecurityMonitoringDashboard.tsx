import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Users, 
  TrendingUp, 
  Eye,
  RefreshCw,
  Download
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface SecurityEvent {
  id: string;
  event_type: string;
  user_id?: string;
  ip_address?: unknown;
  user_agent?: string;
  details: any;
  created_at: string;
}

interface LoginAttempt {
  id: string;
  email?: string;
  ip_address?: string;
  success: boolean;
  failure_reason?: string;
  created_at: string;
}

interface SecurityMetrics {
  totalEvents: number;
  failedLogins: number;
  successfulLogins: number;
  suspiciousActivity: number;
  uniqueIPs: number;
}

export function SecurityMonitoringDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalEvents: 0,
    failedLogins: 0,
    successfulLogins: 0,
    suspiciousActivity: 0,
    uniqueIPs: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSecurityData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load security events (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: eventsData, error: eventsError } = await supabase
        .from('security_events')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (eventsError) {
        console.error('Error loading security events:', eventsError);
      } else {
        setEvents(eventsData || []);
      }

      // Load login attempts (last 7 days)
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('login_attempts')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (attemptsError) {
        console.error('Error loading login attempts:', attemptsError);
      } else {
        setLoginAttempts(attemptsData || []);
        
        // Calculate metrics
        const successful = attemptsData?.filter(a => a.success).length || 0;
        const failed = attemptsData?.filter(a => !a.success).length || 0;
        const uniqueIPs = new Set(attemptsData?.map(a => a.ip_address).filter(Boolean)).size;
        const suspicious = eventsData?.filter(e => e.event_type === 'suspicious_activity').length || 0;

        setMetrics({
          totalEvents: (eventsData?.length || 0) + (attemptsData?.length || 0),
          failedLogins: failed,
          successfulLogins: successful,
          suspiciousActivity: suspicious,
          uniqueIPs,
        });
      }

    } catch (error) {
      console.error('Error loading security data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données de sécurité",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSecurityData();
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadSecurityData();
  };

  const exportSecurityReport = async () => {
    try {
      const reportData = {
        generated_at: new Date().toISOString(),
        metrics,
        events: events.slice(0, 50), // Last 50 events
        login_attempts: loginAttempts.slice(0, 50), // Last 50 attempts
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security_report_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Rapport exporté",
        description: "Le rapport de sécurité a été téléchargé",
      });
    } catch (error) {
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter le rapport",
        variant: "destructive",
      });
    }
  };

  const getEventSeverity = (eventType: string) => {
    switch (eventType) {
      case 'suspicious_activity':
        return 'destructive';
      case 'login_failure':
        return 'destructive';
      case 'login_success':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'suspicious_activity':
        return <AlertTriangle className="w-4 h-4" />;
      case 'login_failure':
      case 'login_success':
        return <Users className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Chargement des données de sécurité...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Monitoring de Sécurité</h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportSecurityReport}
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Événements Total</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalEvents}</div>
            <p className="text-xs text-muted-foreground">7 derniers jours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connexions Réussies</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.successfulLogins}</div>
            <p className="text-xs text-muted-foreground">Tentatives réussies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Échecs de Connexion</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics.failedLogins}</div>
            <p className="text-xs text-muted-foreground">Tentatives échouées</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activité Suspecte</CardTitle>
            <Eye className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metrics.suspiciousActivity}</div>
            <p className="text-xs text-muted-foreground">Événements suspects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Adresses IP Uniques</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.uniqueIPs}</div>
            <p className="text-xs text-muted-foreground">IPs différentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Security Alerts */}
      {metrics.suspiciousActivity > 0 && (
        <Alert className="border-destructive bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            <strong>Attention:</strong> {metrics.suspiciousActivity} activité(s) suspecte(s) détectée(s) dans les 7 derniers jours.
            Vérifiez les événements ci-dessous.
          </AlertDescription>
        </Alert>
      )}

      {/* Events Tabs */}
      <Tabs defaultValue="events" className="w-full">
        <TabsList>
          <TabsTrigger value="events">Événements de Sécurité</TabsTrigger>
          <TabsTrigger value="logins">Tentatives de Connexion</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Événements de Sécurité Récents</CardTitle>
              <CardDescription>
                Derniers événements de sécurité enregistrés dans le système
              </CardDescription>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Aucun événement de sécurité récent
                </p>
              ) : (
                <div className="space-y-3">
                  {events.slice(0, 20).map((event) => (
                    <div key={event.id} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="flex items-start gap-3">
                        {getEventIcon(event.event_type)}
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getEventSeverity(event.event_type)}>
                              {event.event_type}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(event.created_at).toLocaleString('fr-FR')}
                            </span>
                          </div>
                          <p className="text-sm mt-1">
                            IP: {event.ip_address ? String(event.ip_address) : 'N/A'} | 
                            User: {event.user_id ? event.user_id.substring(0, 8) + '...' : 'N/A'}
                          </p>
                          {event.details && Object.keys(event.details).length > 0 && (
                            <details className="text-xs text-muted-foreground mt-1">
                              <summary className="cursor-pointer">Détails</summary>
                              <pre className="mt-1">{JSON.stringify(event.details, null, 2)}</pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tentatives de Connexion</CardTitle>
              <CardDescription>
                Historique des tentatives de connexion récentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loginAttempts.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Aucune tentative de connexion récente
                </p>
              ) : (
                <div className="space-y-3">
                  {loginAttempts.slice(0, 20).map((attempt) => (
                    <div key={attempt.id} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="flex items-start gap-3">
                        <Users className="w-4 h-4 mt-1" />
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={attempt.success ? "default" : "destructive"}>
                              {attempt.success ? "Succès" : "Échec"}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(attempt.created_at).toLocaleString('fr-FR')}
                            </span>
                          </div>
                          <p className="text-sm mt-1">
                            Email: {attempt.email || 'N/A'} | IP: {attempt.ip_address || 'N/A'}
                          </p>
                          {attempt.failure_reason && (
                            <p className="text-xs text-destructive mt-1">
                              Raison: {attempt.failure_reason}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}