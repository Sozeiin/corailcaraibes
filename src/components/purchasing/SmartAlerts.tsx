import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Clock,
  DollarSign,
  Package,
  Users,
  Zap,
  Bell,
  CheckCircle,
  XCircle,
  Settings
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export function SmartAlerts() {
  const [alertSettings, setAlertSettings] = useState({
    priceIncreases: true,
    deliveryDelays: true,
    stockLevels: true,
    budgetOverruns: true,
    supplierPerformance: true,
    seasonalTrends: false
  });

  // Simuler des alertes intelligentes basées sur l'IA
  const smartAlerts = [
    {
      id: '1',
      type: 'price_anomaly',
      severity: 'high',
      title: 'Augmentation de prix détectée',
      message: 'Le fournisseur Marine Equipment a augmenté ses prix de 15% sur les équipements de sécurité',
      impact: 'Surcoût estimé: 2,400€/mois',
      suggestion: 'Négocier un contrat annuel ou rechercher des alternatives',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      acknowledged: false
    },
    {
      id: '2',
      type: 'delivery_pattern',
      severity: 'medium',
      title: 'Retards récurrents détectés',
      message: 'Le fournisseur Antilles Nautic livre avec 3-5 jours de retard depuis 2 mois',
      impact: 'Risque de rupture de stock',
      suggestion: 'Prévoir des commandes anticipées ou diversifier les fournisseurs',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      acknowledged: false
    },
    {
      id: '3',
      type: 'seasonal_trend',
      severity: 'low',
      title: 'Tendance saisonnière identifiée',
      message: 'Pic de demande prévu pour les équipements de plongée en mars-avril',
      impact: 'Opportunité d\'optimisation',
      suggestion: 'Commander en avance pour bénéficier de tarifs préférentiels',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      acknowledged: true
    },
    {
      id: '4',
      type: 'budget_alert',
      severity: 'high',
      title: 'Dépassement budgétaire prévu',
      message: 'Budget maintenance dépassé de 23% ce mois-ci',
      impact: 'Dépassement: 4,200€',
      suggestion: 'Reporter les achats non-urgents au mois prochain',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      acknowledged: false
    },
    {
      id: '5',
      type: 'optimization',
      severity: 'medium',
      title: 'Opportunité d\'économies détectée',
      message: 'Regrouper les commandes de carburant pourrait réduire les coûts de 8%',
      impact: 'Économies potentielles: 1,800€/mois',
      suggestion: 'Mettre en place des commandes groupées mensuelles',
      timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
      acknowledged: false
    }
  ];

  const getAlertIcon = (type: string) => {
    const icons = {
      'price_anomaly': TrendingUp,
      'delivery_pattern': Clock,
      'seasonal_trend': Package,
      'budget_alert': DollarSign,
      'optimization': Zap,
      'supplier_performance': Users
    };
    const Icon = icons[type] || AlertTriangle;
    return <Icon className="h-5 w-5" />;
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      'high': 'bg-red-100 text-red-800 border-red-200',
      'medium': 'bg-orange-100 text-orange-800 border-orange-200',
      'low': 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return colors[severity] || colors.medium;
  };

  const getSeverityIcon = (severity: string) => {
    const icons = {
      'high': AlertTriangle,
      'medium': Bell,
      'low': CheckCircle
    };
    const Icon = icons[severity] || Bell;
    return <Icon className="h-4 w-4" />;
  };

  const acknowledgeAlert = (alertId: string) => {
    // Marquer l'alerte comme lue
    console.log('Alert acknowledged:', alertId);
  };

  const unacknowledgedAlerts = smartAlerts.filter(alert => !alert.acknowledged);
  const acknowledgedAlerts = smartAlerts.filter(alert => alert.acknowledged);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Alertes Intelligentes IA</h2>
          <p className="text-muted-foreground">
            Détection automatique d'anomalies et suggestions d'optimisation
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-red-600">
            {unacknowledgedAlerts.length} nouvelles alertes
          </Badge>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Paramètres
          </Button>
        </div>
      </div>

      {/* Alert Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Alertes Actives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {unacknowledgedAlerts.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Économies Potentielles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(6200)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Risques Identifiés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">3</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Précision IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94%</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Alertes Actives ({unacknowledgedAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="acknowledged">
            Traitées ({acknowledgedAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="settings">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {unacknowledgedAlerts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucune alerte active</h3>
                <p className="text-muted-foreground">
                  Toutes les alertes ont été traitées
                </p>
              </CardContent>
            </Card>
          ) : (
            unacknowledgedAlerts.map((alert) => (
              <Card key={alert.id} className={`border-l-4 ${getSeverityColor(alert.severity)}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getAlertIcon(alert.type)}
                        <h3 className="font-semibold">{alert.title}</h3>
                        <Badge className={getSeverityColor(alert.severity)}>
                          {getSeverityIcon(alert.severity)}
                          <span className="ml-1 capitalize">{alert.severity}</span>
                        </Badge>
                      </div>
                      
                      <p className="text-muted-foreground mb-3">{alert.message}</p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <TrendingDown className="h-4 w-4 text-red-500" />
                          <span className="font-medium">Impact:</span>
                          <span>{alert.impact}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Zap className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">Suggestion:</span>
                          <span>{alert.suggestion}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            {new Date(alert.timestamp).toLocaleDateString('fr-FR')} à{' '}
                            {new Date(alert.timestamp).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Traité
                      </Button>
                      <Button variant="outline" size="sm">
                        Détails
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="acknowledged" className="space-y-4">
          {acknowledgedAlerts.map((alert) => (
            <Card key={alert.id} className="opacity-75">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getAlertIcon(alert.type)}
                      <h3 className="font-semibold">{alert.title}</h3>
                      <Badge variant="outline">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Traité
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">{alert.message}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration des Alertes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(alertSettings).map(([key, enabled]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {key === 'priceIncreases' && 'Augmentations de prix'}
                        {key === 'deliveryDelays' && 'Retards de livraison'}
                        {key === 'stockLevels' && 'Niveaux de stock critiques'}
                        {key === 'budgetOverruns' && 'Dépassements budgétaires'}
                        {key === 'supplierPerformance' && 'Performance fournisseurs'}
                        {key === 'seasonalTrends' && 'Tendances saisonnières'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {key === 'priceIncreases' && 'Alertes sur les variations de prix significatives'}
                        {key === 'deliveryDelays' && 'Détection des retards récurrents'}
                        {key === 'stockLevels' && 'Alertes de stock faible automatiques'}
                        {key === 'budgetOverruns' && 'Surveillance des dépassements budgétaires'}
                        {key === 'supplierPerformance' && 'Analyse de la qualité de service'}
                        {key === 'seasonalTrends' && 'Prédictions basées sur l\'historique'}
                      </div>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) =>
                        setAlertSettings(prev => ({ ...prev, [key]: checked }))
                      }
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}