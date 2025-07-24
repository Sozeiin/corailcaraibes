import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Upload, 
  Download, 
  BarChart3, 
  Package, 
  FileText,
  Target,
  Users
} from 'lucide-react';
import { CampaignItemsTab } from './CampaignItemsTab';
import { CampaignQuotesTab } from './CampaignQuotesTab';
import { CampaignAnalysisTab } from './CampaignAnalysisTab';
import { CampaignOrdersTab } from './CampaignOrdersTab';

interface CampaignDetailsProps {
  campaign: any;
  onBack: () => void;
  onUpdate: () => void;
}

export const CampaignDetails: React.FC<CampaignDetailsProps> = ({
  campaign,
  onBack,
  onUpdate,
}) => {
  const [activeTab, setActiveTab] = useState('items');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'collecting': return 'bg-blue-100 text-blue-700';
      case 'quoting': return 'bg-yellow-100 text-yellow-700';
      case 'analyzing': return 'bg-purple-100 text-purple-700';
      case 'ordering': return 'bg-orange-100 text-orange-700';
      case 'completed': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Brouillon';
      case 'collecting': return 'Collecte';
      case 'quoting': return 'Devis';
      case 'analyzing': return 'Analyse';
      case 'ordering': return 'Commande';
      case 'completed': return 'Terminé';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <p className="text-muted-foreground">Campagne {campaign.campaign_year}</p>
          </div>
          <Badge className={getStatusColor(campaign.status)}>
            {getStatusLabel(campaign.status)}
          </Badge>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Importer Excel
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analyse
          </Button>
        </div>
      </div>

      {campaign.description && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">{campaign.description}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Articles</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.total_items || 0}</div>
            <p className="text-xs text-muted-foreground">Articles dans la campagne</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur Estimée</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Number(campaign.total_estimated_value || 0).toLocaleString('fr-FR', {
                style: 'currency',
                currency: 'EUR'
              })}
            </div>
            <p className="text-xs text-muted-foreground">Estimation totale</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devis</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Devis reçus</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bases</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Bases participantes</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="items">Articles</TabsTrigger>
          <TabsTrigger value="quotes">Devis</TabsTrigger>
          <TabsTrigger value="analysis">Analyse</TabsTrigger>
          <TabsTrigger value="orders">Commandes</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          <CampaignItemsTab campaignId={campaign.id} />
        </TabsContent>

        <TabsContent value="quotes" className="space-y-4">
          <CampaignQuotesTab campaignId={campaign.id} />
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <CampaignAnalysisTab campaignId={campaign.id} />
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <CampaignOrdersTab campaignId={campaign.id} />
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribution par Base</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4" />
                <p>Distribution non configurée</p>
                <p className="text-sm">Configurez la répartition entre les bases</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};