import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ShoppingCart, 
  Users, 
  BarChart3, 
  Package, 
  Truck, 
  QrCode,
  TrendingUp,
  Globe,
  Settings
} from 'lucide-react';
import { AdvancedOrders } from '@/components/purchasing/AdvancedOrders';
import { SupplierManagement } from '@/components/purchasing/SupplierManagement';
import { InterBaseLogistics } from '@/components/purchasing/InterBaseLogistics';
import { MobileScanning } from '@/components/purchasing/MobileScanning';
import { LogisticsDashboard } from '@/components/logistics/LogisticsDashboard';

export default function Purchasing() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('orders');

  // Restrict access to direction only
  if (user?.role !== 'direction') {
    return <Navigate to="/" replace />;
  }

  const tabs = [
    {
      id: 'orders',
      label: 'Commandes',
      icon: ShoppingCart,
      component: AdvancedOrders
    },
    {
      id: 'suppliers',
      label: 'Fournisseurs',
      icon: Users,
      component: SupplierManagement
    },
    {
      id: 'logistics',
      label: 'Logistique',
      icon: Truck,
      component: LogisticsDashboard
    },
    {
      id: 'interbases',
      label: 'Inter-Bases',
      icon: Package,
      component: InterBaseLogistics
    },
    {
      id: 'scanning',
      label: 'Scanner',
      icon: QrCode,
      component: MobileScanning
    }
  ];

  return (
    <div className="container mx-auto py-4 sm:py-6 px-3 sm:px-4">
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Module Achats</h1>
        </div>
        <p className="text-muted-foreground text-sm sm:text-base">
          Suivi des commandes, réception et redistribution de marchandises
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto p-1">
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
                  Module {tab.label.toLowerCase()} pour la gestion des achats
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