import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, Cloud, Thermometer, Wind, CloudRain } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface WeatherRule {
  id: string;
  rule_name: string;
  weather_condition: string;
  min_temperature?: number;
  max_temperature?: number;
  max_wind_speed?: number;
  max_precipitation?: number;
  action: 'postpone' | 'advance' | 'reschedule';
  adjustment_days: number;
  priority_adjustment: number;
  is_active: boolean;
}

interface WeatherRulesManagerProps {
  isEnabled: boolean;
}

export function WeatherRulesManager({ isEnabled }: WeatherRulesManagerProps) {
  const { toast } = useToast();
  const [rules, setRules] = useState<WeatherRule[]>([
    {
      id: '1',
      rule_name: 'Pluie forte',
      weather_condition: 'Rain',
      max_precipitation: 10,
      action: 'postpone',
      adjustment_days: 1,
      priority_adjustment: 0,
      is_active: true
    },
    {
      id: '2',
      rule_name: 'Vent fort',
      weather_condition: 'Clear',
      max_wind_speed: 15,
      action: 'postpone',
      adjustment_days: 1,
      priority_adjustment: 0,
      is_active: true
    },
    {
      id: '3',
      rule_name: 'Température extrême',
      weather_condition: 'Clear',
      min_temperature: -5,
      max_temperature: 35,
      action: 'reschedule',
      adjustment_days: 0,
      priority_adjustment: 1,
      is_active: true
    }
  ]);

  const [newRule, setNewRule] = useState<Partial<WeatherRule>>({
    rule_name: '',
    weather_condition: '',
    action: 'postpone',
    adjustment_days: 1,
    priority_adjustment: 0,
    is_active: true
  });

  const weatherConditions = [
    'Clear',
    'Clouds',
    'Rain',
    'Drizzle',
    'Thunderstorm',
    'Snow',
    'Mist',
    'Fog'
  ];

  const actions = [
    { value: 'postpone', label: 'Reporter' },
    { value: 'advance', label: 'Avancer' },
    { value: 'reschedule', label: 'Reprogrammer' }
  ];

  const addRule = () => {
    if (!newRule.rule_name || !newRule.weather_condition) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir au moins le nom de la règle et la condition météo.",
        variant: "destructive"
      });
      return;
    }

    const rule: WeatherRule = {
      id: Date.now().toString(),
      rule_name: newRule.rule_name!,
      weather_condition: newRule.weather_condition!,
      min_temperature: newRule.min_temperature,
      max_temperature: newRule.max_temperature,
      max_wind_speed: newRule.max_wind_speed,
      max_precipitation: newRule.max_precipitation,
      action: newRule.action as 'postpone' | 'advance' | 'reschedule',
      adjustment_days: newRule.adjustment_days || 1,
      priority_adjustment: newRule.priority_adjustment || 0,
      is_active: true
    };

    setRules([...rules, rule]);
    setNewRule({
      rule_name: '',
      weather_condition: '',
      action: 'postpone',
      adjustment_days: 1,
      priority_adjustment: 0,
      is_active: true
    });

    toast({
      title: "Règle ajoutée",
      description: `La règle "${rule.rule_name}" a été créée avec succès.`
    });
  };

  const updateRule = (id: string, field: keyof WeatherRule, value: any) => {
    setRules(rules.map(rule => 
      rule.id === id ? { ...rule, [field]: value } : rule
    ));

    toast({
      title: "Règle mise à jour",
      description: "Les modifications ont été sauvegardées."
    });
  };

  const deleteRule = (id: string) => {
    const rule = rules.find(r => r.id === id);
    setRules(rules.filter(r => r.id !== id));
    
    toast({
      title: "Règle supprimée",
      description: `La règle "${rule?.rule_name}" a été supprimée.`
    });
  };

  const testWeatherRules = () => {
    toast({
      title: "Test des règles météo",
      description: "Simulation en cours avec les données météo actuelles..."
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Règles d'ajustement météo</h3>
          <p className="text-sm text-muted-foreground">
            Configurez les conditions météo qui déclenchent des ajustements automatiques du planning
          </p>
        </div>
        <Button onClick={testWeatherRules} variant="outline" disabled={!isEnabled}>
          <Cloud className="h-4 w-4 mr-2" />
          Tester les règles
        </Button>
      </div>

      {/* Add new rule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nouvelle règle météo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rule-name">Nom de la règle</Label>
              <Input
                id="rule-name"
                value={newRule.rule_name || ''}
                onChange={(e) => setNewRule({ ...newRule, rule_name: e.target.value })}
                placeholder="Ex: Pluie forte"
                disabled={!isEnabled}
              />
            </div>
            <div>
              <Label htmlFor="weather-condition">Condition météo</Label>
              <Select 
                value={newRule.weather_condition || ''} 
                onValueChange={(value) => setNewRule({ ...newRule, weather_condition: value })}
                disabled={!isEnabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une condition" />
                </SelectTrigger>
                <SelectContent>
                  {weatherConditions.map(condition => (
                    <SelectItem key={condition} value={condition}>{condition}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="min-temp">Temp. min (°C)</Label>
              <Input
                id="min-temp"
                type="number"
                value={newRule.min_temperature || ''}
                onChange={(e) => setNewRule({ ...newRule, min_temperature: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="-5"
                disabled={!isEnabled}
              />
            </div>
            <div>
              <Label htmlFor="max-temp">Temp. max (°C)</Label>
              <Input
                id="max-temp"
                type="number"
                value={newRule.max_temperature || ''}
                onChange={(e) => setNewRule({ ...newRule, max_temperature: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="35"
                disabled={!isEnabled}
              />
            </div>
            <div>
              <Label htmlFor="max-wind">Vent max (m/s)</Label>
              <Input
                id="max-wind"
                type="number"
                value={newRule.max_wind_speed || ''}
                onChange={(e) => setNewRule({ ...newRule, max_wind_speed: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="15"
                disabled={!isEnabled}
              />
            </div>
            <div>
              <Label htmlFor="max-precipitation">Précip. max (mm)</Label>
              <Input
                id="max-precipitation"
                type="number"
                value={newRule.max_precipitation || ''}
                onChange={(e) => setNewRule({ ...newRule, max_precipitation: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="10"
                disabled={!isEnabled}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="action">Action</Label>
              <Select 
                value={newRule.action || 'postpone'} 
                onValueChange={(value) => setNewRule({ ...newRule, action: value as 'postpone' | 'advance' | 'reschedule' })}
                disabled={!isEnabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {actions.map(action => (
                    <SelectItem key={action.value} value={action.value}>{action.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="adjustment-days">Ajustement (jours)</Label>
              <Input
                id="adjustment-days"
                type="number"
                value={newRule.adjustment_days || 1}
                onChange={(e) => setNewRule({ ...newRule, adjustment_days: Number(e.target.value) })}
                min="0"
                max="7"
                disabled={!isEnabled}
              />
            </div>
            <div>
              <Label htmlFor="priority-adjustment">Ajustement priorité</Label>
              <Input
                id="priority-adjustment"
                type="number"
                value={newRule.priority_adjustment || 0}
                onChange={(e) => setNewRule({ ...newRule, priority_adjustment: Number(e.target.value) })}
                min="-2"
                max="2"
                disabled={!isEnabled}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={addRule} disabled={!isEnabled}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter la règle
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing rules */}
      <div className="space-y-4">
        <h4 className="font-medium">Règles existantes ({rules.length})</h4>
        {rules.map((rule) => (
          <Card key={rule.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  {rule.weather_condition === 'Rain' && <CloudRain className="h-4 w-4" />}
                  {rule.weather_condition === 'Clear' && <Cloud className="h-4 w-4" />}
                  {(rule.min_temperature || rule.max_temperature) && <Thermometer className="h-4 w-4" />}
                  {rule.max_wind_speed && <Wind className="h-4 w-4" />}
                  {rule.rule_name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={(checked) => updateRule(rule.id, 'is_active', checked)}
                    disabled={!isEnabled}
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={!isEnabled}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer la règle</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir supprimer la règle "{rule.rule_name}" ? Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteRule(rule.id)}>
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Condition:</span>
                  <p className="text-muted-foreground">{rule.weather_condition}</p>
                </div>
                <div>
                  <span className="font-medium">Action:</span>
                  <p className="text-muted-foreground">
                    {actions.find(a => a.value === rule.action)?.label} ({rule.adjustment_days}j)
                  </p>
                </div>
                <div>
                  <span className="font-medium">Température:</span>
                  <p className="text-muted-foreground">
                    {rule.min_temperature && `Min: ${rule.min_temperature}°C`}
                    {rule.min_temperature && rule.max_temperature && ' / '}
                    {rule.max_temperature && `Max: ${rule.max_temperature}°C`}
                    {!rule.min_temperature && !rule.max_temperature && 'Aucune limite'}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Limites:</span>
                  <p className="text-muted-foreground">
                    {rule.max_wind_speed && `Vent: ${rule.max_wind_speed}m/s`}
                    {rule.max_wind_speed && rule.max_precipitation && ' / '}
                    {rule.max_precipitation && `Pluie: ${rule.max_precipitation}mm`}
                    {!rule.max_wind_speed && !rule.max_precipitation && 'Aucune limite'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
