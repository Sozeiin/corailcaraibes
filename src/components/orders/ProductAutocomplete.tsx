import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import { StockItem } from '@/types';

interface ProductAutocompleteProps {
  value: string;
  reference: string;
  onValueChange: (productName: string, reference: string) => void;
  onCreateNew?: (productName: string) => void;
  placeholder?: string;
}

export function ProductAutocomplete({ 
  value, 
  reference,
  onValueChange, 
  onCreateNew, 
  placeholder = "Rechercher un produit..." 
}: ProductAutocompleteProps) {
  const { user } = useAuth();
  const [searchValue, setSearchValue] = useState(value);
  const [showResults, setShowResults] = useState(false);

  const { data: stockItems = [] } = useQuery({
    queryKey: ['stock-items-autocomplete', user?.baseId],
    queryFn: async () => {
      let query = supabase
        .from('stock_items')
        .select('*')
        .order('name');
      
      // Filter by base if user is not direction
      if (user?.role !== 'direction' && user?.baseId) {
        query = query.eq('base_id', user.baseId);
      }

      const { data, error } = await query;
      if (error) throw error;

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
        lastUpdated: item.last_updated || new Date().toISOString()
      })) as StockItem[];
    },
    enabled: !!user
  });

  // Filter items based on search - recherche par mots-clés
  const filteredItems = stockItems.filter(item => {
    if (!searchValue || !searchValue.trim()) return false;
    
    const searchLower = searchValue.toLowerCase();
    const words = searchLower.split(' ').filter(word => word.length > 0);
    
    return words.every(word => 
      item.name.toLowerCase().includes(word) ||
      (item.reference && item.reference.toLowerCase().includes(word)) ||
      (item.category && item.category.toLowerCase().includes(word))
    );
  }).sort((a, b) => {
    // Priorité aux références scannées (non auto-générées) et les plus récentes
    const aIsScanned = a.reference && !a.reference.startsWith('STK-');
    const bIsScanned = b.reference && !b.reference.startsWith('STK-');
    
    if (aIsScanned && !bIsScanned) return -1;
    if (!aIsScanned && bIsScanned) return 1;
    
    // Si même type de référence, trier par date de dernière mise à jour
    return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
  });

  useEffect(() => {
    setSearchValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchValue(newValue);
    setShowResults(newValue.trim().length > 0);
    
    // Si la valeur correspond exactement à un produit, sélectionner le plus pertinent
    const exactMatches = stockItems.filter(item => 
      item.name.toLowerCase() === newValue.toLowerCase()
    );
    
    if (exactMatches.length > 0) {
      // Privilégier les références scannées et les plus récentes
      const bestMatch = exactMatches.sort((a, b) => {
        const aIsScanned = a.reference && !a.reference.startsWith('STK-');
        const bIsScanned = b.reference && !b.reference.startsWith('STK-');
        
        if (aIsScanned && !bIsScanned) return -1;
        if (!aIsScanned && bIsScanned) return 1;
        
        return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      })[0];
      
      onValueChange(bestMatch.name, bestMatch.reference);
    } else if (newValue !== value) {
      onValueChange(newValue, '');
    }
  };

  const handleSelect = (item: StockItem) => {
    onValueChange(item.name, item.reference);
    setSearchValue(item.name);
    setShowResults(false);
  };

  const handleCreateNew = () => {
    if (searchValue.trim() && onCreateNew) {
      onCreateNew(searchValue.trim());
      setShowResults(false);
    }
  };

  const handleInputFocus = () => {
    if (searchValue.trim().length > 0) {
      setShowResults(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding results to allow clicking on items
    setTimeout(() => setShowResults(false), 200);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="pl-10"
        />
      </div>

      {showResults && filteredItems.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredItems.slice(0, 10).map((item) => (
            <div
              key={item.id}
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              onClick={() => handleSelect(item)}
            >
              <div className="font-medium text-gray-900">{item.name}</div>
              <div className="text-sm text-gray-500 mt-1">
                {item.reference && `Réf: ${item.reference}`}
                {item.category && ` • ${item.category}`}
                {` • Stock: ${item.quantity} ${item.unit}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {showResults && filteredItems.length === 0 && searchValue.trim() && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500 mb-3">
              Aucun produit trouvé pour "{searchValue}"
            </p>
            {onCreateNew && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateNew}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer "{searchValue}"
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}