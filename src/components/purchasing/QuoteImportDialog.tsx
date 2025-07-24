import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileText, AlertCircle, CheckCircle, Eye, Edit, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface QuoteItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  reference?: string;
  description?: string;
  matched_campaign_item_id?: string;
  match_confidence?: number;
}

interface ExtractedQuote {
  supplier_name?: string;
  quote_reference?: string;
  quote_date?: string;
  items: QuoteItem[];
  total_amount?: number;
  validity_date?: string;
}

interface QuoteImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  onSuccess: () => void;
}

export const QuoteImportDialog: React.FC<QuoteImportDialogProps> = ({
  open,
  onOpenChange,
  campaignId,
  onSuccess
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedQuote, setExtractedQuote] = useState<ExtractedQuote | null>(null);
  const [campaignItems, setCampaignItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [step, setStep] = useState<'upload' | 'review' | 'match'>('upload');

  React.useEffect(() => {
    if (open) {
      fetchCampaignItems();
      fetchSuppliers();
    }
  }, [open, campaignId]);

  const fetchCampaignItems = async () => {
    const { data, error } = await supabase
      .from('campaign_items')
      .select('*')
      .eq('campaign_id', campaignId);
    
    if (error) {
      console.error('Error fetching campaign items:', error);
    } else {
      setCampaignItems(data || []);
    }
  };

  const fetchSuppliers = async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching suppliers:', error);
    } else {
      setSuppliers(data || []);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: 'Erreur',
        description: 'Seuls les fichiers PDF sont acceptés',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('process-quote-pdf', {
        body: formData
      });

      if (error) throw error;

      if (data.success) {
        setExtractedQuote(data.extracted_quote);
        setStep('review');
        
        toast({
          title: 'Devis analysé',
          description: `${data.extracted_quote.items.length} articles extraits`,
        });
      } else {
        throw new Error(data.error || 'Erreur lors du traitement');
      }

    } catch (error) {
      console.error('Error processing quote:', error);
      toast({
        title: 'Erreur',
        description: 'Erreur lors du traitement du devis',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const matchItemsToCampaign = () => {
    if (!extractedQuote) return;

    const matchedItems = extractedQuote.items.map(item => {
      // Simple matching algorithm based on product name similarity
      const matches = campaignItems.filter(campaignItem => {
        const similarity = calculateSimilarity(
          item.product_name.toLowerCase(),
          campaignItem.product_name.toLowerCase()
        );
        return similarity > 0.6; // 60% similarity threshold
      });

      if (matches.length > 0) {
        const bestMatch = matches.reduce((best, current) => {
          const bestSimilarity = calculateSimilarity(
            item.product_name.toLowerCase(),
            best.product_name.toLowerCase()
          );
          const currentSimilarity = calculateSimilarity(
            item.product_name.toLowerCase(),
            current.product_name.toLowerCase()
          );
          return currentSimilarity > bestSimilarity ? current : best;
        });

        return {
          ...item,
          matched_campaign_item_id: bestMatch.id,
          match_confidence: calculateSimilarity(
            item.product_name.toLowerCase(),
            bestMatch.product_name.toLowerCase()
          )
        };
      }

      return item;
    });

    setExtractedQuote({ ...extractedQuote, items: matchedItems });
    setStep('match');
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  };

  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  const handleImportQuotes = async () => {
    if (!extractedQuote || !selectedSupplierId) return;

    setIsProcessing(true);

    try {
      // Insert quotes for each item
      const quotesToInsert = extractedQuote.items
        .filter(item => item.matched_campaign_item_id)
        .map(item => ({
          campaign_item_id: item.matched_campaign_item_id,
          supplier_id: selectedSupplierId,
          unit_price: item.unit_price,
          minimum_quantity: item.quantity,
          quality_rating: 5,
          quote_date: extractedQuote.quote_date || new Date().toISOString().split('T')[0],
          valid_until: extractedQuote.validity_date,
          quote_reference: extractedQuote.quote_reference,
          notes: `Importé automatiquement - ${item.description || ''}`
        }));

      const { error } = await supabase
        .from('supplier_quotes')
        .insert(quotesToInsert);

      if (error) throw error;

      toast({
        title: 'Import terminé',
        description: `${quotesToInsert.length} devis importés avec succès`,
      });

      onSuccess();
      onOpenChange(false);
      resetDialog();

    } catch (error) {
      console.error('Error importing quotes:', error);
      toast({
        title: 'Erreur',
        description: 'Erreur lors de l\'import des devis',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetDialog = () => {
    setStep('upload');
    setExtractedQuote(null);
    setSelectedSupplierId('');
  };

  const getConfidenceBadge = (confidence?: number) => {
    if (!confidence) return null;
    
    const percentage = Math.round(confidence * 100);
    const variant = percentage >= 80 ? 'default' : percentage >= 60 ? 'secondary' : 'destructive';
    
    return <Badge variant={variant}>{percentage}%</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer un devis PDF</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="text-center border-2 border-dashed border-gray-300 rounded-lg p-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <div className="space-y-2">
                  <Label htmlFor="pdf-upload" className="cursor-pointer">
                    <span className="text-lg font-medium">Sélectionner un fichier PDF</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      Le devis sera analysé automatiquement pour extraire les articles
                    </p>
                  </Label>
                  <Input
                    id="pdf-upload"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>
              
              {isProcessing && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span>Analyse du devis en cours...</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {step === 'review' && extractedQuote && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Devis extrait</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Fournisseur:</span>
                      <p>{extractedQuote.supplier_name || 'Non détecté'}</p>
                    </div>
                    <div>
                      <span className="font-medium">Référence:</span>
                      <p>{extractedQuote.quote_reference || 'Non détecté'}</p>
                    </div>
                    <div>
                      <span className="font-medium">Date:</span>
                      <p>{extractedQuote.quote_date || 'Non détecté'}</p>
                    </div>
                    <div>
                      <span className="font-medium">Montant total:</span>
                      <p>{extractedQuote.total_amount ? `${extractedQuote.total_amount}€` : 'Non détecté'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Articles extraits ({extractedQuote.items.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Article</TableHead>
                        <TableHead>Référence</TableHead>
                        <TableHead>Quantité</TableHead>
                        <TableHead>Prix unitaire</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {extractedQuote.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.product_name}</p>
                              {item.description && (
                                <p className="text-sm text-muted-foreground">{item.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{item.reference || '-'}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.unit_price.toFixed(2)}€</TableCell>
                          <TableCell>{item.total_price.toFixed(2)}€</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={resetDialog}>
                  Recommencer
                </Button>
                <Button onClick={matchItemsToCampaign}>
                  Associer aux articles de la campagne
                </Button>
              </div>
            </div>
          )}

          {step === 'match' && extractedQuote && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Fournisseur</Label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le fournisseur" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Association des articles</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Article du devis</TableHead>
                        <TableHead>Article de la campagne</TableHead>
                        <TableHead>Confiance</TableHead>
                        <TableHead>Prix unitaire</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {extractedQuote.items.map((item, index) => {
                        const matchedItem = item.matched_campaign_item_id 
                          ? campaignItems.find(ci => ci.id === item.matched_campaign_item_id)
                          : null;
                        
                        return (
                          <TableRow key={index}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.product_name}</p>
                                <p className="text-sm text-muted-foreground">Qté: {item.quantity}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {matchedItem ? (
                                <div>
                                  <p className="font-medium">{matchedItem.product_name}</p>
                                  <p className="text-sm text-muted-foreground">{matchedItem.category}</p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Aucune correspondance</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {getConfidenceBadge(item.match_confidence)}
                            </TableCell>
                            <TableCell>{item.unit_price.toFixed(2)}€</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setStep('review')}>
                  Retour
                </Button>
                <Button 
                  onClick={handleImportQuotes}
                  disabled={isProcessing || !selectedSupplierId || 
                    !extractedQuote.items.some(item => item.matched_campaign_item_id)}
                >
                  {isProcessing ? 'Import en cours...' : 'Importer les devis'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};