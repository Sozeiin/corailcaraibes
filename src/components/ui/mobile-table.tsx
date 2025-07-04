import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MobileTableProps {
  data: any[];
  columns: {
    key: string;
    label: string;
    render?: (value: any, item: any) => React.ReactNode;
  }[];
  onRowClick?: (item: any) => void;
  keyField?: string;
}

export function MobileTable({ data, columns, onRowClick, keyField = 'id' }: MobileTableProps) {
  return (
    <div className="space-y-3">
      {data.map((item) => (
        <Card 
          key={item[keyField]}
          className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}`}
          onClick={() => onRowClick?.(item)}
        >
          <CardContent className="p-4">
            <div className="space-y-2">
              {columns.map((column, index) => {
                const value = item[column.key];
                const displayValue = column.render ? column.render(value, item) : value;
                
                if (index === 0) {
                  // Premier élément : titre principal
                  return (
                    <div key={column.key} className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{displayValue}</h4>
                      </div>
                    </div>
                  );
                } else if (index === 1) {
                  // Deuxième élément : sous-titre
                  return (
                    <p key={column.key} className="text-xs text-gray-600 truncate">
                      {displayValue}
                    </p>
                  );
                } else {
                  // Autres éléments : informations supplémentaires
                  return (
                    <div key={column.key} className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">{column.label}:</span>
                      <span className="font-medium">{displayValue}</span>
                    </div>
                  );
                }
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Composant pour rendre les badges responsive
interface ResponsiveBadgeProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveBadge({ variant = 'default', children, className = '' }: ResponsiveBadgeProps) {
  return (
    <Badge variant={variant} className={`text-xs px-2 py-1 ${className}`}>
      {children}
    </Badge>
  );
}