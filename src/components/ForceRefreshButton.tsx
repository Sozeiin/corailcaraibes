import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateAllRelatedQueries } from '@/lib/queryInvalidation';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

/**
 * Bouton de refresh manuel global pour forcer la synchronisation
 */
export function ForceRefreshButton() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    console.log('🔄 Force refresh manuel déclenché...');
    
    try {
      await invalidateAllRelatedQueries(queryClient);
      toast({
        title: "Actualisation réussie",
        description: "Toutes les données ont été actualisées."
      });
    } catch (error) {
      console.error('Erreur refresh:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'actualiser les données."
      });
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="relative"
      title="Actualiser les données"
    >
      <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
    </Button>
  );
}
