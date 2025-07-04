import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Globe, 
  Link, 
  CheckCircle, 
  XCircle,
  Settings,
  Zap,
  ShoppingCart,
  Mail,
  FileText,
  Database,
  Cloud,
  Smartphone
} from 'lucide-react';

export function ExternalIntegrations() {
  const [activeTab, setActiveTab] = useState('marketplace');

  const integrations = [
    {
      id: 'amazon-business',
      name: 'Amazon Business',
      category: 'marketplace',
      description: 'Intégration avec Amazon Business pour les achats professionnels',
      icon: ShoppingCart,
      status: 'available',
      connected: false,
      features: ['Catalogue étendu', 'Tarifs négociés', 'Livraison rapide']
    },
    {
      id: 'cdiscount-pro',
      name: 'Cdiscount Pro',
      category: 'marketplace',
      description: 'Plateforme d\'achat B2B française',
      icon: ShoppingCart,
      status: 'available',
      connected: true,
      features: ['Prix professionnels', 'Facturation automatisée', 'Support dédié']
    },
    {
      id: 'sap-ariba',
      name: 'SAP Ariba',
      category: 'erp',
      description: 'Intégration avec SAP Ariba pour la gestion des achats',
      icon: Database,
      status: 'coming-soon',
      connected: false,
      features: ['Workflow d\'approbation', 'Gestion des contrats', 'Analytics avancés']
    },
    {
      id: 'sage-x3',
      name: 'Sage X3',
      category: 'erp',
      description: 'Synchronisation avec Sage X3 ERP',
      icon: Database,
      status: 'available',
      connected: false,
      features: ['Synchronisation comptable', 'Gestion des budgets', 'Reporting intégré']
    },
    {
      id: 'email-automation',
      name: 'Email Automation',
      category: 'communication',
      description: 'Automatisation des communications par email',
      icon: Mail,
      status: 'available',
      connected: true,
      features: ['Notifications automatiques', 'Rappels de commande', 'Rapports par email']
    },
    {
      id: 'pdf-generator',
      name: 'Générateur PDF',
      category: 'documentation',
      description: 'Génération automatique de documents PDF',
      icon: FileText,
      status: 'available',
      connected: true,
      features: ['Bons de commande', 'Factures', 'Rapports personnalisés']
    },
    {
      id: 'mobile-app',
      name: 'Application Mobile',
      category: 'mobile',
      description: 'Application mobile pour la gestion des achats',
      icon: Smartphone,
      status: 'beta',
      connected: false,
      features: ['Approbations mobiles', 'Scanner de codes-barres', 'Notifications push']
    },
    {
      id: 'cloud-backup',
      name: 'Sauvegarde Cloud',
      category: 'infrastructure',
      description: 'Sauvegarde automatique des données',
      icon: Cloud,
      status: 'available',
      connected: true,
      features: ['Sauvegarde automatique', 'Chiffrement AES-256', 'Restauration rapide']
    }
  ];

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'available': { label: 'Disponible', variant: 'default' as const, color: 'bg-green-100 text-green-800' },
      'connected': { label: 'Connecté', variant: 'default' as const, color: 'bg-blue-100 text-blue-800' },
      'coming-soon': { label: 'Bientôt', variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800' },
      'beta': { label: 'Bêta', variant: 'outline' as const, color: 'bg-purple-100 text-purple-800' }
    };
    
    const statusInfo = statusMap[status] || statusMap.available;
    return <Badge className={statusInfo.color}>{statusInfo.label}</Badge>;
  };

  const getStatusIcon = (connected: boolean, status: string) => {
    if (connected) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    if (status === 'coming-soon') {
      return <XCircle className="h-5 w-5 text-gray-400" />;
    }
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const categories = [
    { id: 'marketplace', label: 'Marketplaces', icon: ShoppingCart },
    { id: 'erp', label: 'ERP', icon: Database },
    { id: 'communication', label: 'Communication', icon: Mail },
    { id: 'documentation', label: 'Documentation', icon: FileText },
    { id: 'mobile', label: 'Mobile', icon: Smartphone },
    { id: 'infrastructure', label: 'Infrastructure', icon: Cloud }
  ];

  const filteredIntegrations = activeTab === 'all' 
    ? integrations 
    : integrations.filter(integration => integration.category === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Intégrations Externes</h2>
          <p className="text-muted-foreground">
            Connectez FleetCat avec vos outils et services existants
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Paramètres
          </Button>
          <Button>
            <Link className="h-4 w-4 mr-2" />
            Nouvelle Intégration
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Intégrations Actives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {integrations.filter(i => i.connected).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Disponibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {integrations.filter(i => i.status === 'available').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En Développement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {integrations.filter(i => i.status === 'coming-soon' || i.status === 'beta').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Économies Réalisées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">25%</div>
          </CardContent>
        </Card>
      </div>

      {/* Integrations Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          {categories.map(category => (
            <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-2">
              <category.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{category.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map(category => (
          <TabsContent key={category.id} value={category.id} className="space-y-4">
            <div className="grid gap-4">
              {integrations
                .filter(integration => integration.category === category.id)
                .map((integration) => (
                  <Card key={integration.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="p-3 rounded-lg bg-muted">
                            <integration.icon className="h-6 w-6" />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold">{integration.name}</h3>
                              {getStatusBadge(integration.status)}
                              {getStatusIcon(integration.connected, integration.status)}
                            </div>
                            
                            <p className="text-muted-foreground mb-3">
                              {integration.description}
                            </p>
                            
                            <div className="flex flex-wrap gap-2">
                              {integration.features.map((feature, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          {integration.connected && (
                            <Switch checked={true} />
                          )}
                          
                          {integration.status === 'available' && !integration.connected && (
                            <Button>
                              <Link className="h-4 w-4 mr-2" />
                              Connecter
                            </Button>
                          )}
                          
                          {integration.connected && (
                            <Button variant="outline">
                              <Settings className="h-4 w-4 mr-2" />
                              Configurer
                            </Button>
                          )}
                          
                          {integration.status === 'coming-soon' && (
                            <Button variant="outline" disabled>
                              Bientôt Disponible
                            </Button>
                          )}
                          
                          {integration.status === 'beta' && (
                            <Button variant="outline">
                              <Zap className="h-4 w-4 mr-2" />
                              Rejoindre la Bêta
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Integration Help */}
      <Card>
        <CardHeader>
          <CardTitle>Besoin d'Aide pour l'Intégration ?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-3">Documentation</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 border rounded-lg">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Guide d'Intégration</div>
                    <div className="text-sm text-muted-foreground">
                      Documentation complète pour toutes les intégrations
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 border rounded-lg">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">API Reference</div>
                    <div className="text-sm text-muted-foreground">
                      Documentation de l'API FleetCat
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-3">Support</h3>
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  Besoin d'aide pour configurer une intégration ? Contactez notre équipe support à 
                  <strong> support@fleetcat.com</strong> ou utilisez le chat en direct.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}