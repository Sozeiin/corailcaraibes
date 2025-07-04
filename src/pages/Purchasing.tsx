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
      label: 'Réception & Redistribution',
      icon: Truck,
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
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <ShoppingCart className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Module Achats</h1>
        </div>
        <p className="text-muted-foreground">
          Suivi des commandes, réception et redistribution de marchandises
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto p-1">
          {tabs.map((tab) => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id} 
              className="flex flex-col items-center gap-1 p-3 text-xs"
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
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