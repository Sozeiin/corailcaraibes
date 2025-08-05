import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { BoatComponentsProvider, useBoatComponents } from './components/BoatComponentsContext';
import { ComponentHeader } from './components/ComponentHeader';
import { ComponentsList } from './components/ComponentsList';

interface BoatComponentsManagerProps {
  boatId: string;
  boatName: string;
}

function BoatComponentsManagerInner() {
  const { queryError, isLoading, setIsDialogOpen, setEditingComponent, resetForm } = useBoatComponents();

  const handleAddNew = () => {
    setEditingComponent(null);
    resetForm();
    setIsDialogOpen(true);
  };

  // Show error state if query failed
  if (queryError) {
    console.error('Query error in BoatComponentsManager:', queryError);
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Erreur lors du chargement des composants</p>
            <Button 
              variant="outline" 
              className="mt-2" 
              onClick={() => window.location.reload()}
            >
              Recharger la page
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <LoadingSpinner text="Chargement des composants..." />;
  }

  return (
    <Card>
      <ComponentHeader />
      <CardContent>
        <ComponentsList onAddNew={handleAddNew} />
      </CardContent>
    </Card>
  );
}

// Error fallback component
const ComponentsErrorFallback = ({ error, resetError }: { error?: Error; resetError: () => void }) => (
  <Card>
    <CardContent className="p-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-red-600 mb-2">Erreur dans les composants</h3>
        <p className="text-gray-600 mb-4">
          {error?.message || 'Une erreur inattendue s\'est produite'}
        </p>
        <div className="space-x-2">
          <Button variant="outline" onClick={resetError}>
            Réessayer
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Recharger la page
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Main exported component with ErrorBoundary and Context Provider
export function BoatComponentsManager(props: BoatComponentsManagerProps) {
  return (
    <ErrorBoundary fallback={ComponentsErrorFallback}>
      <BoatComponentsProvider boatId={props.boatId} boatName={props.boatName}>
        <BoatComponentsManagerInner />
      </BoatComponentsProvider>
    </ErrorBoundary>
  );
}