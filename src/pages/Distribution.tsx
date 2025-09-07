import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Package, Receipt } from 'lucide-react';
import { PreparationTab } from '@/components/distribution/PreparationTab';
import { TrackingTab } from '@/components/distribution/TrackingTab';
import { ReceptionTab } from '@/components/distribution/ReceptionTab';

export default function Distribution() {
  const [activeTab, setActiveTab] = useState('preparation');

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Distribution inter-bases</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
            Gestion des expéditions entre les bases Guadeloupe, Martinique et Métropole
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preparation" className="flex items-center gap-1 sm:gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Préparer</span>
            <span className="sm:hidden">Préparer</span>
          </TabsTrigger>
          <TabsTrigger value="tracking" className="flex items-center gap-1 sm:gap-2">
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">Suivi & étiquettes</span>
            <span className="sm:hidden">Suivi</span>
          </TabsTrigger>
          <TabsTrigger value="reception" className="flex items-center gap-1 sm:gap-2">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">Réception</span>
            <span className="sm:hidden">Réception</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preparation" className="mt-4 sm:mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Préparation des expéditions
              </CardTitle>
              <CardDescription>
                Créez un envoi, scannez les articles et organisez-les dans des colis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PreparationTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking" className="mt-4 sm:mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Suivi des expéditions et étiquettes
              </CardTitle>
              <CardDescription>
                Consultez le statut des envois et imprimez les étiquettes de colis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TrackingTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reception" className="mt-4 sm:mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Réception des expéditions
              </CardTitle>
              <CardDescription>
                Scannez les colis et articles reçus pour les intégrer au stock
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReceptionTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}