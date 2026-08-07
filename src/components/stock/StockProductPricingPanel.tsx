import React from 'react';
import { Euro } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useStockProductPricing } from '@/hooks/useStockProducts';

interface StockProductPricingPanelProps {
  productId?: string;
}

/**
 * Tarifs et fournisseurs pratiqués sur toutes les bases — visible par tous les rôles.
 */
export function StockProductPricingPanel({ productId }: StockProductPricingPanelProps) {
  const { data: rows = [], isLoading } = useStockProductPricing(productId);

  const formatPrice = (value?: number | null) =>
    value != null ? `${Number(value).toFixed(2)} €` : '-';

  if (!productId) {
    return <p className="text-sm text-muted-foreground">Aucune fiche produit associée.</p>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-marine-600" />
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun tarif enregistré pour cet article.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Euro className="h-4 w-4" />
        Tarifs et fournisseurs de tous les emplacements
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Emplacement</TableHead>
              <TableHead>Fournisseur</TableHead>
              <TableHead>Réf. fournisseur</TableHead>
              <TableHead className="text-right">Prix unitaire</TableHead>
              <TableHead className="text-right">Dernier coût</TableHead>
              <TableHead>Dernier achat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.stock_item_id}>
                <TableCell className="font-medium">{row.base_name || '-'}</TableCell>
                <TableCell>{row.supplier_name || '-'}</TableCell>
                <TableCell className="text-muted-foreground">{row.supplier_reference || '-'}</TableCell>
                <TableCell className="text-right">{formatPrice(row.unit_price)}</TableCell>
                <TableCell className="text-right">{formatPrice(row.last_purchase_cost)}</TableCell>
                <TableCell>
                  {row.last_purchase_date
                    ? new Date(row.last_purchase_date).toLocaleDateString('fr-FR')
                    : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
