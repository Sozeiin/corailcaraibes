-- Add display_order field to checklist_items for drag and drop ordering
ALTER TABLE checklist_items ADD COLUMN display_order INTEGER DEFAULT 0;

-- Set initial order based on current data (by category then by name)
WITH ordered_items AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY category ORDER BY name) as new_order
  FROM checklist_items
)
UPDATE checklist_items 
SET display_order = ordered_items.new_order
FROM ordered_items 
WHERE checklist_items.id = ordered_items.id;

-- Create index for better performance on ordering
CREATE INDEX idx_checklist_items_category_order ON checklist_items(category, display_order);

-- Update the default order to use display_order
-- This ensures new items get ordered properly