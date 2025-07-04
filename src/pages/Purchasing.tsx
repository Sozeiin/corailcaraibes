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
import { PurchasingDashboard } from '@/components/purchasing/PurchasingDashboard';
import { AdvancedOrders } from '@/components/purchasing/AdvancedOrders';
import { SupplierManagement } from '@/components/purchasing/SupplierManagement';
import { BulkPurchasing } from '@/components/purchasing/BulkPurchasing';
import { InterBaseLogistics } from '@/components/purchasing/InterBaseLogistics';
import { MobileScanning } from '@/components/purchasing/MobileScanning';
import { PurchasingAnalytics } from '@/components/purchasing/PurchasingAnalytics';
import { ExternalIntegrations } from '@/components/purchasing/ExternalIntegrations';
import { WorkflowManager } from '@/components/purchasing/WorkflowManager';
import { TemplateManager } from '@/components/purchasing/TemplateManager';
import { SmartAlerts } from '@/components/purchasing/SmartAlerts';

export default function Purchasing() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Restrict access to direction only
  if (user?.role !== 'direction') {
    return <Navigate to="/" replace />;
  }

  const tabs = [
    {
      id: 'dashboard',
      label: 'Tableau de Bord',
      icon: BarChart3,
      component: PurchasingDashboard
    },
    {
      id: 'alerts',
      label: 'Alertes IA',
      icon: TrendingUp,
      component: SmartAlerts
    },
    {
      id: 'workflows',
      label: 'Workflows',
      icon: Settings,
      component: WorkflowManager
    },
    {
      id: 'templates',
      label: 'Templates',
      icon: Package,
      component: TemplateManager
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
      id: 'bulk',
      label: 'Achats Groupés',
      icon: Package,
      component: BulkPurchasing
    },
    {
      id: 'logistics',
      label: 'Logistique',
      icon: Truck,
      component: InterBaseLogistics
    },
    {
      id: 'scanning',
      label: 'Scanner',
      icon: QrCode,
      component: MobileScanning
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: TrendingUp,
      component: PurchasingAnalytics
    },
    {
      id: 'integrations',
      label: 'Intégrations',
      icon: Globe,
      component: ExternalIntegrations
    }
  ];

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <ShoppingCart className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Module Achats Avancé</h1>
        </div>
        <p className="text-muted-foreground">
          Gestion complète des achats, fournisseurs et logistique inter-bases
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-11 h-auto p-1">
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
                  Module {tab.label.toLowerCase()} pour la gestion avancée des achats
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