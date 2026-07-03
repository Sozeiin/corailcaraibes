# Corriger la suppression des utilisateurs (contraintes de clés étrangères bloquantes)

## Problème
Impossible de supprimer un utilisateur. Le message d'erreur système est :
`update or delete on table "users" violates foreign key constraint "administrative_checkin_forms_used_by_fkey"`.

## Cause
Plusieurs colonnes de la base pointent vers un utilisateur (`auth.users`) via des clés étrangères configurées en mode « bloquant » (NO ACTION) au lieu de « mettre à vide » (SET NULL). Quand on supprime l'utilisateur, ces références empêchent la suppression au lieu de se vider automatiquement.

La fonction de suppression `delete_user_cascade` supprime bien le profil et les rôles, mais ces 14 colonnes référencent directement `auth.users` et bloquent l'opération finale.

Colonnes concernées (toutes déjà autorisées à être vides) :
- `administrative_checkin_forms.used_by`
- `api_logs.user_id`
- `boat_base_transfers.transferred_by`
- `boat_documents.uploaded_by`
- `planning_activities.planned_by`
- `security_events.user_id`
- `smart_thread_entities.linked_by`
- `stock_reservations.reserved_by`
- `supply_request_comments.author_id`
- `thread_assignments.assigned_by`
- `thread_workflow_states.assigned_to`
- `thread_workflow_states.resolved_by`
- `user_permissions.granted_by`
- `user_roles.assigned_by`

## Solution (durable)
Migration base de données : reconfigurer ces 14 clés étrangères en **ON DELETE SET NULL**. Ainsi, à la suppression d'un utilisateur, ces références passent automatiquement à vide au lieu de bloquer — conforme au principe déjà en place (préserver l'historique sans casser la suppression).

Pour chaque contrainte : suppression de l'ancienne contrainte puis recréation avec `ON DELETE SET NULL`.

Aucune donnée n'est perdue (les colonnes deviennent nulles, l'historique métier reste dans les tables). Aucune modification de code applicatif nécessaire : la fonction `delete_user_cascade` existante fonctionnera ensuite correctement.

## Vérification
- Après migration, supprimer un utilisateur via l'interface d'administration réussit.
- Les enregistrements liés (fiches, documents, plannings, etc.) restent présents avec le champ « auteur/responsable » vidé.
