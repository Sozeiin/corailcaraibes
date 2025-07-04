import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings as SettingsIcon, Building, Users, CheckSquare, Wrench, Package, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { BaseSettings } from '@/components/settings/BaseSettings';
import { UserSettings } from '@/components/settings/UserSettings';
import { ChecklistSettings } from '@/components/settings/ChecklistSettings';
import { MaintenanceSettings } from '@/components/settings/MaintenanceSettings';
import { StockSettings } from '@/components/settings/StockSettings';
import { ProfileSettings } from '@/components/settings/ProfileSettings';

export default function Settings() {
  const { user } = useAuth();

  const getAvailableTabs = () => {
    const tabs = [
      { id: 'profile', label: 'Profil', icon: User, component: ProfileSettings }
    ];

    if (user?.role === 'direction') {
      tabs.unshift(
        { id: 'bases', label: 'Bases', icon: Building, component: BaseSettings },
        { id: 'users', label: 'Utilisateurs', icon: Users, component: UserSettings }
      );
    }

    if (user?.role === 'direction' || user?.role === 'chef_base') {
      tabs.splice(-1, 0, // Insert before profile
        { id: 'checklist', label: 'Checklist', icon: CheckSquare, component: ChecklistSettings },
        { id: 'maintenance', label: 'Maintenance', icon: Wrench, component: MaintenanceSettings },
        { id: 'stock', label: 'Stock', icon: Package, component: StockSettings }
      );
    }

    return tabs;
  };

  const availableTabs = getAvailableTabs();
  const defaultTab = availableTabs[0]?.id || 'profile';

  return (
    <div className="container mx-auto py-6 px-4">
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
    </div>
  );
}