
# Mise à jour des statuts des bateaux PYRITE et NICKEL

## Modifications

Deux mises à jour simples dans la table `boats` :

| Bateau | Statut actuel | Nouveau statut |
|--------|--------------|----------------|
| PYRITE | rented (en location) | available (disponible) |
| NICKEL | available (disponible) | rented (en location) |

## Section technique

Requetes SQL a executer :

```sql
UPDATE boats SET status = 'available' WHERE id = 'b92546e4-20a2-42d1-8bfa-ab15bf1e0e3f'; -- PYRITE
UPDATE boats SET status = 'rented' WHERE id = 'bbe811ab-8937-455e-8f61-a9bb5dea2b86'; -- NICKEL
```

Aucun fichier de code a modifier, uniquement des mises a jour de donnees en base.
