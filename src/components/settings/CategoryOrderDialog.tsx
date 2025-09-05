import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronsUp, 
  ChevronsDown, 
  RotateCcw,
  Save
} from 'lucide-react';

interface CategoryOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: string[];
  currentOrder: string[];
  onSaveOrder: (order: string[]) => void;
}

export function CategoryOrderDialog({ 
  open, 
  onOpenChange, 
  categories, 
  currentOrder, 
  onSaveOrder 
}: CategoryOrderDialogProps) {
  const [workingOrder, setWorkingOrder] = useState<string[]>([]);

  // Initialize working order when dialog opens
  React.useEffect(() => {
    if (open) {
      const orderedCategories = currentOrder.length > 0 
        ? [...currentOrder.filter(cat => categories.includes(cat)), 
           ...categories.filter(cat => !currentOrder.includes(cat)).sort()]
        : [...categories].sort();
      setWorkingOrder(orderedCategories);
    }
  }, [open, categories, currentOrder]);

  const moveUp = (index: number) => {
    if (index > 0) {
      const newOrder = [...workingOrder];
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      setWorkingOrder(newOrder);
    }
  };

  const moveDown = (index: number) => {
    if (index < workingOrder.length - 1) {
      const newOrder = [...workingOrder];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      setWorkingOrder(newOrder);
    }
  };

  const moveToTop = (index: number) => {
    const newOrder = [...workingOrder];
    const [item] = newOrder.splice(index, 1);
    newOrder.unshift(item);
    setWorkingOrder(newOrder);
  };

  const moveToBottom = (index: number) => {
    const newOrder = [...workingOrder];
    const [item] = newOrder.splice(index, 1);
    newOrder.push(item);
    setWorkingOrder(newOrder);
  };

  const resetToAlphabetical = () => {
    setWorkingOrder([...categories].sort());
  };

  const handleSave = () => {
    onSaveOrder(workingOrder);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Organiser les catégories</DialogTitle>
          <DialogDescription>
            Réorganisez l'ordre d'affichage des catégories de checklist. 
            Cet ordre sera appliqué partout dans l'application.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 py-4">
          {workingOrder.map((category, index) => (
            <Card key={category} className="p-3">
              <CardContent className="p-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs font-mono">
                      {index + 1}
                    </Badge>
                    <span className="font-medium">{category}</span>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveToTop(index)}
                      disabled={index === 0}
                      title="Déplacer en premier"
                    >
                      <ChevronsUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      title="Déplacer vers le haut"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveDown(index)}
                      disabled={index === workingOrder.length - 1}
                      title="Déplacer vers le bas"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveToBottom(index)}
                      disabled={index === workingOrder.length - 1}
                      title="Déplacer en dernier"
                    >
                      <ChevronsDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={resetToAlphabetical}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Ordre alphabétique
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            Annuler
          </Button>
          <Button onClick={handleSave} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}