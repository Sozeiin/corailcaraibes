
Corriger la reprise des brouillons pour que les cases cochées, notes, photos et signatures restent intactes au lieu d’être réécrites par l’état vide du formulaire.

1. Sécuriser la restauration dans `src/hooks/useFormPersistence.ts`
- Remplacer le déclenchement actuel de `hasTriedRestoreRef` avant la fin du chargement.
- Introduire un état interne du type `isHydrating` / `isRestoring`.
- Bloquer complètement l’auto-sauvegarde tant que le brouillon distant n’a pas fini d’être chargé et appliqué.
- N’autoriser la première sauvegarde qu’après la restauration effective, ou après confirmation qu’aucun brouillon n’existe.

2. Empêcher l’écrasement immédiat du brouillon au montage
- Aujourd’hui, à l’ouverture, le formulaire démarre avec des éléments “non vérifiés”, puis l’effet de sauvegarde repart trop tôt.
- Faire en sorte que l’effet `useEffect(() => saveData(formData))` ne se lance pas pendant l’initialisation.
- Ajouter une garde pour ignorer les sauvegardes quand les données affichées correspondent encore à l’état par défaut initial.

3. Fusionner correctement les items restaurés avec les items frais de la base dans `src/components/checkin/ChecklistForm.tsx`
- Au lieu de réinjecter `restoredData.checklistItems` tel quel, reconstruire la liste à partir des `fetchedItems`.
- Pour chaque item de checklist:
  - conserver depuis la base la structure métier à jour (`id`, `name`, `category`, `isRequired`)
  - réappliquer depuis le brouillon l’état utilisateur (`status`, `notes`, `photos`)
- Cela évitera les pertes de propriétés critiques et garantira que les coches restaurées restent affichées correctement.

4. Renforcer `handleFormRestore` dans `ChecklistForm.tsx`
- Utiliser une fusion par `item.id` entre données sauvegardées et définition fraîche des items.
- Restaurer aussi `generalNotes`, `currentStep`, `customerEmail`, `sendEmailReport`, `engineHours`.
- Conserver la logique actuelle de validation des brouillons corrompus, mais sans effacer les données valides.

5. Corriger le timing de restauration dans le formulaire
- Attendre que les `fetchedItems` soient disponibles avant d’appliquer définitivement la restauration des `checklistItems`.
- Si le brouillon arrive avant les items de référence, le stocker temporairement puis effectuer la fusion une fois les items chargés.
- Éviter qu’un `setChecklistItems(initialItems)` ultérieur remplace des données déjà restaurées.

6. Vérifier aussi la persistance des signatures dans `src/hooks/useSignaturePersistence.ts`
- Appliquer la même logique anti-écrasement au chargement des signatures.
- Ne jamais pousser une mise à jour vide juste après reprise d’un brouillon si les signatures n’ont pas encore été relues depuis la base.

7. Vérifier les messages UX
- Mettre à jour le message d’annulation “les données seront perdues” si le brouillon est en réalité sauvegardé.
- Conserver le toast “Brouillon restauré”, mais uniquement quand la restauration est réellement finalisée.

Résultat attendu
- Quand un technicien reprend un check-in ou check-out, toutes les cases déjà cochées restent cochées.
- Les notes, photos, heures moteur et signatures restent présentes.
- Le brouillon n’est plus écrasé par un état vide au moment de la reprise.

Détails techniques
```text
Cause racine actuelle:
1. ouverture du formulaire
2. hasTriedRestoreRef passe à true immédiatement
3. l'effet de sauvegarde devient autorisé
4. le formulaire contient encore l'état initial (items non cochés)
5. ce faux état est sauvegardé en base
6. le vrai brouillon est donc écrasé

Correctif:
- séparer "tentative de restauration" et "restauration terminée"
- suspendre toute sauvegarde pendant l’hydratation
- fusionner les données restaurées avec les checklist_items fraîches
```

Fichiers à modifier
- `src/hooks/useFormPersistence.ts`
- `src/hooks/useSignaturePersistence.ts`
- `src/components/checkin/ChecklistForm.tsx`

Validation à faire après implémentation
1. Cocher plusieurs éléments sur un check-in, fermer, reprendre: tout doit rester coché.
2. Ajouter notes + photos, fermer, reprendre: tout doit revenir.
3. Tester check-out sur le même bateau: aucune perte de données.
4. Vérifier qu’un nouveau brouillon sans historique continue bien à s’auto-sauvegarder normalement.
