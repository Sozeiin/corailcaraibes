import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(value);

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

  // Filter items based on search
  const filteredItems = stockItems.filter(item =>
    item.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    (item.reference && item.reference.toLowerCase().includes(searchValue.toLowerCase()))
  );

  useEffect(() => {
    setSearchValue(value);
  }, [value]);

  const handleSelect = (item: StockItem) => {
    onValueChange(item.name, item.reference);
    setSearchValue(item.name);
    setOpen(false);
  };

  const handleCreateNew = () => {
    if (searchValue.trim() && onCreateNew) {
      onCreateNew(searchValue.trim());
      setOpen(false);
    }
  };

  const selectedItem = stockItems.find(item => item.name === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Taper pour rechercher..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>
              <div className="p-2 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Aucun produit trouvé
                </p>
                {onCreateNew && searchValue.trim() && (
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
            </CommandEmpty>
            <CommandGroup>
              {filteredItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.name}
                  onSelect={() => handleSelect(item)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.reference && `Réf: ${item.reference}`}
                      {item.category && ` • ${item.category}`}
                      {` • Stock: ${item.quantity} ${item.unit}`}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {onCreateNew && searchValue.trim() && !filteredItems.some(item => 
              item.name.toLowerCase() === searchValue.toLowerCase()
            ) && (
              <CommandGroup>
                <CommandItem onSelect={handleCreateNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer "{searchValue}"
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}