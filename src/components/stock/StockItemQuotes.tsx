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
import { CalendarIcon, Plus, FileText, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { StockItem } from '@/types';
interface StockItemQuotesProps {
  stockItem: StockItem;
}
interface Quote {
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
  supplier: {
    name: string;
    category: string | null;
  };
}
interface QuoteFormData {
  supplierId: string;
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
  supplierId: '',
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
export function StockItemQuotes({
  stockItem
}: StockItemQuotesProps) {
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [formData, setFormData] = useState<QuoteFormData>(initialFormData);

  // Fetch quotes for this stock item
  const {
    data: quotes = [],
    isLoading
  } = useQuery({
    queryKey: ['stock-item-quotes', stockItem.id],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('stock_item_quotes').select('*').eq('stock_item_id', stockItem.id).order('quote_date', {
        ascending: false
      });
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch suppliers for quotes
  const {
    data: suppliers = []
  } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('suppliers').select('*').order('name');
      if (error) throw error;
      return data || [];
    }
  });

  // Enrich quotes with supplier data
  const enrichedQuotes = quotes.map(quote => {
    const supplier = suppliers.find(s => s.id === quote.supplier_id);
    return {
      ...quote,
      supplier: supplier || {
        name: 'Fournisseur inconnu',
        category: null
      }
    };
  });

  // Request quotes mutation
  const requestQuotesMutation = useMutation({
    mutationFn: async (supplierIds: string[]) => {
      const user = await supabase.auth.getUser();
      const quotesToCreate = supplierIds.map(supplierId => ({
        stock_item_id: stockItem.id,
        supplier_id: supplierId,
        status: 'requested',
        requested_by: user.data.user?.id
      }));
      const {
        data,
        error
      } = await supabase.from('stock_item_quotes').insert(quotesToCreate).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['stock-item-quotes']
      });
      setIsRequestDialogOpen(false);
      setSelectedSuppliers([]);
      toast({
        title: 'Demandes envoyées',
        description: `${selectedSuppliers.length} demande(s) de devis envoyée(s)`
      });
    },
    onError: error => {
      console.error('Error requesting quotes:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer les demandes de devis',
        variant: 'destructive'
      });
    }
  });

  // Receive quote mutation
  const receiveQuoteMutation = useMutation({
    mutationFn: async (quoteData: QuoteFormData) => {
      const user = await supabase.auth.getUser();
      const {
        data,
        error
      } = await supabase.from('stock_item_quotes').insert({
        stock_item_id: stockItem.id,
        supplier_id: quoteData.supplierId,
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
      }).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['stock-item-quotes']
      });
      setIsReceiveDialogOpen(false);
      setFormData(initialFormData);
      toast({
        title: 'Devis enregistré',
        description: 'Le devis a été ajouté avec succès'
      });
    },
    onError: error => {
      console.error('Error receiving quote:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'enregistrer le devis',
        variant: 'destructive'
      });
    }
  });

  // Update quote status mutation
  const updateQuoteStatusMutation = useMutation({
    mutationFn: async ({
      quoteId,
      status
    }: {
      quoteId: string;
      status: string;
    }) => {
      const updateData: any = {
        status
      };
      if (status === 'selected') {
        updateData.selected_at = new Date().toISOString();
        updateData.selected_by = (await supabase.auth.getUser()).data.user?.id;
      }
      const {
        data,
        error
      } = await supabase.from('stock_item_quotes').update(updateData).eq('id', quoteId).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['stock-item-quotes']
      });
      toast({
        title: 'Statut mis à jour',
        description: 'Le statut du devis a été mis à jour'
      });
    }
  });
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'requested': {
        label: 'Demandé',
        variant: 'secondary' as const
      },
      'received': {
        label: 'Reçu',
        variant: 'default' as const
      },
      'selected': {
        label: 'Sélectionné',
        variant: 'default' as const
      },
      'rejected': {
        label: 'Rejeté',
        variant: 'destructive' as const
      },
      'expired': {
        label: 'Expiré',
        variant: 'outline' as const
      },
      'cancelled': {
        label: 'Annulé',
        variant: 'outline' as const
      }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.received;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };
  const getBestQuote = () => {
    const receivedQuotes = enrichedQuotes.filter(q => q.status === 'received');
    if (receivedQuotes.length === 0) return null;
    return receivedQuotes.reduce((best, current) => {
      return current.unit_price < best.unit_price ? current : best;
    });
  };
  const bestQuote = getBestQuote();
  if (isLoading) {
    return <div className="p-4 text-center">Chargement des devis...</div>;
  }
  return <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devis</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quotes.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meilleur Prix</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bestQuote ? `${bestQuote.unit_price.toFixed(2)} €` : '-'}
            </div>
            {bestQuote && <p className="text-xs text-muted-foreground">
                {bestQuote.supplier.name}
              </p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Attente</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {quotes.filter(q => q.status === 'requested').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Demander un devis
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Demander des devis</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Sélectionner les fournisseurs</Label>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                  {suppliers.map(supplier => <div key={supplier.id} className="flex items-center space-x-2">
                      <input type="checkbox" id={supplier.id} checked={selectedSuppliers.includes(supplier.id)} onChange={e => {
                    if (e.target.checked) {
                      setSelectedSuppliers([...selectedSuppliers, supplier.id]);
                    } else {
                      setSelectedSuppliers(selectedSuppliers.filter(id => id !== supplier.id));
                    }
                  }} className="rounded" />
                      <label htmlFor={supplier.id} className="text-sm">
                        {supplier.name} {supplier.category && `(${supplier.category})`}
                      </label>
                    </div>)}
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={() => requestQuotesMutation.mutate(selectedSuppliers)} disabled={selectedSuppliers.length === 0 || requestQuotesMutation.isPending}>
                  Envoyer les demandes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isReceiveDialogOpen} onOpenChange={setIsReceiveDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Saisir un devis reçu
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Saisir un devis reçu</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fournisseur *</Label>
                <Select value={formData.supplierId} onValueChange={value => setFormData({
                ...formData,
                supplierId: value
              })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un fournisseur" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(supplier => <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Numéro de devis</Label>
                <Input value={formData.quoteNumber} onChange={e => setFormData({
                ...formData,
                quoteNumber: e.target.value
              })} placeholder="Référence du devis" />
              </div>

              <div className="space-y-2">
                <Label>Prix unitaire (€) *</Label>
                <Input type="number" step="0.01" value={formData.unitPrice} onChange={e => setFormData({
                ...formData,
                unitPrice: parseFloat(e.target.value) || 0
              })} />
              </div>

              <div className="space-y-2">
                <Label>Quantité minimum</Label>
                <Input type="number" value={formData.minimumQuantity} onChange={e => setFormData({
                ...formData,
                minimumQuantity: parseInt(e.target.value) || 1
              })} />
              </div>

              <div className="space-y-2">
                <Label>Date de validité</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.validityDate ? format(formData.validityDate, 'dd/MM/yyyy', {
                      locale: fr
                    }) : "Sélectionner une date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={formData.validityDate || undefined} onSelect={date => setFormData({
                    ...formData,
                    validityDate: date || null
                  })} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Délai de livraison (jours)</Label>
                <Input type="number" value={formData.deliveryDays} onChange={e => setFormData({
                ...formData,
                deliveryDays: parseInt(e.target.value) || 7
              })} />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Conditions de paiement</Label>
                <Input value={formData.paymentTerms} onChange={e => setFormData({
                ...formData,
                paymentTerms: e.target.value
              })} placeholder="ex: 30 jours net" />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={e => setFormData({
                ...formData,
                notes: e.target.value
              })} placeholder="Remarques sur le devis..." />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsReceiveDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={() => receiveQuoteMutation.mutate(formData)} disabled={!formData.supplierId || formData.unitPrice <= 0 || receiveQuoteMutation.isPending}>
                Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quotes Table */}
      {quotes.length > 0 ? <Card>
          <CardHeader>
            <CardTitle>Historique des devis</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Prix unitaire</TableHead>
                  <TableHead>Qté min</TableHead>
                  <TableHead>Délai</TableHead>
                  <TableHead>Validité</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrichedQuotes.map(quote => <TableRow key={quote.id} className={quote.id === bestQuote?.id ? 'bg-green-50' : ''}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{quote.supplier.name}</div>
                        {quote.quote_number && <div className="text-sm text-muted-foreground">#{quote.quote_number}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={quote.id === bestQuote?.id ? 'font-bold text-green-600' : ''}>
                        {quote.unit_price.toFixed(2)} {quote.currency}
                      </span>
                    </TableCell>
                    <TableCell>{quote.minimum_quantity}</TableCell>
                    <TableCell>{quote.delivery_days} jours</TableCell>
                    <TableCell>
                      {quote.validity_date ? format(new Date(quote.validity_date), 'dd/MM/yyyy', {
                  locale: fr
                }) : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(quote.status)}</TableCell>
                    <TableCell>
                      {quote.status === 'received' && <div className="flex space-x-1">
                          <Button size="sm" variant="outline" onClick={() => updateQuoteStatusMutation.mutate({
                    quoteId: quote.id,
                    status: 'selected'
                  })}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => updateQuoteStatusMutation.mutate({
                    quoteId: quote.id,
                    status: 'rejected'
                  })}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>}
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </CardContent>
        </Card> : <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun devis pour cet article</p>
              <p className="text-sm">Commencez par demander des devis aux fournisseurs</p>
            </div>
          </CardContent>
        </Card>}
    </div>;
}