import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

interface ExcelImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  onSuccess: () => void;
}

export const ExcelImportDialog: React.FC<ExcelImportDialogProps> = ({
  open,
  onOpenChange,
  campaignId,
  onSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mapping, setMapping] = useState({
    product_name: '',
    category: '',
    quantity: '',
    estimated_price: '',
    priority: '',
    base_name: ''
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Prendre les 5 premières lignes pour l'aperçu
        setPreview(jsonData.slice(0, 5));
        
        // Auto-détection des colonnes
        const headers = jsonData[0] as string[];
        const autoMapping = { ...mapping };
        
        headers.forEach((header, index) => {
          const lowerHeader = header.toLowerCase();
          if (lowerHeader.includes('nom') || lowerHeader.includes('produit') || lowerHeader.includes('article')) {
            autoMapping.product_name = index.toString();
          } else if (lowerHeader.includes('catégorie') || lowerHeader.includes('categorie')) {
            autoMapping.category = index.toString();
          } else if (lowerHeader.includes('quantité') || lowerHeader.includes('quantite') || lowerHeader.includes('qty')) {
            autoMapping.quantity = index.toString();
          } else if (lowerHeader.includes('prix') || lowerHeader.includes('coût') || lowerHeader.includes('cout')) {
            autoMapping.estimated_price = index.toString();
          } else if (lowerHeader.includes('priorité') || lowerHeader.includes('priorite')) {
            autoMapping.priority = index.toString();
          } else if (lowerHeader.includes('base') || lowerHeader.includes('site')) {
            autoMapping.base_name = index.toString();
          }
        });
        
        setMapping(autoMapping);
        
      } catch (error) {
        toast({
          title: 'Erreur',
          description: 'Impossible de lire le fichier Excel',
          variant: 'destructive'
        });
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleImport = async () => {
    if (!file || !preview.length) return;

    setIsLoading(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1) as string[][];
        
        // Traitement des données
        const processedData = rows.map(row => {
          const item: any = {
            campaign_id: campaignId,
            product_name: row[parseInt(mapping.product_name)] || '',
            category: row[parseInt(mapping.category)] || 'Autre',
            total_quantity: parseInt(row[parseInt(mapping.quantity)]) || 0,
            estimated_unit_price: parseFloat(row[parseInt(mapping.estimated_price)]) || 0,
            priority: row[parseInt(mapping.priority)] || 'medium',
            original_requests: JSON.stringify([{
              base_name: row[parseInt(mapping.base_name)] || 'Non spécifié',
              quantity: parseInt(row[parseInt(mapping.quantity)]) || 0,
              notes: `Importé depuis Excel: ${file.name}`
            }])
          };
          return item;
        }).filter(item => item.product_name.trim() !== '');
        
        console.log('Données à importer:', processedData);
        
        // Insert data into database
        const { error } = await supabase
          .from('campaign_items')
          .insert(processedData);
        
        if (error) {
          console.error('Erreur lors de l\'insertion:', error);
          toast({
            title: 'Erreur',
            description: 'Erreur lors de l\'insertion en base de données',
            variant: 'destructive'
          });
          return;
        }
        
        toast({
          title: 'Import terminé',
          description: `${processedData.length} articles importés avec succès`,
        });
        
        onSuccess();
        onOpenChange(false);
      };
      reader.readAsArrayBuffer(file);
      
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Erreur lors de l\'import des données',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importer des articles depuis Excel</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="file-upload">Fichier Excel</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
            />
          </div>

          {preview.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Correspondance des colonnes</Label>
                  <div className="space-y-2 mt-2">
                    <Select value={mapping.product_name} onValueChange={(value) => setMapping({...mapping, product_name: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Nom du produit" />
                      </SelectTrigger>
                      <SelectContent>
                        {preview[0]?.map((header: string, index: number) => (
                          <SelectItem key={index} value={index.toString()}>
                            Colonne {index + 1}: {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={mapping.quantity} onValueChange={(value) => setMapping({...mapping, quantity: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Quantité" />
                      </SelectTrigger>
                      <SelectContent>
                        {preview[0]?.map((header: string, index: number) => (
                          <SelectItem key={index} value={index.toString()}>
                            Colonne {index + 1}: {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={mapping.category} onValueChange={(value) => setMapping({...mapping, category: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Catégorie (optionnel)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Aucune</SelectItem>
                        {preview[0]?.map((header: string, index: number) => (
                          <SelectItem key={index} value={index.toString()}>
                            Colonne {index + 1}: {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label>Aperçu des données</Label>
                  <Card className="mt-2">
                    <CardContent className="p-4">
                      <div className="text-sm space-y-2">
                        {preview.slice(0, 3).map((row: any[], index) => (
                          <div key={index} className="flex space-x-2">
                            {row.slice(0, 4).map((cell, cellIndex) => (
                              <span key={cellIndex} className="bg-gray-100 px-2 py-1 rounded text-xs">
                                {cell}
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={isLoading || !mapping.product_name || !mapping.quantity}
                >
                  {isLoading ? 'Import en cours...' : 'Importer'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};