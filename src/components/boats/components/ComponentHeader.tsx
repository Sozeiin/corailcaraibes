import React from 'react';
import { Plus, Wrench } from 'lucide-react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ComponentForm } from './ComponentForm';
import { useBoatComponents } from './BoatComponentsContext';

export function ComponentHeader() {
  const {
    boatName,
    isDialogOpen,
    setIsDialogOpen,
    setEditingComponent,
    resetForm
  } = useBoatComponents();

  const handleDialogClose = () => {
    console.log('Closing dialog');
    setIsDialogOpen(false);
    setEditingComponent(null);
    resetForm();
  };

  return (
    <CardHeader>
      <CardTitle className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Composants de {boatName}
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingComponent(null);
                resetForm();
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un composant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ajouter un composant</DialogTitle>
            </DialogHeader>
            <ComponentForm onCancel={handleDialogClose} />
          </DialogContent>
        </Dialog>
      </CardTitle>
    </CardHeader>
  );
}