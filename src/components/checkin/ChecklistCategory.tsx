import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { ModernChecklistItem } from './ModernChecklistItem';

interface ChecklistItem {
  id: string;
  name: string;
  isRequired: boolean;
  status: 'ok' | 'needs_repair' | 'not_checked';
  notes?: string;
  photos?: Array<{ id?: string; url: string; displayOrder: number }>;
}

interface ChecklistCategoryProps {
  category: string;
  items: ChecklistItem[];
  onItemStatusChange: (itemId: string, status: 'ok' | 'needs_repair' | 'not_checked', notes?: string) => void;
  onItemNotesChange: (itemId: string, notes: string) => void;
  onItemPhotoChange: (itemId: string, photos: Array<{ id?: string; url: string; displayOrder: number }>) => void;
  checklistId?: string;
}

export function ChecklistCategory({ 
  category, 
  items, 
  onItemStatusChange, 
  onItemNotesChange,
  onItemPhotoChange,
  checklistId
}: ChecklistCategoryProps) {
  const [isOpen, setIsOpen] = useState(true);

  const getCategoryStatus = () => {
    const okItems = items.filter(item => item.status === 'ok').length;
    const needsRepairItems = items.filter(item => item.status === 'needs_repair').length;
    const notCheckedItems = items.filter(item => item.status === 'not_checked').length;

    if (notCheckedItems === items.length) {
      return { variant: 'outline' as const, text: 'Non vérifié' };
    } else if (needsRepairItems > 0) {
      return { variant: 'destructive' as const, text: `${needsRepairItems} problème(s)` };
    } else if (okItems === items.length) {
      return { variant: 'default' as const, text: 'Tout OK' };
    } else {
      return { variant: 'secondary' as const, text: `${okItems}/${items.length} OK` };
    }
  };

  const categoryStatus = getCategoryStatus();

  return (
    <Card className="bg-gray-50/50 border-none shadow-none">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-100/50 transition-colors rounded-t-lg">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-3">
                <span className="font-semibold text-gray-900">{category}</span>
                <Badge 
                  variant={categoryStatus.variant}
                  className="font-medium"
                >
                  {categoryStatus.text}
                </Badge>
              </span>
              <ChevronDown className={`h-5 w-5 transition-transform duration-200 text-gray-600 ${isOpen ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-3 pt-2">
            {items.map((item) => (
              <ModernChecklistItem
                key={item.id}
                item={item}
                onStatusChange={onItemStatusChange}
                onNotesChange={onItemNotesChange}
                onPhotoChange={onItemPhotoChange}
                checklistId={checklistId}
              />
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}