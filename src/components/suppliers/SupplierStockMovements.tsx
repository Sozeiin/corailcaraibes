import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useSupplierStockMovements } from '@/hooks/useStockMovements';
import { Package, TrendingDown, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SupplierStockMovementsProps {
  supplierId: string;
  supplierName: string;
}

export function SupplierStockMovements({ supplierId, supplierName }: SupplierStockMovementsProps) {
  const { data: movements = [], isLoading } = useSupplierStockMovements(supplierId);

  // Calculs statistiques
  const totalMovements = movements.length;
  const totalQuantity = movements.reduce((sum, mov) => sum + Math.abs(mov.qty), 0);
  const uniqueItems = new Set(movements.map(mov => mov.sku)).size;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total sorties</p>
                <p className="text-lg font-semibold">{totalMovements}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Articles différents</p>
                <p className="text-lg font-semibold">{uniqueItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Quantité totale</p>
                <p className="text-lg font-semibold">{totalQuantity}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historique des mouvements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Historique des sorties de stock
          </CardTitle>
          <CardDescription>
            Sorties de stock effectuées vers {supplierName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Aucune sortie de stock enregistrée pour ce fournisseur
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Article</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {format(new Date(movement.ts), 'dd MMM yyyy HH:mm', { locale: fr })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{movement.stock_items?.name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {movement.stock_items?.reference || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-red-600">{movement.qty}</span>
                        <span className="text-sm text-muted-foreground">
                          {movement.stock_items?.unit}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{movement.profiles?.name || 'Utilisateur inconnu'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        {movement.notes ? (
                          <p className="text-sm text-muted-foreground truncate" title={movement.notes}>
                            {movement.notes}
                          </p>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}