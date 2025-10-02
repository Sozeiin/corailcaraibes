import { useState, useMemo } from 'react';
import type { SmartThread, ThreadFilters } from '@/types/messaging';

export function useThreadFilters(threads: SmartThread[]) {
  const [filters, setFilters] = useState<ThreadFilters>({
    status: [],
    priority: [],
    category: [],
    search: '',
  });

  const filteredThreads = useMemo(() => {
    return threads.filter((thread) => {
      // Search filter
      if (filters.search && !thread.title.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // Status filter
      if (filters.status && filters.status.length > 0) {
        if (!thread.workflow_state || !filters.status.includes(thread.workflow_state.status)) {
          return false;
        }
      }

      // Priority filter
      if (filters.priority && filters.priority.length > 0) {
        if (!thread.workflow_state || !filters.priority.includes(thread.workflow_state.priority)) {
          return false;
        }
      }

      // Category filter
      if (filters.category && filters.category.length > 0) {
        if (!thread.workflow_state?.category || !filters.category.includes(thread.workflow_state.category)) {
          return false;
        }
      }

      // Assigned to filter
      if (filters.assigned_to) {
        const hasAssignment = thread.assignments?.some(
          (a) => a.user_id === filters.assigned_to && a.is_active
        );
        if (!hasAssignment) return false;
      }

      // Created by filter
      if (filters.created_by && thread.created_by !== filters.created_by) {
        return false;
      }

      // Channel filter
      if (filters.channel_id && thread.channel_id !== filters.channel_id) {
        return false;
      }

      return true;
    });
  }, [threads, filters]);

  const updateFilter = <K extends keyof ThreadFilters>(key: K, value: ThreadFilters[K]) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: [],
      priority: [],
      category: [],
      search: '',
    });
  };

  const hasActiveFilters = useMemo(() => {
    return (
      (filters.status?.length || 0) > 0 ||
      (filters.priority?.length || 0) > 0 ||
      (filters.category?.length || 0) > 0 ||
      !!filters.search ||
      !!filters.assigned_to ||
      !!filters.created_by ||
      !!filters.channel_id
    );
  }, [filters]);

  return {
    filters,
    filteredThreads,
    updateFilter,
    clearFilters,
    hasActiveFilters,
  };
}
