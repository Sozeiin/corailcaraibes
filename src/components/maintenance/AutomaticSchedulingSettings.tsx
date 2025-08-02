import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  Bell, 
  Settings, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Activity
} from 'lucide-react';
import { SchedulingRulesManager } from './scheduling/SchedulingRulesManager';
import { IntervalConfigManager } from './scheduling/IntervalConfigManager';
import { NotificationConfigManager } from './scheduling/NotificationConfigManager';
import { SchedulingAnalytics } from './scheduling/SchedulingAnalytics';

export function AutomaticSchedulingSettings() {
  const [activeTab, setActiveTab] = useState('rules');
  const [isAutoSchedulingEnabled, setIsAutoSchedulingEnabled] = useState(true);
  const { toast } = useToast();

  const stats = {
    totalRules: 12,
    activeRules: 8,
    scheduledMaintenances: 24,
    pendingNotifications: 3
  };

  const handleSchedulingToggle = (enabled: boolean) => {
    setIsAutoSchedulingEnabled(enabled);
    toast({
      title: enabled ? "Planification activée" : "Planification désactivée",
      description: enabled 
        ? "La planification automatique des maintenances est maintenant active."
        : "La planification automatique a été désactivée.",
    });
  };

  const handleGenerateMonthlySchedule = () => {
    toast({
      title: "Génération du planning",
      description: "Le planning mensuel est en cours de génération...",
    });
  };

  const handleSendReminders = () => {
    toast({
      title: "Envoi des rappels",
      description: "Les rappels de maintenance ont été envoyés.",
    });
  };

  const handleOptimizeSchedule = () => {
    toast({
      title: "Optimisation du planning",
      description: "Le planning est en cours d'optimisation...",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Planification automatique</h3>
          <p className="text-sm text-muted-foreground">
            Configuration de la planification automatique des maintenances préventives
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Label htmlFor="auto-scheduling">Planification automatique</Label>
          <Switch
            id="auto-scheduling"
            checked={isAutoSchedulingEnabled}
            onCheckedChange={handleSchedulingToggle}
          />
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Règles Totales</p>
                <p className="text-2xl font-bold">{stats.totalRules}</p>
              </div>
              <Settings className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Règles Actives</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeRules}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Maintenances Programmées</p>
                <p className="text-2xl font-bold">{stats.scheduledMaintenances}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Notifications en Attente</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pendingNotifications}</p>
              </div>
              <Bell className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration de la Planification</CardTitle>
          <CardDescription>
            Gérez les règles, intervalles et notifications pour la planification automatique
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="rules" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Règles
              </TabsTrigger>
              <TabsTrigger value="intervals" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Intervalles
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Analytiques
              </TabsTrigger>
            </TabsList>

            <TabsContent value="rules" className="mt-6">
              <SchedulingRulesManager isEnabled={isAutoSchedulingEnabled} />
            </TabsContent>

            <TabsContent value="intervals" className="mt-6">
              <IntervalConfigManager isEnabled={isAutoSchedulingEnabled} />
            </TabsContent>

            <TabsContent value="notifications" className="mt-6">
              <NotificationConfigManager isEnabled={isAutoSchedulingEnabled} />
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <SchedulingAnalytics />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Actions Rapides
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="justify-start" onClick={handleGenerateMonthlySchedule}>
              <Calendar className="h-4 w-4 mr-2" />
              Générer Planning Mensuel
            </Button>
            <Button variant="outline" className="justify-start" onClick={handleSendReminders}>
              <Bell className="h-4 w-4 mr-2" />
              Envoyer Rappels
            </Button>
            <Button variant="outline" className="justify-start" onClick={handleOptimizeSchedule}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Optimiser Planning
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Alerts */}
      {!isAutoSchedulingEnabled && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">Planification automatique désactivée</p>
                <p className="text-sm text-orange-600">
                  Les nouvelles maintenances ne seront pas programmées automatiquement.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}