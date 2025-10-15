import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { downloadStockTemplate } from '@/utils/stockTemplate';

interface StockImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ImportItem {
  name: string;
  reference?: string;
  category?: string;
  quantity?: number;
  minThreshold?: number;
  unit?: string;
  location?: string;
  supplier?: string;
  base?: string;
  brand?: string;
  supplierReference?: string;
}

export function StockImportDialog({ isOpen, onClose }: StockImportDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{
    success: number;
    errors: { row: number; message: string }[];
    suppliersCreated: number;
  } | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResults(null);
    }
  };

  const parseExcelFile = (file: File): Promise<ImportItem[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          // Assume first row is headers
          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1) as any[][];

          const items: ImportItem[] = rows
            .filter(row => row.length > 0 && row[0]) // Filter empty rows
            .map(row => {
              const item: ImportItem = {
                name: String(row[0] || '').trim(),
              };

              // Map common column names
              headers.forEach((header, index) => {
                const value = row[index];
                if (!value) return;

                const headerLower = String(header).toLowerCase();
                
                if (headerLower.includes('référence') || headerLower.includes('reference') || headerLower.includes('ref')) {
                  item.reference = String(value).trim();
                } else if (headerLower.includes('catégorie') || headerLower.includes('category')) {
                  item.category = String(value).trim();
                } else if (headerLower.includes('quantité') || headerLower.includes('quantity') || headerLower.includes('qty')) {
                  item.quantity = Number(value) || 0;
                } else if (headerLower.includes('seuil') || headerLower.includes('minimum') || headerLower.includes('min')) {
                  item.minThreshold = Number(value) || 0;
                } else if (headerLower.includes('unité') || headerLower.includes('unit')) {
                  item.unit = String(value).trim();
                } else if (headerLower.includes('emplacement') || headerLower.includes('location')) {
                  item.location = String(value).trim();
                } else if (headerLower.includes('fournisseur') || headerLower.includes('supplier')) {
                  item.supplier = String(value).trim();
                } else if (headerLower.includes('base') || headerLower.includes('guadeloupe') || headerLower.includes('martinique') || headerLower.includes('saint-martin')) {
                  item.base = String(value).trim();
                } else if (headerLower.includes('marque') || headerLower.includes('brand')) {
                  item.brand = String(value).trim();
                } else if (headerLower.includes('référence fournisseur') || headerLower.includes('supplier reference') || headerLower.includes('ref fournisseur')) {
                  item.supplierReference = String(value).trim();
                }
              });

              return item;
            })
            .filter(item => item.name); // Only keep items with names

          resolve(items);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
      reader.readAsBinaryString(file);
    });
  };

  const importItems = async () => {
    if (!file || !user) return;

    setImporting(true);
    setProgress(0);
    setResults({ success: 0, errors: [], suppliersCreated: 0 });

    try {
      // Récupérer les bases et fournisseurs existants
      const [basesResponse, suppliersResponse] = await Promise.all([
        supabase.from('bases').select('id, name'),
        supabase.from('suppliers').select('id, name, base_id'),
      ]);

      const bases = basesResponse.data || [];
      const existingSuppliers = suppliersResponse.data || [];

      const items = await parseExcelFile(file);
      const totalItems = items.length;
      let successCount = 0;
      let suppliersCreated = 0;
      const errors: { row: number; message: string }[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        try {
          // Déterminer la base
          let baseId = user.baseId;
          if (item.base) {
            const baseMatch = bases.find(b => 
              b.name.toLowerCase().includes(item.base.toLowerCase()) ||
              item.base.toLowerCase().includes(b.name.toLowerCase()) ||
              (item.base.toLowerCase().includes('guadeloupe') && b.name.toLowerCase().includes('guadeloupe')) ||
              (item.base.toLowerCase().includes('martinique') && b.name.toLowerCase().includes('martinique')) ||
              (item.base.toLowerCase().includes('saint-martin') && b.name.toLowerCase().includes('saint-martin'))
            );
            if (baseMatch) {
              baseId = baseMatch.id;
            }
          }

          // Gérer le fournisseur si spécifié
          let supplierId = null;
          if (item.supplier && baseId) {
            let supplier = existingSuppliers.find(s => 
              s.name.toLowerCase() === item.supplier.toLowerCase() && s.base_id === baseId
            );

            if (!supplier) {
              // Créer le fournisseur
              const { data: newSupplier, error: supplierError } = await supabase
                .from('suppliers')
                .insert({
                  name: item.supplier,
                  base_id: baseId,
                  category: item.category || 'Autre',
                })
                .select()
                .single();

              if (supplierError) {
                errors.push({
                  row: i + 2,
                  message: `Erreur création fournisseur: ${supplierError.message}`,
                });
                continue;
              } else {
                supplier = newSupplier;
                existingSuppliers.push(supplier);
                suppliersCreated++;
              }
            }
            supplierId = supplier.id;
          }

          // Insérer l'article
          const { error } = await supabase
            .from('stock_items')
            .insert({
              name: item.name,
              reference: item.reference || null,
              category: item.category || null,
              quantity: item.quantity || 0,
              min_threshold: item.minThreshold || 0,
              unit: item.unit || 'pièce',
              location: item.location || null,
              base_id: baseId,
              last_updated: new Date().toISOString(),
              brand: item.brand || null,
              supplier_reference: item.supplierReference || null,
            });

          if (error) {
            errors.push({
              row: i + 2,
              message: error.message,
            });
          } else {
            successCount++;
          }
        } catch (error) {
          errors.push({
            row: i + 2,
            message: 'Erreur lors de l\'insertion',
          });
        }

        setProgress(((i + 1) / totalItems) * 100);
      }

      setResults({ success: successCount, errors, suppliersCreated });
      
      if (successCount > 0) {
        queryClient.invalidateQueries({ queryKey: ['stock'] });
        toast({
          title: 'Import terminé',
          description: `${successCount} article(s) et ${suppliersCreated} fournisseur(s) importé(s)`,
        });
      }

      if (errors.length > 0) {
        toast({
          title: 'Import avec erreurs',
          description: `${errors.length} erreur(s) détectée(s)`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erreur d\'import',
        description: 'Impossible de traiter le fichier Excel',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setProgress(0);
    setResults(null);
    setImporting(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Excel - Articles de stock
          </DialogTitle>
          <DialogDescription>
            Importez vos articles depuis un fichier Excel. 
            Le fichier doit contenir au minimum une colonne "Nom" pour les articles.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format attendu */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Format attendu :</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div>• <strong>Nom</strong> (obligatoire) : Nom de l'article</div>
              <div>• <strong>Référence</strong> (optionnel) : Référence de l'article</div>
              <div>• <strong>Catégorie</strong> (optionnel) : Catégorie de l'article</div>
              <div>• <strong>Quantité</strong> (optionnel) : Quantité en stock</div>
              <div>• <strong>Seuil minimum</strong> (optionnel) : Seuil d'alerte</div>
              <div>• <strong>Unité</strong> (optionnel) : Unité de mesure</div>
              <div>• <strong>Emplacement</strong> (optionnel) : Localisation</div>
              <div>• <strong>Fournisseur</strong> (optionnel) : Nom du fournisseur</div>
              <div>• <strong>Base</strong> (optionnel) : Guadeloupe, Martinique ou Saint-Martin</div>
              <div>• <strong>Marque</strong> (optionnel) : Marque du produit</div>
              <div>• <strong>Référence Fournisseur</strong> (optionnel) : Référence chez le fournisseur</div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={downloadStockTemplate}
            >
              <Download className="mr-2 h-4 w-4" />
              Télécharger le modèle Excel
            </Button>
          </div>

          {/* Upload de fichier */}
          <div>
            <label htmlFor="excel-file" className="block text-sm font-medium mb-2">
              Sélectionner un fichier Excel
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="excel-file" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      {file ? file.name : 'Choisir un fichier Excel'}
                    </span>
                    <span className="mt-1 block text-sm text-gray-500">
                      Formats supportés : .xlsx, .xls
                    </span>
                  </label>
                  <input
                    id="excel-file"
                    type="file"
                    className="sr-only"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    disabled={importing}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {importing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Import en cours...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="space-y-3">
              {results.success > 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{results.success}</strong> article(s) importé(s) avec succès
                    {results.suppliersCreated > 0 && (
                      <span>, <strong>{results.suppliersCreated}</strong> fournisseur(s) créé(s)</span>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              
              {results.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div>
                      <strong>{results.errors.length}</strong> erreur(s) détectée(s) :
                      <ul className="mt-2 max-h-32 overflow-y-auto text-xs">
                        {results.errors.slice(0, 5).map((error, index) => (
                          <li key={index} className="mt-1">
                            Ligne {error.row}: {error.message}
                          </li>
                        ))}
                        {results.errors.length > 5 && (
                          <li className="mt-1 font-medium">
                            ... et {results.errors.length - 5} autres erreurs
                          </li>
                        )}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose} disabled={importing}>
              {results ? 'Fermer' : 'Annuler'}
            </Button>
            {!results && (
              <Button 
                onClick={importItems} 
                disabled={!file || importing}
                className="bg-marine-600 hover:bg-marine-700"
              >
                {importing ? 'Import en cours...' : 'Importer'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}