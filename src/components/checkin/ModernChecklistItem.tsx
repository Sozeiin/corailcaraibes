import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, X, AlertTriangle, ChevronDown } from 'lucide-react';
import { ChecklistMultiPhotoCapture } from './ChecklistMultiPhotoCapture';
import { cn } from '@/lib/utils';

interface ChecklistItem {
  id: string;
  name: string;
  isRequired: boolean;
  status: 'ok' | 'needs_repair' | 'not_checked';
  notes?: string;
  photos?: Array<{ id?: string; url: string; displayOrder: number }>;
}

interface ModernChecklistItemProps {
  item: ChecklistItem;
  onStatusChange: (itemId: string, status: 'ok' | 'needs_repair' | 'not_checked', notes?: string) => void;
  onNotesChange: (itemId: string, notes: string) => void;
  onPhotoChange: (itemId: string, photos: Array<{ id?: string; url: string; displayOrder: number }>) => void;
  checklistId?: string;
}

export function ModernChecklistItem({
  item,
  onStatusChange,
  onNotesChange,
  onPhotoChange,
  checklistId
}: ModernChecklistItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get the color for the left border based on status
  const getBarColor = () => {
    if (item.status === 'ok') return 'bg-[#10B981]'; // Green
    if (item.status === 'needs_repair') return 'bg-[#F59E0B]'; // Yellow/Amber
    if (item.isRequired && item.status === 'not_checked') return 'bg-[#EF4444]'; // Red for required unchecked
    return 'bg-[#6B7280]'; // Gray for regular unchecked
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden">
      {/* Colored vertical bar */}
      <div className="flex">
        <div className={cn("w-1 flex-shrink-0 transition-colors duration-200", getBarColor())} />
        
        <div className="flex-1 p-4">
          {/* Header with title and badge */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900 leading-relaxed">
                {item.name}
              </h4>
              {item.isRequired && (
                <Badge 
                  className="mt-1.5 rounded-full bg-[#EF4444] hover:bg-[#EF4444] text-white border-0 text-[11px] font-semibold px-2.5 py-0.5"
                >
                  OBLIGATOIRE
                </Badge>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Button
                size="icon"
                onClick={() => onStatusChange(item.id, 'ok')}
                className={cn(
                  "h-[30px] w-[30px] rounded-md transition-all duration-200",
                  item.status === 'ok'
                    ? "bg-[#10B981] hover:bg-[#059669] text-white shadow-sm"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                )}
                title="OK"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>

              <Button
                size="icon"
                onClick={() => onStatusChange(item.id, 'needs_repair')}
                className={cn(
                  "h-[30px] w-[30px] rounded-md transition-all duration-200",
                  item.status === 'needs_repair'
                    ? "bg-[#EF4444] hover:bg-[#DC2626] text-white shadow-sm"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                )}
                title="Problème"
              >
                <X className="h-4 w-4" />
              </Button>

              <Button
                size="icon"
                onClick={() => onStatusChange(item.id, 'not_checked')}
                className={cn(
                  "h-[30px] w-[30px] rounded-md transition-all duration-200",
                  item.status === 'not_checked'
                    ? "bg-[#F59E0B] hover:bg-[#D97706] text-white shadow-sm"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                )}
                title="Alerte"
              >
                <AlertTriangle className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Photo and notes row */}
          <div className="flex items-center gap-2 mb-2">
            <ChecklistMultiPhotoCapture
              photos={item.photos || []}
              onPhotosChange={(photos) => onPhotoChange(item.id, photos)}
              checklistId={checklistId || 'temp-' + Date.now()}
              itemId={item.id}
              maxPhotos={5}
            />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <ChevronDown className={cn(
                "h-3.5 w-3.5 mr-1 transition-transform duration-200",
                isExpanded && "rotate-180"
              )} />
              Notes
            </Button>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-1.5">
            <div className={cn(
              "h-2 w-2 rounded-full transition-colors duration-200",
              item.status === 'ok' && "bg-[#10B981]",
              item.status === 'needs_repair' && "bg-[#F59E0B]",
              item.status === 'not_checked' && "bg-gray-400"
            )} />
            <span className="text-xs text-gray-500">
              {item.status === 'ok' && 'Validé'}
              {item.status === 'needs_repair' && 'Problème détecté'}
              {item.status === 'not_checked' && 'Non vérifié'}
            </span>
          </div>

          {/* Expanded notes section */}
          {isExpanded && (
            <div className="mt-3 animate-fade-in">
              <Textarea
                value={item.notes || ''}
                onChange={(e) => onNotesChange(item.id, e.target.value)}
                placeholder="Ajouter des notes ou observations..."
                rows={3}
                className="text-sm resize-none border-gray-200 focus:border-primary"
              />
            </div>
          )}

          {/* Collapsed notes preview */}
          {item.notes && !isExpanded && (
            <div className="mt-2 p-2 bg-gray-50 rounded-md">
              <p className="text-xs text-gray-600 line-clamp-2">{item.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
