import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StockAnalyticsDashboard } from '@/components/stock/analytics/StockAnalyticsDashboard';
import { Package, AlertTriangle, Truck, BarChart3, Settings, TrendingUp } from 'lucide-react';

export function StockSettings() {
  const [activeTab, setActiveTab] = useState('config');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Gestion du Stock</h3>
          <p className="text-sm text-muted-foreground">
            Configuration, analytiques et rapports de stock
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytiques
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Seuils d'alerte
            </CardTitle>
            <CardDescription>
              Configuration des seuils d'alerte pour les stocks faibles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="global-threshold">Seuil global (%)</Label>
                  <Input
                    id="global-threshold"
                    type="number"
                    placeholder="10"
                    min="0"
                    max="100"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Pourcentage du stock initial qui déclenche une alerte
                  </p>
                </div>
                <div>
                  <Label htmlFor="critical-threshold">Seuil critique (%)</Label>
                  <Input
                    id="critical-threshold"
                    type="number"
                    placeholder="5"
                    min="0"
                    max="100"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Seuil pour les alertes urgentes
                  </p>
                </div>
              </div>
              <Button>Sauvegarder les seuils</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Catégories de stock
            </CardTitle>
            <CardDescription>
              Gestion des catégories et organisation du stock
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Organisez votre stock en catégories pour faciliter la recherche et la gestion des articles.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  'Moteur',
                  'Électronique',
                  'Sécurité',
                  'Entretien',
                  'Carburant',
                  'Accessoires',
                  'Pièces détachées',
                  'Consommables'
                ].map((category) => (
                  <div key={category} className="p-2 bg-muted rounded text-sm text-center">
                    {category}
                  </div>
                ))}
              </div>
              <Button>
                <Package className="h-4 w-4 mr-2" />
                Gérer les catégories
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Commandes automatiques
            </CardTitle>
            <CardDescription>
              Configuration des commandes automatiques pour le réapprovisionnement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Définissez des règles pour automatiser les commandes de réapprovisionnement lorsque les stocks atteignent certains seuils.
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h5 className="font-medium">Commandes automatiques</h5>
                    <p className="text-sm text-muted-foreground">Activées pour les articles critiques</p>
                  </div>
                  <Button variant="outline" size="sm">Configurer</Button>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h5 className="font-medium">Fournisseurs par défaut</h5>
                    <p className="text-sm text-muted-foreground">Association article-fournisseur</p>
                  </div>
                  <Button variant="outline" size="sm">Gérer</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Rapports et analytics
            </CardTitle>
            <CardDescription>
              Configuration des rapports de stock et analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Configurez la fréquence et le contenu des rapports de stock envoyés automatiquement.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h5 className="font-medium mb-2">Rapport hebdomadaire</h5>
                  <p className="text-sm text-muted-foreground">
                    Synthèse des mouvements de stock
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h5 className="font-medium mb-2">Rapport mensuel</h5>
                  <p className="text-sm text-muted-foreground">
                    Analyse détaillée et tendances
                  </p>
                </div>
              </div>
              <Button>Configurer les rapports</Button>
            </div>
          </CardContent>
        </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <StockAnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}