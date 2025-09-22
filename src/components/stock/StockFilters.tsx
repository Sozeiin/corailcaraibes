import React from 'react';
import { X, Filter, AlertTriangle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface StockFiltersProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  bases: Array<{ id: string; name: string }>;
  selectedBase: string;
  onBaseChange: (baseId: string) => void;
  showLowStock: boolean;
  onLowStockChange: (show: boolean) => void;
  userRole?: string;
  userBaseId?: string;
}

export function StockFilters({ 
  categories, 
  selectedCategory, 
  onCategoryChange,
  bases,
  selectedBase,
  onBaseChange,
  showLowStock,
  onLowStockChange,
  userRole,
  userBaseId
}: StockFiltersProps) {
  const clearFilters = () => {
    onCategoryChange('all');
    // For chefs de base, reset to their own base instead of 'all'
    if (userRole === 'chef_base' && userBaseId) {
      onBaseChange(userBaseId);
    } else {
      onBaseChange('all');
    }
    onLowStockChange(false);
  };

  const hasActiveFilters = selectedCategory !== 'all' || selectedBase !== 'all' || showLowStock;
  const showBaseFilter = userRole === 'direction' || userRole === 'chef_base';

  return (
    <div className="border-t pt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filtres :</span>
        </div>
        
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Toutes les catégories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {categories.filter(category => category && category.trim() !== '').map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showBaseFilter && (
          <Select value={selectedBase} onValueChange={onBaseChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Toutes les bases" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les bases</SelectItem>
              {bases.map((base) => (
                <SelectItem key={base.id} value={base.id}>
                  {base.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="lowStock" 
            checked={showLowStock}
            onCheckedChange={onLowStockChange}
          />
          <label 
            htmlFor="lowStock" 
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1"
          >
            <AlertTriangle className="h-3 w-3 text-orange-500" />
            Stock faible uniquement
          </label>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4 mr-1" />
            Effacer les filtres
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500">Filtres actifs :</span>
          {selectedCategory && selectedCategory !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {selectedCategory}
              <button
                onClick={() => onCategoryChange('all')}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {showBaseFilter && selectedBase && selectedBase !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {bases.find(b => b.id === selectedBase)?.name}
              <button
                onClick={() => onBaseChange('all')}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {showLowStock && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Stock faible
              <button
                onClick={() => onLowStockChange(false)}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}