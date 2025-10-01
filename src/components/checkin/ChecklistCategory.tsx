import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, CheckCircle, X, AlertTriangle, Star } from 'lucide-react';
import { ChecklistPhotoCapture } from './ChecklistPhotoCapture';

interface ChecklistItem {
  id: string;
  name: string;
  isRequired: boolean;
  status: 'ok' | 'needs_repair' | 'not_checked';
  notes?: string;
  photoUrl?: string;
}

interface ChecklistCategoryProps {
  category: string;
  items: ChecklistItem[];
  onItemStatusChange: (itemId: string, status: 'ok' | 'needs_repair' | 'not_checked', notes?: string) => void;
  onItemNotesChange: (itemId: string, notes: string) => void;
  onItemPhotoChange: (itemId: string, photoUrl: string | null) => void;
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
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
        return 'text-green-600';
      case 'needs_repair':
        return 'text-red-600';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-4 w-4" />;
      case 'needs_repair':
        return <X className="h-4 w-4" />;
      default:
        return <div className="h-4 w-4 border border-gray-300 rounded" />;
    }
  };

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

  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const categoryStatus = getCategoryStatus();

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {category}
                <Badge variant={categoryStatus.variant}>
                  {categoryStatus.text}
                </Badge>
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1">
                    {item.isRequired && (
                      <Star className="h-3 w-3 text-red-500 fill-red-500" />
                    )}
                    <span className="font-medium text-sm">{item.name}</span>
                    {item.isRequired && (
                      <Badge variant="destructive" className="text-xs bg-red-100 text-red-800 border-red-300">
                        OBLIGATOIRE
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-1 w-32">
                    <Button
                      variant={item.status === 'ok' ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => onItemStatusChange(item.id, 'ok')}
                      className={`h-7 w-7 ${item.status === 'ok' ? 'bg-green-500 hover:bg-green-600' : ''}`}
                      title="OK"
                    >
                      <CheckCircle className="h-3 w-3" />
                    </Button>
                    <Button
                      variant={item.status === 'needs_repair' ? 'destructive' : 'outline'}
                      size="icon"
                      onClick={() => onItemStatusChange(item.id, 'needs_repair')}
                      className="h-7 w-7"
                      title="Problème"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <Button
                      variant={item.status === 'not_checked' ? 'secondary' : 'outline'}
                      size="icon"
                      onClick={() => onItemStatusChange(item.id, 'not_checked')}
                      className={`h-7 w-7 ${item.status === 'not_checked' ? 'bg-amber-100 text-amber-800 border-amber-300' : ''}`}
                      title="Non vérifié"
                    >
                      <AlertTriangle className="h-3 w-3" />
                    </Button>
                    <ChecklistPhotoCapture
                      photoUrl={item.photoUrl || null}
                      onPhotoChange={(photoUrl) => onItemPhotoChange(item.id, photoUrl)}
                      checklistId={checklistId}
                      itemId={item.id}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleItemExpansion(item.id)}
                      className="h-7 w-7 col-span-2"
                      title="Annotations"
                    >
                      📝
                    </Button>
                  </div>
                </div>

                {expandedItems.has(item.id) && (
                  <div className="mt-2">
                    <Textarea
                      value={item.notes || ''}
                      onChange={(e) => onItemNotesChange(item.id, e.target.value)}
                      placeholder="Notes sur cet élément..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                )}

                {item.notes && !expandedItems.has(item.id) && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
                    {item.notes}
                  </div>
                )}

                <div className={`flex items-center gap-1 mt-1 ${getStatusColor(item.status)}`}>
                  {getStatusIcon(item.status)}
                  <span className="text-xs">
                    {item.status === 'ok' ? 'OK' : 
                     item.status === 'needs_repair' ? 'Problème détecté' : 
                     'Non vérifié'}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}