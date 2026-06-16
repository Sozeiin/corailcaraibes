## Objectif

Dans la fenêtre **Terminer l'intervention** (section "Moteurs du bateau"), inclure aussi le composant **Générateur (génératrice / groupe électrogène)** afin que les techniciens puissent saisir ses heures moteur et cocher « Vidange effectuée sur ce moteur » pour mettre à jour ce composant — exactement comme pour Moteur bâbord et Moteur tribord.

## Constat

Le composant `src/components/maintenance/InterventionCompletionDialog.tsx` charge uniquement les composants dont le type contient « moteur » :

```
.ilike('component_type', '%moteur%')
```

Or les générateurs ont le type `Générateur` en base (10 enregistrements), donc ils n'apparaissent jamais. Le reste de l'interface (champ heures + interrupteur vidange + logique de mise à jour) est déjà générique : il boucle sur tous les composants récupérés. Il suffit donc d'élargir la requête.

## Modifications

Fichier : `src/components/maintenance/InterventionCompletionDialog.tsx`

1. Remplacer le filtre de la requête `fetchEngineComponents` pour inclure les moteurs **et** les générateurs :
   ```
   .or('component_type.ilike.%moteur%,component_type.ilike.%générateur%,component_type.ilike.%generateur%')
   ```
   (couvre les variantes accentuées/non accentuées).

2. Mettre à jour le titre de section de « Moteurs du bateau » en « Moteurs et générateur du bateau » pour refléter le contenu.

Aucun autre changement nécessaire : l'affichage des heures, l'interrupteur « Vidange effectuée sur ce moteur » et la mise à jour de `current_engine_hours` / `last_oil_change_hours` dans `boat_components` fonctionnent déjà pour chaque composant listé, donc le générateur sera mis à jour de la même manière.

## Vérification

- Ouvrir « Terminer l'intervention » sur un bateau ayant un générateur : le bloc Générateur doit apparaître avec ses heures actuelles et l'interrupteur de vidange.
- Cocher la vidange et finaliser : confirmer que `current_engine_hours` et `last_oil_change_hours` du composant générateur sont bien mis à jour.
