-- Corriger la fonction delete_boat_cascade pour inclure scheduled_maintenance
CREATE OR REPLACE FUNCTION public.delete_boat_cascade(boat_id_param UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_val user_role;
  user_base_id_val uuid;
  boat_base_id_val uuid;
  deleted_count INTEGER := 0;
BEGIN
  -- Récupérer le rôle et la base de l'utilisateur
  SELECT get_user_role() INTO user_role_val;
  SELECT get_user_base_id() INTO user_base_id_val;
  
  -- Vérifier les permissions
  IF user_role_val NOT IN ('direction', 'chef_base', 'administratif') THEN
    RAISE EXCEPTION 'Permission refusée. Seuls direction, chef_base et administratif peuvent supprimer des bateaux.';
  END IF;
  
  -- Récupérer la base du bateau
  SELECT base_id INTO boat_base_id_val FROM public.boats WHERE id = boat_id_param;
  
  IF boat_base_id_val IS NULL THEN
    RAISE EXCEPTION 'Bateau introuvable.';
  END IF;
  
  -- Vérifier que chef_base et administratif ne peuvent supprimer que dans leur base
  IF user_role_val IN ('chef_base', 'administratif') AND boat_base_id_val != user_base_id_val THEN
    RAISE EXCEPTION 'Permission refusée. Vous ne pouvez supprimer que les bateaux de votre base.';
  END IF;
  
  -- Démarrer la suppression en cascade (dans l'ordre inverse des dépendances)
  
  -- 1. Supprimer component_purchase_history (lié via boat_components et boat_sub_components)
  DELETE FROM public.component_purchase_history WHERE component_id IN (SELECT id FROM public.boat_components WHERE boat_id = boat_id_param);
  DELETE FROM public.component_purchase_history WHERE sub_component_id IN (SELECT bsc.id FROM public.boat_sub_components bsc JOIN public.boat_components bc ON bc.id = bsc.parent_component_id WHERE bc.boat_id = boat_id_param);
  
  -- 2. Supprimer component_supplier_references
  DELETE FROM public.component_supplier_references WHERE component_id IN (SELECT id FROM public.boat_components WHERE boat_id = boat_id_param);
  DELETE FROM public.component_supplier_references WHERE sub_component_id IN (SELECT bsc.id FROM public.boat_sub_components bsc JOIN public.boat_components bc ON bc.id = bsc.parent_component_id WHERE bc.boat_id = boat_id_param);
  
  -- 3. Supprimer component_stock_links
  DELETE FROM public.component_stock_links WHERE component_id IN (SELECT id FROM public.boat_components WHERE boat_id = boat_id_param);
  DELETE FROM public.component_stock_links WHERE sub_component_id IN (SELECT bsc.id FROM public.boat_sub_components bsc JOIN public.boat_components bc ON bc.id = bsc.parent_component_id WHERE bc.boat_id = boat_id_param);
  
  -- 4. Supprimer boat_sub_components
  DELETE FROM public.boat_sub_components WHERE parent_component_id IN (SELECT id FROM public.boat_components WHERE boat_id = boat_id_param);
  
  -- 5. Supprimer boat_components
  DELETE FROM public.boat_components WHERE boat_id = boat_id_param;
  
  -- 6. Supprimer boat_safety_control_items (via boat_safety_controls)
  DELETE FROM public.boat_safety_control_items WHERE control_id IN (SELECT id FROM public.boat_safety_controls WHERE boat_id = boat_id_param);
  
  -- 7. Supprimer boat_safety_controls
  DELETE FROM public.boat_safety_controls WHERE boat_id = boat_id_param;
  
  -- 8. Supprimer boat_checklist_items (via boat_checklists)
  DELETE FROM public.boat_checklist_items WHERE checklist_id IN (SELECT id FROM public.boat_checklists WHERE boat_id = boat_id_param);
  
  -- 9. Supprimer boat_checklists
  DELETE FROM public.boat_checklists WHERE boat_id = boat_id_param;
  
  -- 10. Supprimer administrative_checkin_forms (boat_id et suggested_boat_id)
  DELETE FROM public.administrative_checkin_forms WHERE boat_id = boat_id_param OR suggested_boat_id = boat_id_param;
  
  -- 11. Supprimer boat_preparation_checklists
  DELETE FROM public.boat_preparation_checklists WHERE boat_id = boat_id_param;
  
  -- 12. Supprimer checkin_checkout_orders
  DELETE FROM public.checkin_checkout_orders WHERE boat_id = boat_id_param;
  
  -- 13. Supprimer scheduled_maintenance (AVANT interventions car il y a une FK)
  DELETE FROM public.scheduled_maintenance WHERE boat_id = boat_id_param;
  
  -- 14. Supprimer intervention_parts (via interventions)
  DELETE FROM public.intervention_parts WHERE intervention_id IN (SELECT id FROM public.interventions WHERE boat_id = boat_id_param);
  
  -- 15. Supprimer interventions
  DELETE FROM public.interventions WHERE boat_id = boat_id_param;
  
  -- 16. Supprimer maintenance_tasks
  DELETE FROM public.maintenance_tasks WHERE boat_id = boat_id_param;
  
  -- 17. Supprimer messages liés aux topics de ce bateau
  DELETE FROM public.messages WHERE thread_id IN (SELECT id FROM public.topics WHERE boat_id = boat_id_param);
  
  -- 18. Supprimer topics
  DELETE FROM public.topics WHERE boat_id = boat_id_param;
  
  -- 19. Supprimer planning_activities
  DELETE FROM public.planning_activities WHERE boat_id = boat_id_param;
  
  -- 20. Supprimer maintenance_manual_tasks (via maintenance_manuals)
  DELETE FROM public.maintenance_manual_tasks WHERE manual_id IN (SELECT id FROM public.maintenance_manuals WHERE boat_id = boat_id_param);
  
  -- 21. Supprimer maintenance_manuals
  DELETE FROM public.maintenance_manuals WHERE boat_id = boat_id_param;
  
  -- 22. Les tables avec CASCADE défini se supprimeront automatiquement:
  -- boat_documents, boat_rentals, preparation_checklist_templates
  
  -- 23. Enfin, supprimer le bateau
  DELETE FROM public.boats WHERE id = boat_id_param;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  IF deleted_count = 0 THEN
    RAISE EXCEPTION 'Échec de la suppression du bateau.';
  END IF;
  
  -- Retourner un résultat de succès
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Bateau et toutes les données liées supprimés avec succès',
    'boat_id', boat_id_param
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback automatique en cas d'erreur
    RAISE EXCEPTION 'Erreur lors de la suppression: %', SQLERRM;
END;
$$;