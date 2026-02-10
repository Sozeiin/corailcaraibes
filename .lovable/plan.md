
# Transfert du check-in du bateau PYRITE vers NICKEL

## Ce qui va etre fait

Une simple mise a jour en base de donnees pour deplacer le check-in du 30/01/2026 (technicien Hugo Drouet, client Erik Lebreton) du bateau **PYRITE** vers le bateau **NICKEL**.

### Donnees identifiees
- Checklist concernee : `2157f9e6-75ae-40dc-b230-18edbf8dd11c`
- Bateau actuel : PYRITE (`b92546e4-20a2-42d1-8bfa-ab15bf1e0e3f`)
- Bateau cible : NICKEL (`bbe811ab-8937-455e-8f61-a9bb5dea2b86`)
- 52 items de checklist associes (ils restent lies automatiquement via `checklist_id`)

### Modification

```sql
UPDATE boat_checklists 
SET boat_id = 'bbe811ab-8937-455e-8f61-a9bb5dea2b86'
WHERE id = '2157f9e6-75ae-40dc-b230-18edbf8dd11c';
```

### Resultat attendu
- Le check-in apparaitra dans l'historique du bateau NICKEL au lieu de PYRITE
- Tous les 52 items et photos du check-in restent intacts
- Aucun autre check-in n'est impacte

## Section technique

Un seul UPDATE SQL sur la table `boat_checklists` pour changer la reference `boat_id`. Les `boat_checklist_items` sont lies par `checklist_id` et non par `boat_id`, donc aucune modification supplementaire n'est necessaire.
