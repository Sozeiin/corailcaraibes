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
  Settings,
  Target
} from 'lucide-react';
import { AdvancedOrders } from '@/components/purchasing/AdvancedOrders';
import { SupplierManagement } from '@/components/purchasing/SupplierManagement';
import { InterBaseLogistics } from '@/components/purchasing/InterBaseLogistics';
import { MobileScanning } from '@/components/purchasing/MobileScanning';
import { LogisticsDashboard } from '@/components/logistics/LogisticsDashboard';
import { CampaignManagement } from '@/components/purchasing/CampaignManagement';

export default function Purchasing() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('campaigns');

  // Restrict access to direction only
  if (user?.role !== 'direction') {
    return <Navigate to="/" replace />;
  }

  const tabs = [
    {
      id: 'campaigns',
      label: 'Campagnes',
      icon: Target,
      component: CampaignManagement
    },
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
    <div className="container mx-auto py-2 sm:py-6 px-2 sm:px-4">
      <div className="mb-3 sm:mb-6">
        <div className="flex items-center gap-2 mb-2">
          <ShoppingCart className="h-5 w-5 sm:h-8 sm:w-8 text-primary" />
          <h1 className="text-lg sm:text-3xl font-bold">Module Achats</h1>
        </div>
        <p className="text-muted-foreground text-xs sm:text-base">
          Suivi des commandes, réception et redistribution de marchandises
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-2 sm:space-y-6">
        <div className="overflow-x-auto pb-1">
          <TabsList className="grid w-full grid-cols-2 xs:grid-cols-3 sm:grid-cols-6 h-auto p-1 gap-1 min-w-max">
            {tabs.map((tab) => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id} 
                className="flex flex-col items-center justify-center gap-0.5 sm:gap-1 p-1.5 xs:p-2 sm:p-3 text-xs min-h-[60px] xs:min-h-[65px] sm:min-h-auto whitespace-nowrap transition-all duration-200 hover:scale-105"
              >
                <tab.icon className="h-4 w-4 xs:h-3.5 xs:w-3.5 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="text-[9px] xs:text-[10px] sm:text-xs text-center leading-tight font-medium">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="space-y-2 sm:space-y-4">
            <Card>
              <CardHeader className="pb-2 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
                  <tab.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  {tab.label}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Module {tab.label.toLowerCase()} pour la gestion des achats
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2 sm:p-6">
                <tab.component />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}