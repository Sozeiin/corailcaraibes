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
    <div className="space-y-2 p-1">
      {data.map((item) => (
        <Card 
          key={item[keyField]}
          className={`${onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''} transition-colors border-l-4 border-l-primary/20`}
          onClick={() => onRowClick?.(item)}
        >
          <CardContent className="p-3">
            <div className="space-y-1.5">
              {columns.map((column, index) => {
                const value = item[column.key];
                const displayValue = column.render ? column.render(value, item) : value;
                
                if (index === 0) {
                  // Premier élément : titre principal
                  return (
                    <div key={column.key} className="font-medium text-sm leading-tight">
                      {displayValue}
                    </div>
                  );
                } else if (index === 1) {
                  // Deuxième élément : sous-titre
                  return (
                    <div key={column.key} className="text-xs text-muted-foreground leading-tight">
                      {displayValue}
                    </div>
                  );
                } else {
                  // Autres éléments : informations supplémentaires en grid compact
                  return null; // On va traiter ces éléments différemment
                }
              })}
              
              {/* Informations supplémentaires en grid compact */}
              {columns.length > 2 && (
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1.5 mt-1.5 border-t border-border/30">
                  {columns.slice(2).map((column) => {
                    const value = item[column.key];
                    const displayValue = column.render ? column.render(value, item) : value;
                    
                    return (
                      <div key={column.key} className="flex flex-col text-xs">
                        <span className="text-muted-foreground text-[10px] uppercase tracking-wide font-medium">
                          {column.label}
                        </span>
                        <span className="font-medium leading-tight mt-0.5">
                          {displayValue}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
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