import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OptimizedSkeleton } from '@/components/ui/optimized-skeleton';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Search,
  Filter,
  Package,
  Clock,
  DollarSign
} from 'lucide-react';

interface StockInventoryAnalysisProps {
  baseId?: string;
  category?: string;
  timeRange: string;
}

export function StockInventoryAnalysis({ baseId, category, timeRange }: StockInventoryAnalysisProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'value' | 'turnover'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Fetch detailed inventory data
  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory-analysis', baseId, category, timeRange],
    queryFn: async () => {
      let query = supabase
        .from('stock_items')
        .select(`
          *,
          suppliers:last_supplier_id(name),
          intervention_parts!stock_item_id(quantity, used_at)
        `);

      if (baseId) {
        query = query.eq('base_id', baseId);
      }
      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Calculate analytics for each item
      return data.map(item => {
        const recentUsage = item.intervention_parts.filter((part: any) => {
          const usedDate = new Date(part.used_at);
          const rangeDate = new Date();
          rangeDate.setDate(rangeDate.getDate() - parseInt(timeRange));
          return usedDate >= rangeDate;
        });

        const totalUsed = recentUsage.reduce((sum: number, part: any) => sum + part.quantity, 0);
        const stockValue = (item.quantity || 0) * (item.unit_price || 0);
        const stockStatus = (item.quantity || 0) <= (item.min_threshold || 0) ? 'low' : 'normal';
        const turnoverRate = totalUsed > 0 ? (totalUsed / (item.quantity || 1)) * (365 / parseInt(timeRange)) : 0;

        return {
          ...item,
          totalUsed,
          stockValue,
          stockStatus,
          turnoverRate,
          supplierName: item.suppliers?.name || 'Non défini',
          daysSinceLastPurchase: item.last_purchase_date 
            ? Math.floor((new Date().getTime() - new Date(item.last_purchase_date).getTime()) / (1000 * 60 * 60 * 24))
            : null
        };
      });
    },
  });

  // Filter and sort data
  const filteredAndSortedData = React.useMemo(() => {
    if (!inventoryData) return [];

    let filtered = inventoryData.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.reference || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'quantity':
          aValue = a.quantity || 0;
          bValue = b.quantity || 0;
          break;
        case 'value':
          aValue = a.stockValue;
          bValue = b.stockValue;
          break;
        case 'turnover':
          aValue = a.turnoverRate;
          bValue = b.turnoverRate;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [inventoryData, searchTerm, sortBy, sortOrder]);

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getStockStatusBadge = (status: string, quantity: number, threshold: number) => {
    if (status === 'low') {
      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Stock faible</Badge>;
    }
    if (quantity === 0) {
      return <Badge variant="destructive">Rupture</Badge>;
    }
    return <Badge variant="default">Normal</Badge>;
  };

  const getTurnoverBadge = (rate: number) => {
    if (rate > 2) {
      return <Badge variant="default"><TrendingUp className="h-3 w-3 mr-1" />Élevé</Badge>;
    }
    if (rate > 0.5) {
      return <Badge variant="secondary">Moyen</Badge>;
    }
    return <Badge variant="outline"><TrendingDown className="h-3 w-3 mr-1" />Faible</Badge>;
  };

  if (isLoading) {
    return <OptimizedSkeleton type="table" count={10} />;
  }

  const summary = {
    totalItems: inventoryData?.length || 0,
    lowStockItems: inventoryData?.filter(item => item.stockStatus === 'low').length || 0,
    totalValue: inventoryData?.reduce((sum, item) => sum + item.stockValue, 0) || 0,
    highTurnoverItems: inventoryData?.filter(item => item.turnoverRate > 2).length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Articles</p>
                <p className="text-2xl font-bold">{summary.totalItems}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stock Faible</p>
                <p className="text-2xl font-bold text-destructive">{summary.lowStockItems}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valeur Totale</p>
                <p className="text-2xl font-bold">{summary.totalValue.toLocaleString('fr-FR')} €</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rotation Élevée</p>
                <p className="text-2xl font-bold">{summary.highTurnoverItems}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Analyse Détaillée de l'Inventaire</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('name')}>
                    Article
                    {sortBy === 'name' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                  </Button>
                </TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('quantity')}>
                    Quantité
                    {sortBy === 'quantity' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                  </Button>
                </TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('value')}>
                    Valeur
                    {sortBy === 'value' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('turnover')}>
                    Rotation
                    {sortBy === 'turnover' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                  </Button>
                </TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Dernier Achat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      {item.reference && (
                        <p className="text-sm text-muted-foreground">{item.reference}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.category || 'Non catégorisé'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.quantity || 0}</p>
                      <p className="text-sm text-muted-foreground">
                        Seuil: {item.min_threshold || 0}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStockStatusBadge(item.stockStatus, item.quantity || 0, item.min_threshold || 0)}
                  </TableCell>
                  <TableCell>
                    {item.stockValue.toLocaleString('fr-FR')} €
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getTurnoverBadge(item.turnoverRate)}
                      <span className="text-sm text-muted-foreground">
                        {item.turnoverRate.toFixed(1)}x
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{item.supplierName}</TableCell>
                  <TableCell>
                    {item.daysSinceLastPurchase !== null ? (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {item.daysSinceLastPurchase} jours
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Jamais</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}