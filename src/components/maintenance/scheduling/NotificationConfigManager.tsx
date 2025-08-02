import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Bell, Mail, MessageSquare, Users, Clock, Send } from 'lucide-react';

interface NotificationConfigManagerProps {
  isEnabled: boolean;
}

interface NotificationRule {
  id: string;
  name: string;
  triggerType: 'before_due' | 'overdue' | 'completed' | 'failed';
  timeOffset: number;
  timeUnit: string;
  channels: string[];
  recipients: string[];
  isActive: boolean;
  template: string;
}

export function NotificationConfigManager({ isEnabled }: NotificationConfigManagerProps) {
  const [notificationRules, setNotificationRules] = useState<NotificationRule[]>([
    {
      id: '1',
      name: 'Rappel avant échéance',
      triggerType: 'before_due',
      timeOffset: 7,
      timeUnit: 'jours',
      channels: ['email', 'app'],
      recipients: ['techniciens', 'chef_base'],
      isActive: true,
      template: 'default_reminder'
    },
    {
      id: '2',
      name: 'Alerte retard',
      triggerType: 'overdue',
      timeOffset: 1,
      timeUnit: 'jours',
      channels: ['email', 'app', 'sms'],
      recipients: ['chef_base', 'direction'],
      isActive: true,
      template: 'overdue_alert'
    }
  ]);

  const [globalSettings, setGlobalSettings] = useState({
    enableNotifications: true,
    quietHours: {
      enabled: true,
      start: '20:00',
      end: '08:00'
    },
    maxDailyNotifications: 5,
    batchNotifications: true,
    defaultLanguage: 'fr'
  });

  const [templates, setTemplates] = useState([
    {
      id: 'default_reminder',
      name: 'Rappel standard',
      subject: 'Maintenance programmée - {{boat_name}}',
      content: 'Une maintenance est programmée pour le bateau {{boat_name}} le {{scheduled_date}}.'
    },
    {
      id: 'overdue_alert',
      name: 'Alerte de retard',
      subject: 'URGENT - Maintenance en retard - {{boat_name}}',
      content: 'La maintenance du bateau {{boat_name}} est en retard de {{days_overdue}} jours.'
    }
  ]);

  const toggleRule = (ruleId: string) => {
    setNotificationRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
    ));
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'app':
        return <Bell className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getTriggerBadge = (triggerType: string) => {
    switch (triggerType) {
      case 'before_due':
        return <Badge variant="secondary">Avant échéance</Badge>;
      case 'overdue':
        return <Badge variant="destructive">En retard</Badge>;
      case 'completed':
        return <Badge variant="default">Terminé</Badge>;
      case 'failed':
        return <Badge variant="destructive">Échec</Badge>;
      default:
        return <Badge variant="outline">Autre</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-md font-semibold">Configuration des Notifications</h4>
        <p className="text-sm text-muted-foreground">
          Gérez les notifications automatiques pour les maintenances
        </p>
      </div>

      {/* Global Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Paramètres Généraux
          </CardTitle>
          <CardDescription>
            Configuration globale des notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Notifications activées</Label>
                  <p className="text-sm text-muted-foreground">
                    Active ou désactive toutes les notifications
                  </p>
                </div>
                <Switch
                  checked={globalSettings.enableNotifications}
                  onCheckedChange={(checked) => setGlobalSettings(prev => ({ ...prev, enableNotifications: checked }))}
                  disabled={!isEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Grouper les notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Groupe les notifications similaires
                  </p>
                </div>
                <Switch
                  checked={globalSettings.batchNotifications}
                  onCheckedChange={(checked) => setGlobalSettings(prev => ({ ...prev, batchNotifications: checked }))}
                  disabled={!isEnabled || !globalSettings.enableNotifications}
                />
              </div>

              <div>
                <Label htmlFor="maxDaily">Limite quotidienne</Label>
                <Input
                  id="maxDaily"
                  type="number"
                  min="1"
                  max="50"
                  value={globalSettings.maxDailyNotifications}
                  onChange={(e) => setGlobalSettings(prev => ({ ...prev, maxDailyNotifications: parseInt(e.target.value) }))}
                  disabled={!isEnabled || !globalSettings.enableNotifications}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Nombre maximum de notifications par jour et par utilisateur
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Heures de silence</Label>
                  <p className="text-sm text-muted-foreground">
                    Désactive les notifications la nuit
                  </p>
                </div>
                <Switch
                  checked={globalSettings.quietHours.enabled}
                  onCheckedChange={(checked) => setGlobalSettings(prev => ({ 
                    ...prev, 
                    quietHours: { ...prev.quietHours, enabled: checked }
                  }))}
                  disabled={!isEnabled || !globalSettings.enableNotifications}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="quietStart">Début</Label>
                  <Input
                    id="quietStart"
                    type="time"
                    value={globalSettings.quietHours.start}
                    onChange={(e) => setGlobalSettings(prev => ({ 
                      ...prev, 
                      quietHours: { ...prev.quietHours, start: e.target.value }
                    }))}
                    disabled={!isEnabled || !globalSettings.enableNotifications || !globalSettings.quietHours.enabled}
                  />
                </div>
                <div>
                  <Label htmlFor="quietEnd">Fin</Label>
                  <Input
                    id="quietEnd"
                    type="time"
                    value={globalSettings.quietHours.end}
                    onChange={(e) => setGlobalSettings(prev => ({ 
                      ...prev, 
                      quietHours: { ...prev.quietHours, end: e.target.value }
                    }))}
                    disabled={!isEnabled || !globalSettings.enableNotifications || !globalSettings.quietHours.enabled}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="language">Langue par défaut</Label>
                <Select
                  value={globalSettings.defaultLanguage}
                  onValueChange={(value) => setGlobalSettings(prev => ({ ...prev, defaultLanguage: value }))}
                  disabled={!isEnabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Règles de Notification
          </CardTitle>
          <CardDescription>
            Configurez quand et comment envoyer les notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {notificationRules.map((rule, index) => (
              <div key={rule.id}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h5 className="font-medium">{rule.name}</h5>
                    {getTriggerBadge(rule.triggerType)}
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={() => toggleRule(rule.id)}
                      disabled={!isEnabled || !globalSettings.enableNotifications}
                    />
                  </div>
                  <Button variant="outline" size="sm" disabled={!isEnabled}>
                    Modifier
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm">Délai</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-sm">{rule.timeOffset} {rule.timeUnit}</span>
                      {rule.triggerType === 'before_due' ? ' avant' : ' après'}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm">Canaux</Label>
                    <div className="flex gap-1 mt-1">
                      {rule.channels.map(channel => (
                        <div key={channel} className="flex items-center gap-1 bg-secondary px-2 py-1 rounded text-xs">
                          {getChannelIcon(channel)}
                          {channel}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm">Destinataires</Label>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {rule.recipients.map(recipient => (
                        <Badge key={recipient} variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {recipient}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm">Modèle</Label>
                    <div className="mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {templates.find(t => t.id === rule.template)?.name || 'Défaut'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {index < notificationRules.length - 1 && <Separator className="mt-6" />}
              </div>
            ))}

            <div className="pt-4">
              <Button variant="outline" disabled={!isEnabled || !globalSettings.enableNotifications}>
                <Bell className="h-4 w-4 mr-2" />
                Ajouter une règle
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Modèles de Messages
          </CardTitle>
          <CardDescription>
            Personnalisez les messages de notification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {templates.map((template, index) => (
              <div key={template.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium">{template.name}</h5>
                  <Button variant="outline" size="sm" disabled={!isEnabled}>
                    Modifier
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <Label className="text-sm font-medium">Sujet</Label>
                    <p className="text-sm text-muted-foreground bg-muted p-2 rounded mt-1">
                      {template.subject}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Contenu</Label>
                    <p className="text-sm text-muted-foreground bg-muted p-2 rounded mt-1">
                      {template.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" disabled={!isEnabled}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Nouveau modèle
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Test des Notifications
          </CardTitle>
          <CardDescription>
            Testez le système de notification avec vos paramètres actuels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button variant="outline" disabled={!isEnabled || !globalSettings.enableNotifications}>
              <Mail className="h-4 w-4 mr-2" />
              Test Email
            </Button>
            <Button variant="outline" disabled={!isEnabled || !globalSettings.enableNotifications}>
              <Bell className="h-4 w-4 mr-2" />
              Test Notification App
            </Button>
            <Button variant="outline" disabled={!isEnabled || !globalSettings.enableNotifications}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Test SMS
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}