import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StockTable } from '@/components/stock/StockTable';
import { StockDialog } from '@/components/stock/StockDialog';
import { StockFilters } from '@/components/stock/StockFilters';
import { StockImportDialog } from '@/components/stock/StockImportDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StockItem } from '@/types';

export default function Stock() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showLowStock, setShowLowStock] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);

  const { data: stockItems = [], isLoading } = useQuery({
    queryKey: ['stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_items')
        .select(`
          *,
          bases(name, location)
        `)
        .order('name');

      if (error) throw error;

      // Transform database fields to match StockItem interface
      return data.map(item => ({
        id: item.id,
        name: item.name,
        reference: item.reference || '',
        category: item.category || '',
        quantity: item.quantity || 0,
        minThreshold: item.min_threshold || 0,
        unit: item.unit || '',
        location: item.location || '',
        baseId: item.base_id || '',
        baseName: item.bases?.name || '',
        lastUpdated: item.last_updated || new Date().toISOString()
      })) as StockItem[];
    }
  });

  // Get unique categories for filter
  const categories = Array.from(new Set(stockItems.filter(item => item.category).map(item => item.category)));

  // Calculate low stock items
  const lowStockItems = stockItems.filter(item => item.quantity <= item.minThreshold);

  // Filter stock items based on search, category, and low stock
  const filteredItems = stockItems.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesLowStock = !showLowStock || item.quantity <= item.minThreshold;
    
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const handleEdit = (item: StockItem) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    queryClient.invalidateQueries({ queryKey: ['stock'] });
  };

  const canManageStock = user?.role === 'direction' || user?.role === 'chef_base';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion du Stock</h1>
          <p className="text-gray-600 mt-2">
            Suivi des articles et approvisionnements
          </p>
        </div>
        {canManageStock && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(true)}
              className="border-marine-200 text-marine-700 hover:bg-marine-50"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Importer Excel
            </Button>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-marine-600 hover:bg-marine-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un article
            </Button>
          </div>
        )}
      </div>

      {lowStockItems.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>{lowStockItems.length}</strong> article{lowStockItems.length > 1 ? 's' : ''} en rupture ou stock faible.
            <Button
              variant="link"
              className="h-auto p-0 ml-2 text-orange-600 underline"
              onClick={() => setShowLowStock(true)}
            >
              Voir les articles
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher un article..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <StockFilters
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            showLowStock={showLowStock}
            onLowStockChange={setShowLowStock}
          />
        </div>

        <StockTable
          items={filteredItems}
          isLoading={isLoading}
          onEdit={handleEdit}
          canManage={canManageStock}
        />
      </div>

      <StockDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        item={editingItem}
      />

      <StockImportDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
      />
    </div>
  );
}