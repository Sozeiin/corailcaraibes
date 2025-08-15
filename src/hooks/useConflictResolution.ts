import { useState, useEffect, useCallback } from 'react';
import { sqliteService } from '@/lib/database/sqlite';
import { useToast } from '@/hooks/use-toast';

interface Conflict {
  id: number;
  table_name: string;
  record_id: string;
  local_data: any;
  remote_data: any;
  conflict_type: string;
  created_at: number;
}

export function useConflictResolution() {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadConflicts = useCallback(async () => {
    setIsLoading(true);
    try {
      const conflictData = await sqliteService.getConflicts();
      setConflicts(conflictData.map(conflict => ({
        ...conflict,
        local_data: JSON.parse(conflict.local_data),
        remote_data: JSON.parse(conflict.remote_data)
      })));
    } catch (error) {
      console.error('Error loading conflicts:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les conflits de synchronisation",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const resolveConflict = useCallback(async (
    conflictId: number, 
    strategy: string, 
    resolvedData?: any
  ): Promise<void> => {
    try {
      await sqliteService.resolveConflict(conflictId, strategy, resolvedData);
      
      // Remove resolved conflict from state
      setConflicts(prev => prev.filter(c => c.id !== conflictId));
      
      toast({
        title: "Conflit résolu",
        description: `Le conflit a été résolu avec la stratégie: ${strategy}`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error resolving conflict:', error);
      toast({
        title: "Erreur",
        description: "Impossible de résoudre le conflit",
        variant: "destructive"
      });
      throw error;
    }
  }, [toast]);

  const createConflict = useCallback(async (
    table: string,
    recordId: string,
    localData: any,
    remoteData: any,
    conflictType: string
  ): Promise<void> => {
    try {
      await sqliteService.createConflict(table, recordId, localData, remoteData, conflictType);
      await loadConflicts(); // Refresh conflicts list
    } catch (error) {
      console.error('Error creating conflict:', error);
      throw error;
    }
  }, [loadConflicts]);

  useEffect(() => {
    loadConflicts();
  }, [loadConflicts]);

  return {
    conflicts,
    isLoading,
    resolveConflict,
    createConflict,
    refreshConflicts: loadConflicts,
    hasConflicts: conflicts.length > 0
  };
}