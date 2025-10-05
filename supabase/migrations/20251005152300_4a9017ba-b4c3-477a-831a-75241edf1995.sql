-- Fonction pour notifier tous les participants d'un thread lors d'un nouveau message
CREATE OR REPLACE FUNCTION notify_thread_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participant_record RECORD;
  thread_title TEXT;
  author_name TEXT;
BEGIN
  -- Récupérer le titre du thread et le nom de l'auteur
  SELECT t.title, p.name 
  INTO thread_title, author_name
  FROM topics t
  LEFT JOIN profiles p ON p.id = NEW.author_id
  WHERE t.id = NEW.topic_id;

  -- Notifier tous les utilisateurs assignés au thread (sauf l'auteur du message)
  FOR participant_record IN 
    SELECT DISTINCT ta.user_id
    FROM thread_assignments ta
    WHERE ta.topic_id = NEW.topic_id
      AND ta.is_active = true
      AND ta.user_id != NEW.author_id
  LOOP
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data
    ) VALUES (
      participant_record.user_id,
      'new_message',
      'Nouveau message dans ' || COALESCE(thread_title, 'un sujet'),
      COALESCE(author_name, 'Un utilisateur') || ' a ajouté un message',
      jsonb_build_object(
        'topic_id', NEW.topic_id,
        'message_id', NEW.id,
        'author_id', NEW.author_id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger pour les nouveaux messages
DROP TRIGGER IF EXISTS trigger_notify_thread_participants ON messages;
CREATE TRIGGER trigger_notify_thread_participants
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_thread_participants();

-- Fonction pour notifier lors d'une assignation
CREATE OR REPLACE FUNCTION notify_on_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  thread_title TEXT;
  assigner_name TEXT;
  assignee_name TEXT;
BEGIN
  -- Ne notifier que pour les nouvelles assignations actives
  IF NEW.is_active = true THEN
    -- Récupérer les informations
    SELECT t.title INTO thread_title
    FROM topics t
    WHERE t.id = NEW.topic_id;

    SELECT p.name INTO assigner_name
    FROM profiles p
    WHERE p.id = NEW.assigned_by;

    SELECT p.name INTO assignee_name
    FROM profiles p
    WHERE p.id = NEW.user_id;

    -- Notifier l'utilisateur assigné
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data
    ) VALUES (
      NEW.user_id,
      'thread_assignment',
      'Vous avez été assigné à un sujet',
      COALESCE(assigner_name, 'Un utilisateur') || ' vous a assigné au sujet "' || COALESCE(thread_title, 'Sans titre') || '"',
      jsonb_build_object(
        'topic_id', NEW.topic_id,
        'assignment_id', NEW.id,
        'role', NEW.role,
        'assigned_by', NEW.assigned_by
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger pour les assignations
DROP TRIGGER IF EXISTS trigger_notify_on_assignment ON thread_assignments;
CREATE TRIGGER trigger_notify_on_assignment
  AFTER INSERT OR UPDATE ON thread_assignments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_assignment();

-- Fonction pour notifier lors d'un changement de statut
CREATE OR REPLACE FUNCTION notify_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participant_record RECORD;
  thread_title TEXT;
  old_status TEXT;
  new_status TEXT;
BEGIN
  -- Vérifier si le statut a changé
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    old_status := COALESCE(OLD.status::text, 'nouveau');
    new_status := NEW.status::text;

    -- Récupérer le titre du thread
    SELECT t.title INTO thread_title
    FROM topics t
    WHERE t.id = NEW.topic_id;

    -- Notifier tous les participants actifs
    FOR participant_record IN 
      SELECT DISTINCT ta.user_id
      FROM thread_assignments ta
      WHERE ta.topic_id = NEW.topic_id
        AND ta.is_active = true
    LOOP
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data
      ) VALUES (
        participant_record.user_id,
        'status_change',
        'Changement de statut',
        'Le sujet "' || COALESCE(thread_title, 'Sans titre') || '" est passé de "' || old_status || '" à "' || new_status || '"',
        jsonb_build_object(
          'topic_id', NEW.topic_id,
          'old_status', old_status,
          'new_status', new_status
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger pour les changements de statut
DROP TRIGGER IF EXISTS trigger_notify_on_status_change ON thread_workflow_states;
CREATE TRIGGER trigger_notify_on_status_change
  AFTER UPDATE ON thread_workflow_states
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_status_change();

-- Fonction pour notifier lors de la liaison d'une entité
CREATE OR REPLACE FUNCTION notify_on_entity_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participant_record RECORD;
  thread_title TEXT;
  entity_label TEXT;
  linker_name TEXT;
BEGIN
  -- Récupérer le titre du thread
  SELECT t.title INTO thread_title
  FROM topics t
  WHERE t.id = NEW.topic_id;

  -- Récupérer le nom de la personne qui a lié
  SELECT p.name INTO linker_name
  FROM profiles p
  WHERE p.id = NEW.linked_by;

  -- Définir le label de l'entité
  entity_label := CASE NEW.entity_type
    WHEN 'supply_request' THEN 'Demande d''approvisionnement'
    WHEN 'boat' THEN 'Bateau'
    WHEN 'order' THEN 'Commande'
    WHEN 'intervention' THEN 'Intervention'
    WHEN 'stock_item' THEN 'Article de stock'
    WHEN 'checklist' THEN 'Checklist'
    ELSE 'Entité'
  END;

  -- Notifier tous les participants actifs
  FOR participant_record IN 
    SELECT DISTINCT ta.user_id
    FROM thread_assignments ta
    WHERE ta.topic_id = NEW.topic_id
      AND ta.is_active = true
      AND ta.user_id != NEW.linked_by  -- Ne pas notifier celui qui a lié
  LOOP
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data
    ) VALUES (
      participant_record.user_id,
      'entity_linked',
      'Entité liée au sujet',
      COALESCE(linker_name, 'Un utilisateur') || ' a lié ' || entity_label || ' au sujet "' || COALESCE(thread_title, 'Sans titre') || '"',
      jsonb_build_object(
        'topic_id', NEW.topic_id,
        'entity_type', NEW.entity_type,
        'entity_id', NEW.entity_id,
        'linked_by', NEW.linked_by
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger pour les liaisons d'entités
DROP TRIGGER IF EXISTS trigger_notify_on_entity_link ON smart_thread_entities;
CREATE TRIGGER trigger_notify_on_entity_link
  AFTER INSERT ON smart_thread_entities
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_entity_link();