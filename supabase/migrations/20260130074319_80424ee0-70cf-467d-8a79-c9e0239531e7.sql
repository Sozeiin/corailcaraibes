-- Add columns to store checklist type, customer name, and rental reference
ALTER TABLE boat_checklists 
ADD COLUMN IF NOT EXISTS checklist_type TEXT CHECK (checklist_type IN ('checkin', 'checkout', 'maintenance')),
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS rental_id UUID REFERENCES boat_rentals(id);

-- Add index for faster queries by rental
CREATE INDEX IF NOT EXISTS idx_boat_checklists_rental_id ON boat_checklists(rental_id);

-- Add comment for documentation
COMMENT ON COLUMN boat_checklists.checklist_type IS 'Type of checklist: checkin, checkout, or maintenance';
COMMENT ON COLUMN boat_checklists.customer_name IS 'Customer name at the time of checklist creation';
COMMENT ON COLUMN boat_checklists.rental_id IS 'Reference to the associated rental';