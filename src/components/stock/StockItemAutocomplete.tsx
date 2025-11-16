import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Search, Package } from 'lucide-react';

interface StockItem {
  id: string;
  name: string;
  reference?: string;
  brand?: string;
  supplierReference?: string;
  quantity: number;
  category?: string;
  location?: string;
}

interface StockItemAutocompleteProps {
  stockItems: StockItem[];
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: StockItem) => void;
  placeholder?: string;
  className?: string;
}

export function StockItemAutocomplete({
  stockItems,
  value,
  onChange,
  onSelect,
  placeholder = "Rechercher un article...",
  className
}: StockItemAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredItems, setFilteredItems] = useState<StockItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter items based on search value
  useEffect(() => {
    if (!value.trim()) {
      setFilteredItems([]);
      return;
    }

    const searchTerm = value.toLowerCase().trim();
    const filtered = stockItems
      .filter(item => {
        const nameMatch = item.name.toLowerCase().includes(searchTerm);
        const referenceMatch = item.reference?.toLowerCase().includes(searchTerm);
        const categoryMatch = item.category?.toLowerCase().includes(searchTerm);
        
        return nameMatch || referenceMatch || categoryMatch;
      })
      .slice(0, 10); // Limit to 10 results

    setFilteredItems(filtered);
    setIsOpen(filtered.length > 0 && value.length >= 2);
  }, [value, stockItems]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: StockItem) => {
    onChange(item.reference || item.name);
    onSelect(item);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleInputFocus = () => {
    if (filteredItems.length > 0 && value.length >= 2) {
      setIsOpen(true);
    }
  };

  const getDisplayInfo = (item: StockItem) => {
    const parts = [];
    if (item.reference) parts.push(`Réf: ${item.reference}`);
    if (item.supplierReference) parts.push(`Réf fournisseur: ${item.supplierReference}`);
    if (item.brand) parts.push(`Marque: ${item.brand}`);
    if (item.category) parts.push(item.category);
    return parts.join(' • ');
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className={`pl-10 ${className}`}
        />
      </div>

      {isOpen && filteredItems.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-[100] mt-1 max-h-[32rem] sm:max-h-[36rem] overflow-y-auto shadow-lg bg-background">
          <div className="p-2">
            {filteredItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className="w-full justify-start p-4 sm:p-5 h-auto text-left hover:bg-accent transition-colors"
                onClick={() => handleSelect(item)}
              >
                <div className="flex items-start gap-4 w-full">
                  <Package className="h-6 w-6 sm:h-5 sm:w-5 mt-1 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-base sm:text-lg line-clamp-2 sm:line-clamp-1">
                      {item.name}
                    </div>
                    <div className="text-sm sm:text-base text-muted-foreground mt-2 line-clamp-2">
                      {getDisplayInfo(item)}
                    </div>
                    <div className="text-sm sm:text-base text-muted-foreground mt-2 flex flex-wrap gap-2">
                      <span className={item.quantity > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                        Stock: {item.quantity}
                      </span>
                      {item.location && (
                        <span className="flex items-center">
                          <span className="hidden sm:inline">•</span>
                          <span className="sm:ml-2">{item.location}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}