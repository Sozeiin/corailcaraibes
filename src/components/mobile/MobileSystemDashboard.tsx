import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Smartphone, 
  Wifi, 
  WifiOff, 
  Database, 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Download,
  Upload,
  Settings,
  BarChart3,
  FileText
} from 'lucide-react';
import { useMobileSystem } from '@/hooks/useMobileSystem';
import { useMobileCapacitor } from '@/hooks/useMobileCapacitor';
import { MobileDataManager } from '@/components/mobile/MobileDataManager';
import { safeAppendChild } from '@/lib/domUtils';

export const MobileSystemDashboard = () => {
  const { status, actions, isInitialized, isInitializing } = useMobileSystem();
  const { isNative } = useMobileCapacitor();
  const [diagnostics, setDiagnostics] = useState<any>(null);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'poor': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'excellent': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'good': return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'poor': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const handleExportDiagnostics = async () => {
    const diagnosticsData = await actions.exportDiagnostics();
    setDiagnostics(diagnosticsData);
    
    // Download as JSON file
    const blob = new Blob([JSON.stringify(diagnosticsData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mobile-diagnostics-${new Date().toISOString().split('T')[0]}.json`;
    
    try {
      const cleanup = safeAppendChild(document.body, a);
      a.click();
      cleanup();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      URL.revokeObjectURL(url);
      throw error;
    }
  };

  if (!isNative) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Tableau de bord mobile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Le tableau de bord mobile n'est disponible que sur les appareils mobiles natifs.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Smartphone className="h-6 w-6" />
            Système Mobile
          </h2>
          <p className="text-muted-foreground">
            Gestion et monitoring du système mobile/offline
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {isInitializing && (
            <Badge variant="secondary" className="animate-pulse">
              Initialisation...
            </Badge>
          )}
          {isInitialized && (
            <Badge variant="default" className="flex items-center gap-1">
              {getHealthIcon(status.systemHealth)}
              Système {status.systemHealth}
            </Badge>
          )}
        </div>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Connexion</p>
                <p className="text-lg font-semibold">
                  {status.isOnline ? 'En ligne' : 'Hors ligne'}
                </p>
              </div>
              {status.isOnline ? (
                <Wifi className="h-8 w-8 text-green-500" />
              ) : (
                <WifiOff className="h-8 w-8 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Base offline</p>
                <p className="text-lg font-semibold">
                  {status.isOfflineReady ? 'Prête' : 'En cours'}
                </p>
              </div>
              <Database className={`h-8 w-8 ${status.isOfflineReady ? 'text-green-500' : 'text-yellow-500'}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Modifications</p>
                <p className="text-lg font-semibold">
                  {status.hasPendingChanges ? 'En attente' : 'Synchronisé'}
                </p>
              </div>
              {status.hasPendingChanges ? (
                <Upload className="h-8 w-8 text-orange-500" />
              ) : (
                <CheckCircle className="h-8 w-8 text-green-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Santé système</p>
                <p className={`text-lg font-semibold ${getHealthColor(status.systemHealth)}`}>
                  {status.systemHealth}
                </p>
              </div>
              {getHealthIcon(status.systemHealth)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sync Progress */}
      {status.syncProgress > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Synchronisation en cours</span>
                <span className="text-sm text-muted-foreground">{status.syncProgress}%</span>
              </div>
              <Progress value={status.syncProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {status.hasConflicts && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Des conflits de synchronisation ont été détectés. 
            <Button 
              variant="link" 
              className="p-0 h-auto ml-1"
              onClick={actions.resolveAllConflicts}
            >
              Résoudre automatiquement
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {status.systemHealth === 'critical' && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Le système mobile nécessite une attention immédiate. Vérifiez la connectivité et synchronisez vos données.
          </AlertDescription>
        </Alert>
      )}

      {/* Detailed Information */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="data">Gestion des données</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Informations système</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Taille des données:</span>
                  <span className="font-medium">{status.estimatedDataSize}</span>
                </div>
                <div className="flex justify-between">
                  <span>Dernière sync:</span>
                  <span className="font-medium">
                    {status.lastFullSync ? 
                      status.lastFullSync.toLocaleString('fr-FR') : 
                      'Jamais'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Sync arrière-plan:</span>
                  <Badge variant={status.backgroundSyncEnabled ? "default" : "secondary"}>
                    {status.backgroundSyncEnabled ? 'Activée' : 'Désactivée'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actions rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  onClick={actions.performFullSync} 
                  disabled={!status.isOnline}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Synchroniser maintenant
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={actions.optimizeDatabase}
                  className="w-full"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Optimiser la base
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleExportDiagnostics}
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Exporter diagnostics
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="data">
          <MobileDataManager />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Paramètres système
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Synchronisation automatique</p>
                  <p className="text-sm text-muted-foreground">
                    Synchroniser en arrière-plan quand l'app est fermée
                  </p>
                </div>
                <Button
                  variant={status.backgroundSyncEnabled ? "default" : "outline"}
                  onClick={() => actions.toggleBackgroundSync(!status.backgroundSyncEnabled)}
                >
                  {status.backgroundSyncEnabled ? 'Désactiver' : 'Activer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diagnostics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Diagnostics système
              </CardTitle>
              <CardDescription>
                Informations détaillées sur l'état du système mobile
              </CardDescription>
            </CardHeader>
            <CardContent>
              {diagnostics ? (
                <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-96">
                  {JSON.stringify(diagnostics, null, 2)}
                </pre>
              ) : (
                <p className="text-muted-foreground">
                  Cliquez sur "Exporter diagnostics" pour générer un rapport détaillé.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};