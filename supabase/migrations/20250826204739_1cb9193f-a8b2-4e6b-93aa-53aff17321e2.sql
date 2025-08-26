-- Mettre à jour le type purchase_workflow_status pour inclure les nouveaux statuts
DROP TYPE IF EXISTS purchase_workflow_status CASCADE;
CREATE TYPE purchase_workflow_status AS ENUM (
  'draft',
  'pending_approval', 
  'approved',
  'supplier_search',
  'ordered',
  'received',
  'completed',
  'rejected',
  'cancelled'
);