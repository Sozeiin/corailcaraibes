import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Clock, Wrench, AlertCircle, Calendar } from 'lucide-react';

interface IntervalConfigManagerProps {
  isEnabled: boolean;
}

interface IntervalConfig {
  taskType: string;
  defaultInterval: number;
  defaultUnit: string;
  adaptiveScheduling: boolean;
  leadTime: number;
  bufferTime: number;
}

export function IntervalConfigManager({ isEnabled }: IntervalConfigManagerProps) {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<IntervalConfig[]>([
    {
      taskType: 'Révision moteur',
      defaultInterval: 100,
      defaultUnit: 'heures',
      adaptiveScheduling: true,
      leadTime: 7,
      bufferTime: 3
    },
    {
      taskType: 'Inspection coque',
      defaultInterval: 6,
      defaultUnit: 'mois',
      adaptiveScheduling: false,
      leadTime: 14,
      bufferTime: 7
    },
    {
      taskType: 'Maintenance électrique',
      defaultInterval: 12,
      defaultUnit: 'mois',
      adaptiveScheduling: true,
      leadTime: 5,
      bufferTime: 2
    },
    {
      taskType: 'Vérification sécurité',
      defaultInterval: 3,
      defaultUnit: 'mois',
      adaptiveScheduling: false,
      leadTime: 3,
      bufferTime: 1
    }
  ]);

  const [globalSettings, setGlobalSettings] = useState({
    autoAdjustIntervals: true,
    considerWeather: false,
    considerUsage: true,
    seasonalAdjustments: true,
    urgencyMultiplier: 1.2
  });

  const updateConfig = (index: number, field: keyof IntervalConfig, value: any) => {
    setConfigs(prev => prev.map((config, i) => 
      i === index ? { ...config, [field]: value } : config
    ));
    toast({
      title: "Configuration mise à jour",
      description: `Les paramètres pour ${configs[index].taskType} ont été sauvegardés.`,
    });
  };

  const updateGlobalSetting = (field: string, value: any) => {
    setGlobalSettings(prev => ({ ...prev, [field]: value }));
    toast({
      title: "Paramètres globaux mis à jour",
      description: "La configuration globale a été sauvegardée.",
    });
  };

  const viewFullSchedule = () => {
    toast({
      title: "Ouverture du planning",
      description: "Redirection vers la vue complète du planning...",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-md font-semibold">Configuration des Intervalles</h4>
        <p className="text-sm text-muted-foreground">
          Définissez les intervalles par défaut et les paramètres d'ajustement automatique
        </p>
      </div>

      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Paramètres Globaux
          </CardTitle>
          <CardDescription>
            Configuration générale pour l'ajustement automatique des intervalles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Ajustement automatique des intervalles</Label>
                  <p className="text-sm text-muted-foreground">
                    Ajuste les intervalles basés sur l'historique
                  </p>
                </div>
                <Switch
                  checked={globalSettings.autoAdjustIntervals}
                  onCheckedChange={(checked) => updateGlobalSetting('autoAdjustIntervals', checked)}
                  disabled={!isEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Considérer l'usage des bateaux</Label>
                  <p className="text-sm text-muted-foreground">
                    Ajuste selon l'intensité d'utilisation
                  </p>
                </div>
                <Switch
                  checked={globalSettings.considerUsage}
                  onCheckedChange={(checked) => updateGlobalSetting('considerUsage', checked)}
                  disabled={!isEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Ajustements saisonniers</Label>
                  <p className="text-sm text-muted-foreground">
                    Planification adaptée aux saisons
                  </p>
                </div>
                <Switch
                  checked={globalSettings.seasonalAdjustments}
                  onCheckedChange={(checked) => updateGlobalSetting('seasonalAdjustments', checked)}
                  disabled={!isEnabled}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div>
                    <Label>Considérer les conditions météo</Label>
                    <p className="text-sm text-muted-foreground">
                      Ajuste selon les conditions climatiques
                    </p>
                  </div>
                  <Switch
                    checked={globalSettings.considerWeather}
                    onCheckedChange={(checked) => updateGlobalSetting('considerWeather', checked)}
                    disabled={!isEnabled}
                  />
                </div>
                {globalSettings.considerWeather && (
                  <Badge variant="secondary" className="text-xs">
                    Intégration météo active
                  </Badge>
                )}
              </div>

              <div>
                <Label htmlFor="urgencyMultiplier">Multiplicateur d'urgence</Label>
                <Input
                  id="urgencyMultiplier"
                  type="number"
                  step="0.1"
                  min="1"
                  max="2"
                  value={globalSettings.urgencyMultiplier}
                  onChange={(e) => updateGlobalSetting('urgencyMultiplier', parseFloat(e.target.value))}
                  disabled={!isEnabled}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Facteur appliqué aux intervalles pour les tâches urgentes
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task-specific Configurations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Intervalles par Type de Tâche
          </CardTitle>
          <CardDescription>
            Configurez les intervalles par défaut pour chaque type de maintenance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {configs.map((config, index) => (
              <div key={config.taskType}>
                <div className="flex items-center gap-2 mb-4">
                  <h5 className="font-medium">{config.taskType}</h5>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Intervalle par défaut</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={config.defaultInterval}
                        onChange={(e) => updateConfig(index, 'defaultInterval', parseInt(e.target.value))}
                        disabled={!isEnabled}
                      />
                      <Select
                        value={config.defaultUnit}
                        onValueChange={(value) => updateConfig(index, 'defaultUnit', value)}
                        disabled={!isEnabled}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="heures">Heures</SelectItem>
                          <SelectItem value="jours">Jours</SelectItem>
                          <SelectItem value="semaines">Semaines</SelectItem>
                          <SelectItem value="mois">Mois</SelectItem>
                          <SelectItem value="années">Années</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Délai de préparation (jours)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={config.leadTime}
                      onChange={(e) => updateConfig(index, 'leadTime', parseInt(e.target.value))}
                      disabled={!isEnabled}
                    />
                  </div>

                  <div>
                    <Label>Temps tampon (jours)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={config.bufferTime}
                      onChange={(e) => updateConfig(index, 'bufferTime', parseInt(e.target.value))}
                      disabled={!isEnabled}
                    />
                  </div>

                  <div className="flex items-end">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={config.adaptiveScheduling}
                        onCheckedChange={(checked) => updateConfig(index, 'adaptiveScheduling', checked)}
                        disabled={!isEnabled}
                      />
                      <Label className="text-sm">Planification adaptive</Label>
                    </div>
                  </div>
                </div>

                {index < configs.length - 1 && <Separator className="mt-6" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Aperçu de la Planification
          </CardTitle>
          <CardDescription>
            Simulez la planification avec les paramètres actuels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">Prochaine semaine</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  3 maintenances programmées
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Ce mois</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  12 maintenances planifiées
                </p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Prochain trimestre</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  45 maintenances prévues
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" disabled={!isEnabled} onClick={viewFullSchedule}>
                <Calendar className="h-4 w-4 mr-2" />
                Voir la planification complète
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}