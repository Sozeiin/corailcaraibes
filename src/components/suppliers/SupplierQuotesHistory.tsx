import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, FileText, TrendingUp, CheckCircle, XCircle, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Supplier } from '@/types';

interface SupplierQuotesHistoryProps {
  supplier: Supplier;
}

interface SupplierQuote {
  id: string;
  stock_item_id: string;
  supplier_id: string;
  quote_number: string | null;
  unit_price: number;
  minimum_quantity: number;
  quote_date: string;
  validity_date: string | null;
  delivery_days: number;
  status: string;
  currency: string;
  payment_terms: string | null;
  warranty_months: number;
  notes: string | null;
  stock_item: {
    name: string;
    reference: string | null;
    category: string | null;
  };
}

interface QuoteFormData {
  stockItemId: string;
  quoteNumber: string;
  unitPrice: number;
  minimumQuantity: number;
  validityDate: Date | null;
  deliveryDays: number;
  currency: string;
  paymentTerms: string;
  warrantyMonths: number;
  notes: string;
}

const initialFormData: QuoteFormData = {
  stockItemId: '',
  quoteNumber: '',
  unitPrice: 0,
  minimumQuantity: 1,
  validityDate: null,
  deliveryDays: 7,
  currency: 'EUR',
  paymentTerms: '',
  warrantyMonths: 0,
  notes: ''
};

export function SupplierQuotesHistory({ supplier }: SupplierQuotesHistoryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<QuoteFormData>(initialFormData);

  // Fetch quotes for this supplier
  const { data: rawQuotes = [], isLoading } = useQuery({
    queryKey: ['supplier-quotes', supplier.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_item_quotes')
        .select('*')
        .eq('supplier_id', supplier.id)
        .order('quote_date', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  // Fetch stock items separately to avoid join issues
  const { data: stockItems = [] } = useQuery({
    queryKey: ['stock-items-for-quotes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_items')
        .select('id, name, reference, category');

      if (error) throw error;
      return data || [];
    }
  });

  // Combine quotes with stock item data
  const quotes: SupplierQuote[] = rawQuotes.map(quote => {
    const stockItem = stockItems.find(item => item.id === quote.stock_item_id);
    return {
      ...quote,
      stock_item: stockItem || { name: 'Article inconnu', reference: null, category: null }
    };
  });

  // Fetch available stock items for creating new quotes
  const { data: availableStockItems = [] } = useQuery({
    queryKey: ['available-stock-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_items')
        .select('id, name, reference, category')
        .order('name');

      if (error) throw error;
      return data || [];
    }
  });

  // Create quote mutation
  const createQuoteMutation = useMutation({
    mutationFn: async (quoteData: QuoteFormData) => {
      const user = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('stock_item_quotes')
        .insert({
          stock_item_id: quoteData.stockItemId,
          supplier_id: supplier.id,
          quote_number: quoteData.quoteNumber,
          unit_price: quoteData.unitPrice,
          minimum_quantity: quoteData.minimumQuantity,
          validity_date: quoteData.validityDate ? quoteData.validityDate.toISOString().split('T')[0] : null,
          delivery_days: quoteData.deliveryDays,
          currency: quoteData.currency,
          payment_terms: quoteData.paymentTerms,
          warranty_months: quoteData.warrantyMonths,
          notes: quoteData.notes,
          status: 'received',
          response_date: new Date().toISOString().split('T')[0],
          requested_by: user.data.user?.id
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-quotes'] });
      setIsDialogOpen(false);
      setFormData(initialFormData);
      toast({
        title: 'Devis enregistré',
        description: 'Le devis a été ajouté avec succès'
      });
    },
    onError: (error) => {
      console.error('Error creating quote:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer le devis',
        variant: 'destructive'
      });
    }
  });

  // Update quote status mutation
  const updateQuoteStatusMutation = useMutation({
    mutationFn: async ({ quoteId, status }: { quoteId: string; status: string }) => {
      const updateData: any = { status };
      
      if (status === 'selected') {
        updateData.selected_at = new Date().toISOString();
        updateData.selected_by = (await supabase.auth.getUser()).data.user?.id;
      }

      const { data, error } = await supabase
        .from('stock_item_quotes')
        .update(updateData)
        .eq('id', quoteId)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-quotes'] });
      toast({
        title: 'Statut mis à jour',
        description: 'Le statut du devis a été mis à jour'
      });
    }
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'requested': { label: 'Demandé', variant: 'secondary' as const },
      'received': { label: 'Reçu', variant: 'default' as const },
      'selected': { label: 'Sélectionné', variant: 'default' as const },
      'rejected': { label: 'Rejeté', variant: 'destructive' as const },
      'expired': { label: 'Expiré', variant: 'outline' as const },
      'cancelled': { label: 'Annulé', variant: 'outline' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.received;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getBestQuoteByItem = () => {
    const quotesByItem = quotes.reduce((acc, quote) => {
      const itemId = quote.stock_item_id;
      if (!acc[itemId]) acc[itemId] = [];
      acc[itemId].push(quote);
      return acc;
    }, {} as Record<string, SupplierQuote[]>);

    const bestQuotes = Object.entries(quotesByItem).map(([itemId, itemQuotes]) => {
      const receivedQuotes = itemQuotes.filter(q => q.status === 'received');
      if (receivedQuotes.length === 0) return null;
      
      return receivedQuotes.reduce((best, current) => {
        return current.unit_price < best.unit_price ? current : best;
      });
    }).filter(Boolean);

    return bestQuotes;
  };

  const bestQuotes = getBestQuoteByItem();

  if (isLoading) {
    return <div className="p-4 text-center">Chargement des devis...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Devis</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            <div className="text-lg sm:text-2xl font-bold">{quotes.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Articles cotés</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            <div className="text-lg sm:text-2xl font-bold">
              {new Set(quotes.map(q => q.stock_item_id)).size}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Meilleurs prix</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            <div className="text-lg sm:text-2xl font-bold">{bestQuotes.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">En Attente</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            <div className="text-lg sm:text-2xl font-bold">
              {quotes.filter(q => q.status === 'requested').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Button */}
      <div className="flex justify-end px-2 sm:px-0">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="text-sm">
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              Ajouter un devis
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ajouter un devis pour {supplier.name}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-1">
                <Label>Article de stock *</Label>
                <Select
                  value={formData.stockItemId}
                  onValueChange={(value) => setFormData({ ...formData, stockItemId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un article" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStockItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} {item.reference && `(${item.reference})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-1">
                <Label>Numéro de devis</Label>
                <Input
                  value={formData.quoteNumber}
                  onChange={(e) => setFormData({ ...formData, quoteNumber: e.target.value })}
                  placeholder="Référence du devis"
                />
              </div>

              <div className="space-y-2 sm:col-span-1">
                <Label>Prix unitaire (€) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2 sm:col-span-1">
                <Label>Quantité minimum</Label>
                <Input
                  type="number"
                  value={formData.minimumQuantity}
                  onChange={(e) => setFormData({ ...formData, minimumQuantity: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div className="space-y-2 sm:col-span-1">
                <Label>Date de validité</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.validityDate 
                        ? format(formData.validityDate, 'dd/MM/yyyy', { locale: fr })
                        : "Sélectionner une date"
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.validityDate || undefined}
                      onSelect={(date) => setFormData({ ...formData, validityDate: date || null })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2 sm:col-span-1">
                <Label>Délai de livraison (jours)</Label>
                <Input
                  type="number"
                  value={formData.deliveryDays}
                  onChange={(e) => setFormData({ ...formData, deliveryDays: parseInt(e.target.value) || 7 })}
                />
              </div>

              <div className="col-span-1 sm:col-span-2 space-y-2">
                <Label>Conditions de paiement</Label>
                <Input
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  placeholder="ex: 30 jours net"
                />
              </div>

              <div className="col-span-1 sm:col-span-2 space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Remarques sur le devis..."
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
                Annuler
              </Button>
              <Button 
                onClick={() => createQuoteMutation.mutate(formData)}
                disabled={!formData.stockItemId || formData.unitPrice <= 0 || createQuoteMutation.isPending}
                className="w-full sm:w-auto"
              >
                Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quotes Table */}
      {quotes.length > 0 ? (
        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Article</TableHead>
              <TableHead className="min-w-[120px]">Référence devis</TableHead>
              <TableHead className="min-w-[100px]">Prix unitaire</TableHead>
              <TableHead className="min-w-[80px]">Qté min</TableHead>
              <TableHead className="min-w-[90px]">Date</TableHead>
              <TableHead className="min-w-[90px]">Validité</TableHead>
              <TableHead className="min-w-[70px]">Délai</TableHead>
              <TableHead className="min-w-[100px]">Statut</TableHead>
              <TableHead className="text-right min-w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.map((quote) => (
              <TableRow key={quote.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{quote.stock_item.name}</div>
                    {quote.stock_item.reference && (
                      <div className="text-sm text-muted-foreground">
                        Ref: {quote.stock_item.reference}
                      </div>
                    )}
                    {quote.stock_item.category && (
                      <Badge variant="outline" className="text-xs">
                        {quote.stock_item.category}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {quote.quote_number || '-'}
                </TableCell>
                <TableCell className="font-medium">
                  {quote.unit_price.toFixed(2)} {quote.currency}
                </TableCell>
                <TableCell>{quote.minimum_quantity}</TableCell>
                <TableCell>
                  {new Date(quote.quote_date).toLocaleDateString('fr-FR')}
                </TableCell>
                <TableCell>
                  {quote.validity_date 
                    ? new Date(quote.validity_date).toLocaleDateString('fr-FR')
                    : '-'
                  }
                </TableCell>
                <TableCell>{quote.delivery_days} j.</TableCell>
                <TableCell>{getStatusBadge(quote.status)}</TableCell>
                <TableCell className="text-right">
                  {quote.status === 'received' && (
                    <div className="flex justify-end space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuoteStatusMutation.mutate({ 
                          quoteId: quote.id, 
                          status: 'selected' 
                        })}
                      >
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuoteStatusMutation.mutate({ 
                          quoteId: quote.id, 
                          status: 'rejected' 
                        })}
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Aucun devis</h3>
            <p className="text-muted-foreground">
              Aucun devis n'a encore été créé pour ce fournisseur.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}