import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Download, FileSpreadsheet, FileText, FileJson } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

interface CampaignExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: any;
}

export const CampaignExportDialog: React.FC<CampaignExportDialogProps> = ({
  open,
  onOpenChange,
  campaign
}) => {
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv' | 'json'>('excel');
  const [exportSections, setExportSections] = useState({
    campaign: true,
    items: true,
    quotes: true,
    analysis: false
  });
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const exportData: any = {};
      
      // Export campaign info
      if (exportSections.campaign) {
        exportData.campaign = {
          name: campaign.name,
          year: campaign.campaign_year,
          description: campaign.description,
          status: campaign.status,
          total_items: campaign.total_items,
          total_estimated_value: campaign.total_estimated_value,
          created_at: campaign.created_at
        };
      }
      
      // Export campaign items
      if (exportSections.items) {
        const { data: items, error: itemsError } = await supabase
          .from('campaign_items')
          .select('*')
          .eq('campaign_id', campaign.id);
        
        if (itemsError) throw itemsError;
        exportData.items = items;
      }
      
      // Export quotes
      if (exportSections.quotes) {
        const { data: quotes, error: quotesError } = await supabase
          .from('supplier_quotes')
          .select(`
            *,
            supplier:suppliers(name, email, phone),
            campaign_item:campaign_items(product_name, category)
          `)
          .in('campaign_item_id', 
            exportData.items?.map((item: any) => item.id) || []
          );
        
        if (quotesError) throw quotesError;
        exportData.quotes = quotes;
      }
      
      // Export analysis
      if (exportSections.analysis) {
        const { data: analysis, error: analysisError } = await supabase
          .from('quote_analysis')
          .select('*')
          .in('campaign_item_id', 
            exportData.items?.map((item: any) => item.id) || []
          );
        
        if (analysisError) throw analysisError;
        exportData.analysis = analysis;
      }
      
      // Generate export file
      const fileName = `campagne-${campaign.name}-${new Date().toISOString().split('T')[0]}`;
      
      if (exportFormat === 'excel') {
        const wb = XLSX.utils.book_new();
        
        Object.entries(exportData).forEach(([key, data]) => {
          if (Array.isArray(data)) {
            const ws = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, key);
          } else {
            const ws = XLSX.utils.json_to_sheet([data]);
            XLSX.utils.book_append_sheet(wb, ws, key);
          }
        });
        
        XLSX.writeFile(wb, `${fileName}.xlsx`);
      } else if (exportFormat === 'csv') {
        // For CSV, export only items (main data)
        if (exportData.items) {
          const ws = XLSX.utils.json_to_sheet(exportData.items);
          const csv = XLSX.utils.sheet_to_csv(ws);
          
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `${fileName}.csv`;
          link.click();
        }
      } else if (exportFormat === 'json') {
        const jsonStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${fileName}.json`;
        link.click();
      }
      
      toast({
        title: 'Export terminé',
        description: `Les données ont été exportées avec succès`,
      });
      
      onOpenChange(false);
      
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast({
        title: 'Erreur',
        description: 'Erreur lors de l\'export des données',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'excel': return <FileSpreadsheet className="h-4 w-4" />;
      case 'csv': return <FileText className="h-4 w-4" />;
      case 'json': return <FileJson className="h-4 w-4" />;
      default: return <Download className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Exporter la campagne</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Format d'export</Label>
            <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">
                  <div className="flex items-center space-x-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Excel (.xlsx)</span>
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>CSV (.csv)</span>
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center space-x-2">
                    <FileJson className="h-4 w-4" />
                    <span>JSON (.json)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Sections à exporter</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="campaign"
                  checked={exportSections.campaign}
                  onCheckedChange={(checked) => 
                    setExportSections({...exportSections, campaign: checked as boolean})
                  }
                />
                <Label htmlFor="campaign">Informations de la campagne</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="items"
                  checked={exportSections.items}
                  onCheckedChange={(checked) => 
                    setExportSections({...exportSections, items: checked as boolean})
                  }
                />
                <Label htmlFor="items">Articles</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="quotes"
                  checked={exportSections.quotes}
                  onCheckedChange={(checked) => 
                    setExportSections({...exportSections, quotes: checked as boolean})
                  }
                />
                <Label htmlFor="quotes">Devis</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="analysis"
                  checked={exportSections.analysis}
                  onCheckedChange={(checked) => 
                    setExportSections({...exportSections, analysis: checked as boolean})
                  }
                />
                <Label htmlFor="analysis">Analyse</Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleExport}
              disabled={isExporting || !Object.values(exportSections).some(Boolean)}
            >
              {getFormatIcon(exportFormat)}
              <span className="ml-2">
                {isExporting ? 'Export en cours...' : 'Exporter'}
              </span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};