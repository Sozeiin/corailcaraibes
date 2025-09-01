import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Supplier } from '@/types';

interface SupplierAutocompleteProps {
  value: string;
  onChange: (supplierName: string) => void;
  placeholder?: string;
}

export function SupplierAutocomplete({ value, onChange, placeholder = 'Rechercher un fournisseur...' }: SupplierAutocompleteProps) {
  const { user } = useAuth();
  const [searchValue, setSearchValue] = useState(value);
  const [showResults, setShowResults] = useState(false);

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers', user?.baseId],
    queryFn: async () => {
      let query = supabase.from('suppliers').select('id, name, category').order('name');
      if (user?.role !== 'direction' && user?.baseId) {
        query = query.eq('base_id', user.baseId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Supplier[];
    },
    enabled: !!user,
  });

  const filteredSuppliers = suppliers
    .filter((s) => searchValue && s.name.toLowerCase().includes(searchValue.toLowerCase()))
    .slice(0, 10);

  useEffect(() => {
    setSearchValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setSearchValue(newVal);
    onChange(newVal);
    setShowResults(newVal.trim().length > 0);
  };

  const handleSelect = (supplier: Supplier) => {
    onChange(supplier.name);
    setSearchValue(supplier.name);
    setShowResults(false);
  };

  const handleInputFocus = () => {
    if (searchValue.trim().length > 0) {
      setShowResults(true);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => setShowResults(false), 200);
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        value={searchValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        className="pl-10"
      />
      {showResults && filteredSuppliers.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {filteredSuppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
              onClick={() => handleSelect(supplier)}
            >
              <div className="font-medium">{supplier.name}</div>
              {supplier.category && (
                <div className="text-xs text-muted-foreground">{supplier.category}</div>
              )}
            </div>
          ))}
        </div>
      )}
      {showResults && filteredSuppliers.length === 0 && searchValue.trim() && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
          <div className="p-3 text-sm text-muted-foreground">Aucun fournisseur trouvé</div>
        </div>
      )}
    </div>
  );
}

