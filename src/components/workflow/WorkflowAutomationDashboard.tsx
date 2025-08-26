import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Zap,
  Bell,
  Settings,
  TrendingUp
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WorkflowAlert {
  id: string;
  order_id: string;
  step_status: string;
  alert_type: string;
  threshold_hours: number;
  triggered_at: string;
  resolved_at?: string;
  is_resolved: boolean;
  alert_message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

interface AutomationRule {
  id: string;
  rule_name: string;
  from_status: string;
  to_status: string;
  trigger_condition: string;
  auto_delay_hours: number;
  is_active: boolean;
  requires_approval: boolean;
}

export function WorkflowAutomationDashboard() {
  const { user } = useAuth();
  const [isRunningAutomation, setIsRunningAutomation] = useState(false);

  // Fetch active alerts
  const { data: alerts = [], refetch: refetchAlerts } = useQuery({
    queryKey: ['workflow-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_alerts')
        .select('*')
        .eq('is_resolved', false)
        .order('triggered_at', { ascending: false });
      
      return (data || []).map((alert: any) => ({
        ...alert,
        step_status: alert.step_status || 'unknown'
      })) as WorkflowAlert[];
    },
    enabled: !!user && (user.role === 'direction' || user.role === 'chef_base'),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch automation rules
  const { data: automationRules = [] } = useQuery({
    queryKey: ['automation-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_automation_rules')
        .select('*')
        .order('rule_name');
      
      if (error) throw error;
      return (data || []).map((rule: any) => ({
        ...rule,
        from_status: rule.from_status || 'unknown',
        to_status: rule.to_status || 'unknown'
      })) as AutomationRule[];
    },
    enabled: !!user && user.role === 'direction'
  });

  // Manual automation trigger
  const runAutomation = async () => {
    setIsRunningAutomation(true);
    try {
      const { error } = await supabase.functions.invoke('workflow-automation');
      if (error) throw error;
      
      // Refresh alerts after automation
      setTimeout(() => {
        refetchAlerts();
      }, 2000);
      
    } catch (error) {
      console.error('Failed to run automation:', error);
    } finally {
      setIsRunningAutomation(false);
    }
  };

  // Resolve alert
  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase.rpc('resolve_workflow_alert', {
        alert_id_param: alertId
      });
      
      if (error) throw error;
      refetchAlerts();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  // Real-time updates for alerts
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('workflow-alerts-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_alerts'
        },
        () => {
          refetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetchAlerts]);

  if (!user || (user.role !== 'direction' && user.role !== 'chef_base')) {
    return null;
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'error': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning': return <Clock className="w-5 h-5 text-orange-500" />;
      default: return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'error': return 'bg-red-50 text-red-700 border-red-200';
      case 'warning': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const errorCount = alerts.filter(a => a.severity === 'error').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  const activeRules = automationRules.filter(r => r.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Automatisation du Workflow</h2>
          <p className="text-gray-600">
            Surveillance et gestion des automatisations des commandes
          </p>
        </div>
        
        {user.role === 'direction' && (
          <Button 
            onClick={runAutomation}
            disabled={isRunningAutomation}
            className="flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            {isRunningAutomation ? 'Exécution...' : 'Exécuter maintenant'}
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Alertes critiques</p>
                <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Erreurs</p>
                <p className="text-2xl font-bold text-orange-600">{errorCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avertissements</p>
                <p className="text-2xl font-bold text-yellow-600">{warningCount}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Règles actives</p>
                <p className="text-2xl font-bold text-blue-600">{activeRules}</p>
              </div>
              <Settings className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Alertes actives
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">Aucune alerte active</p>
              <p>Tous les workflows fonctionnent normalement</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <Alert key={alert.id} className={getSeverityColor(alert.severity)}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(alert.severity)}
                      <div className="flex-1">
                        <AlertTitle className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {alert.alert_type.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <span className="text-sm font-medium">
                            Commande {alert.order_id.slice(0, 8)}
                          </span>
                        </AlertTitle>
                        <AlertDescription className="mt-2">
                          {alert.alert_message}
                          <div className="text-xs text-gray-500 mt-1">
                            Déclenchée {formatDistanceToNow(new Date(alert.triggered_at), { 
                              addSuffix: true, 
                              locale: fr 
                            })}
                          </div>
                        </AlertDescription>
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resolveAlert(alert.id)}
                      className="ml-4"
                    >
                      Résoudre
                    </Button>
                  </div>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Automation Rules (Direction only) */}
      {user.role === 'direction' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Règles d'automatisation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {automationRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">{rule.rule_name}</h4>
                      <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                        {rule.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                      {rule.requires_approval && (
                        <Badge variant="outline" className="text-xs">
                          Approbation requise
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {rule.from_status} → {rule.to_status}
                      {rule.auto_delay_hours > 0 && (
                        <span className="ml-2">
                          (Délai: {rule.auto_delay_hours}h)
                        </span>
                      )}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {rule.trigger_condition.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}