-- Créer une vue pour récupérer les détails des entités liées aux threads
CREATE OR REPLACE VIEW thread_entities_detailed AS
SELECT 
  ste.id,
  ste.topic_id,
  ste.entity_type,
  ste.entity_id,
  ste.linked_at,
  ste.linked_by,
  ste.notes,
  CASE 
    WHEN ste.entity_type = 'supply_request' THEN sr.item_name
    WHEN ste.entity_type = 'boat' THEN b.name
    WHEN ste.entity_type = 'order' THEN o.order_number
    WHEN ste.entity_type = 'intervention' THEN i.title
    WHEN ste.entity_type = 'stock_item' THEN si.name
    WHEN ste.entity_type = 'checklist' THEN CONCAT('Checklist ', bc.checklist_date::text)
    ELSE 'Unknown'
  END as entity_name,
  CASE
    WHEN ste.entity_type = 'supply_request' THEN sr.status::text
    WHEN ste.entity_type = 'order' THEN o.status::text
    WHEN ste.entity_type = 'intervention' THEN i.status::text
    ELSE NULL
  END as entity_status
FROM smart_thread_entities ste
LEFT JOIN supply_requests sr ON ste.entity_type = 'supply_request' AND ste.entity_id = sr.id
LEFT JOIN boats b ON ste.entity_type = 'boat' AND ste.entity_id = b.id
LEFT JOIN orders o ON ste.entity_type = 'order' AND ste.entity_id = o.id
LEFT JOIN interventions i ON ste.entity_type = 'intervention' AND ste.entity_id = i.id
LEFT JOIN stock_items si ON ste.entity_type = 'stock_item' AND ste.entity_id = si.id
LEFT JOIN boat_checklists bc ON ste.entity_type = 'checklist' AND ste.entity_id = bc.id;