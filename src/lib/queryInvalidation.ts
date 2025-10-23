import { QueryClient } from '@tanstack/react-query';

/**
 * Utility functions for systematic query invalidation
 */

export const invalidateBoatQueries = (queryClient: QueryClient, boatId?: string) => {
  queryClient.invalidateQueries({ queryKey: ['boats'] });
  if (boatId) {
    queryClient.invalidateQueries({ queryKey: ['boat-dashboard', boatId] });
    queryClient.invalidateQueries({ queryKey: ['boat-components', boatId] });
    queryClient.invalidateQueries({ queryKey: ['boat-checklists', boatId] });
    queryClient.invalidateQueries({ queryKey: ['boat-interventions', boatId] });
    queryClient.invalidateQueries({ queryKey: ['boat-rentals', boatId] });
    queryClient.invalidateQueries({ queryKey: ['boat-safety-controls', boatId] });
    queryClient.invalidateQueries({ queryKey: ['boat-preparation-history', boatId] });
  }
};

export const invalidateStockQueries = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['stock-items'] });
  queryClient.invalidateQueries({ queryKey: ['stock_items'] });
  queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
  queryClient.invalidateQueries({ queryKey: ['component-stock-links'] });
  queryClient.invalidateQueries({ queryKey: ['component-purchase-history'] });
};

export const invalidateOrderQueries = (queryClient: QueryClient, orderId?: string) => {
  queryClient.invalidateQueries({ queryKey: ['orders'] });
  queryClient.invalidateQueries({ queryKey: ['order-items'] });
  queryClient.invalidateQueries({ queryKey: ['purchase-workflow-steps'] });
  queryClient.invalidateQueries({ queryKey: ['order-tracking'] });
  if (orderId) {
    queryClient.invalidateQueries({ queryKey: ['order-details', orderId] });
  }
};

export const invalidateSupplierQueries = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['suppliers'] });
  queryClient.invalidateQueries({ queryKey: ['stock-item-quotes'] });
  queryClient.invalidateQueries({ queryKey: ['component-supplier-references'] });
  queryClient.invalidateQueries({ queryKey: ['purchase-history'] });
};

export const invalidateInterventionQueries = (queryClient: QueryClient, interventionId?: string) => {
  queryClient.invalidateQueries({ queryKey: ['interventions'] });
  queryClient.invalidateQueries({ queryKey: ['maintenance-history'] });
  queryClient.invalidateQueries({ queryKey: ['scheduled-interventions'] });
  queryClient.invalidateQueries({ queryKey: ['boat-upcoming-interventions'] });
  if (interventionId) {
    queryClient.invalidateQueries({ queryKey: ['intervention-details', interventionId] });
  }
};

export const invalidateChecklistQueries = (queryClient: QueryClient, checklistId?: string) => {
  queryClient.invalidateQueries({ queryKey: ['checklist-items'] });
  queryClient.invalidateQueries({ queryKey: ['boat-checklists'] });
  queryClient.invalidateQueries({ queryKey: ['boat-checklist-history'] });
  if (checklistId) {
    queryClient.invalidateQueries({ queryKey: ['checklist-details', checklistId] });
  }
};

export const invalidatePlanningQueries = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['planning-activities'] });
  queryClient.invalidateQueries({ queryKey: ['scheduled-maintenance'] });
  queryClient.invalidateQueries({ queryKey: ['preparation-orders'] });
  queryClient.invalidateQueries({ queryKey: ['boat-preparation-history'] });
};

export const invalidateAdministrativeQueries = (queryClient: QueryClient, baseId?: string) => {
  queryClient.invalidateQueries({ queryKey: ['administrative-checkin-forms'] });
  queryClient.invalidateQueries({ queryKey: ['ready-checkin-forms'] });
  queryClient.invalidateQueries({ queryKey: ['client-forms-pool'] });
  queryClient.invalidateQueries({ queryKey: ['boats-checkin-checkout'] });
  if (baseId) {
    queryClient.invalidateQueries({ queryKey: ['administrative-checkin-forms', baseId] });
    queryClient.invalidateQueries({ queryKey: ['client-forms-pool', baseId] });
  }
};

/**
 * Invalidate all related queries for a comprehensive update
 */
export const invalidateAllRelatedQueries = (queryClient: QueryClient) => {
  invalidateBoatQueries(queryClient);
  invalidateStockQueries(queryClient);
  invalidateOrderQueries(queryClient);
  invalidateSupplierQueries(queryClient);
  invalidateInterventionQueries(queryClient);
  invalidateChecklistQueries(queryClient);
  invalidatePlanningQueries(queryClient);
  invalidateAdministrativeQueries(queryClient);
};