import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Package, 
  Truck, 
  ClipboardList, 
  QrCode,
  BarChart3,
  PackageCheck
} from 'lucide-react';
import { ShipmentPreparation } from './ShipmentPreparation';
import { ShipmentTracking } from './ShipmentTracking';
import { ReceptionManagement } from './ReceptionManagement';
import { LogisticsAnalytics } from './LogisticsAnalytics';
import { MobileScanning } from '../purchasing/MobileScanning';

export function LogisticsDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('preparation');

  // Adapter les tabs selon le rôle et la base
  const isDirection = user?.role === 'direction';
  const isMetropole = user?.baseId === '550e8400-e29b-41d4-a716-446655440001'; // Base Métropole

  const tabs = [
    // Métropole : Préparation et expédition
    ...(isMetropole ? [{
      id: 'preparation',
      label: 'Préparation',
      icon: ClipboardList,
      component: ShipmentPreparation
    }, {
      id: 'scanning',
      label: 'Scanner',
      icon: QrCode,
      component: MobileScanning
    }] : []),
    
    // Toutes bases : Réception
    {
      id: 'reception',
      label: 'Réception',
      icon: PackageCheck,
      component: ReceptionManagement
    },
    
    // Suivi des expéditions
    {
      id: 'tracking',
      label: 'Suivi',
      icon: Truck,
      component: ShipmentTracking
    },
    
    // Analytics pour direction
    ...(isDirection ? [{
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      component: LogisticsAnalytics
    }] : [])
  ];

  return (
    <div className="container mx-auto py-4 sm:py-6 px-3 sm:px-4">
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <Package className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Logistique</h1>
        </div>
        <p className="text-muted-foreground text-sm sm:text-base">
          {isMetropole 
            ? 'Préparation, scan et expédition vers les bases' 
            : 'Réception et intégration des livraisons'}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full h-auto p-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map((tab) => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id} 
              className="flex flex-col items-center gap-1 p-2 sm:p-3 text-xs"
            >
              <tab.icon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline text-[10px] sm:text-xs">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <tab.icon className="h-5 w-5" />
                  {tab.label}
                </CardTitle>
                <CardDescription>
                  Module {tab.label.toLowerCase()} pour la gestion logistique
                </CardDescription>
              </CardHeader>
              <CardContent>
                <tab.component />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}