import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import type { ThreadStatus, ThreadPriority, ThreadCategory } from '@/types/messaging';

interface ThreadFiltersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStatus: ThreadStatus[];
  selectedPriority: ThreadPriority[];
  selectedCategory: ThreadCategory[];
  onStatusChange: (status: ThreadStatus[]) => void;
  onPriorityChange: (priority: ThreadPriority[]) => void;
  onCategoryChange: (category: ThreadCategory[]) => void;
  onClearAll: () => void;
}

const statusOptions: { value: ThreadStatus; label: string }[] = [
  { value: 'new', label: '🆕 Nouveau' },
  { value: 'in_progress', label: '🔄 En cours' },
  { value: 'waiting_response', label: '⏳ En attente' },
  { value: 'waiting_parts', label: '📦 Pièces' },
  { value: 'blocked', label: '🚫 Bloqué' },
  { value: 'resolved', label: '✅ Résolu' },
  { value: 'closed', label: '🔒 Fermé' },
  { value: 'archived', label: '📁 Archivé' },
];

const priorityOptions: { value: ThreadPriority; label: string }[] = [
  { value: 'low', label: '🟢 Basse' },
  { value: 'medium', label: '🟡 Moyenne' },
  { value: 'high', label: '🟠 Haute' },
  { value: 'urgent', label: '🔴 Urgente' },
];

const categoryOptions: { value: ThreadCategory; label: string }[] = [
  { value: 'sav', label: 'SAV' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'supply', label: 'Approvisionnement' },
  { value: 'administrative', label: 'Administratif' },
  { value: 'emergency', label: 'Urgence' },
  { value: 'general', label: 'Général' },
];

export function ThreadFiltersDialog({
  isOpen,
  onClose,
  selectedStatus,
  selectedPriority,
  selectedCategory,
  onStatusChange,
  onPriorityChange,
  onCategoryChange,
  onClearAll,
}: ThreadFiltersDialogProps) {
  const toggleStatus = (status: ThreadStatus) => {
    if (selectedStatus.includes(status)) {
      onStatusChange(selectedStatus.filter((s) => s !== status));
    } else {
      onStatusChange([...selectedStatus, status]);
    }
  };

  const togglePriority = (priority: ThreadPriority) => {
    if (selectedPriority.includes(priority)) {
      onPriorityChange(selectedPriority.filter((p) => p !== priority));
    } else {
      onPriorityChange([...selectedPriority, priority]);
    }
  };

  const toggleCategory = (category: ThreadCategory) => {
    if (selectedCategory.includes(category)) {
      onCategoryChange(selectedCategory.filter((c) => c !== category));
    } else {
      onCategoryChange([...selectedCategory, category]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Filtres avancés</span>
            <Button size="sm" variant="ghost" onClick={onClearAll}>
              <X className="h-4 w-4 mr-2" />
              Tout effacer
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Statut</Label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <Badge
                  key={option.value}
                  variant={selectedStatus.includes(option.value) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleStatus(option.value)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Priorité</Label>
            <div className="flex flex-wrap gap-2">
              {priorityOptions.map((option) => (
                <Badge
                  key={option.value}
                  variant={selectedPriority.includes(option.value) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => togglePriority(option.value)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Catégorie</Label>
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((option) => (
                <Badge
                  key={option.value}
                  variant={selectedCategory.includes(option.value) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleCategory(option.value)}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Appliquer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
