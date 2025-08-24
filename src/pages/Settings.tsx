import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Container } from '@/components/layout/Container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings as SettingsIcon, Building, Users, CheckSquare, Wrench, Package, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileCapacitor } from '@/hooks/useMobileCapacitor';
import { BaseSettings } from '@/components/settings/BaseSettings';
import { UserSettings } from '@/components/settings/UserSettings';
import { ChecklistSettings } from '@/components/settings/ChecklistSettings';
import { MaintenanceSettings } from '@/components/settings/MaintenanceSettings';
import { StockSettings } from '@/components/settings/StockSettings';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { OfflineSettings } from '@/components/settings/OfflineSettings';
import { MobileSystemDashboard } from '@/components/mobile/MobileSystemDashboard';

export default function Settings() {
  const { user } = useAuth();
  const { isNative } = useMobileCapacitor();
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');

  const getAvailableTabs = () => {
    const baseTabs = [
      { id: 'profile', label: 'Profil', component: ProfileSettings, icon: User },
      { id: 'offline', label: 'Hors ligne', component: OfflineSettings, icon: Package },
    ];

    if (isNative) {
      baseTabs.push({ id: 'mobile', label: 'Mobile', component: MobileSystemDashboard, icon: SettingsIcon });
    }

    if (user?.role === 'direction') {
      baseTabs.push(
        { id: 'base', label: 'Bases', component: BaseSettings, icon: Building },
        { id: 'users', label: 'Utilisateurs', component: UserSettings, icon: Users }
      );
    }

    if (user?.role === 'direction' || user?.role === 'chef_base') {
      baseTabs.push(
        { id: 'stock', label: 'Stock', component: StockSettings, icon: Package },
        { id: 'checklist', label: 'Checklist', component: ChecklistSettings, icon: CheckSquare },
        { id: 'maintenance', label: 'Maintenance', component: MaintenanceSettings, icon: Wrench }
      );
    }

    return baseTabs;
  };
  const availableTabs = getAvailableTabs();
  const defaultTab = tabFromUrl && availableTabs.some(tab => tab.id === tabFromUrl) 
    ? tabFromUrl 
    : availableTabs[0]?.id || 'profile';

    return (
      <div className="py-6">
        <Container>
        <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Paramètres</h1>
        </div>
        <p className="text-muted-foreground">
          Gérez la configuration de l'application et vos préférences
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="grid w-full max-w-2xl mx-auto" style={{ gridTemplateColumns: `repeat(${availableTabs.length}, minmax(0, 1fr))` }}>
          {availableTabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

          {availableTabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <tab.icon className="h-5 w-5" />
                    {tab.label}
                  </CardTitle>
                  <CardDescription>
                    Configuration des paramètres {tab.label.toLowerCase()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <tab.component />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
        </Container>
      </div>
    );
  }
