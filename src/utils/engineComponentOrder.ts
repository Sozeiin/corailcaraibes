// Ordre d'affichage prioritaire des composants moteur :
// 1. Moteur BABORD, 2. Moteur TRIBORD, 3. GENERATRICE, puis le reste.

/**
 * Retourne un rang de priorité pour un composant en fonction de son nom/type.
 * Plus le rang est petit, plus le composant s'affiche en premier.
 */
export function getEngineComponentRank(...values: (string | null | undefined)[]): number {
  const text = values.filter(Boolean).join(' ').toLowerCase();

  const isBabord = text.includes('babord') || text.includes('bâbord') || text.includes('port');
  const isTribord = text.includes('tribord');
  const isGenerator =
    text.includes('generatrice') ||
    text.includes('génératrice') ||
    text.includes('generateur') ||
    text.includes('générateur') ||
    text.includes('generator');

  if (isBabord) return 0;
  if (isTribord) return 1;
  if (isGenerator) return 2;
  return 3;
}

/**
 * Comparateur pour trier les composants moteur dans l'ordre
 * BABORD -> TRIBORD -> GENERATRICE -> autres (alphabétique).
 */
export function compareEngineComponents(
  a: { name?: string | null; type?: string | null },
  b: { name?: string | null; type?: string | null }
): number {
  const rankA = getEngineComponentRank(a.name, a.type);
  const rankB = getEngineComponentRank(b.name, b.type);
  if (rankA !== rankB) return rankA - rankB;
  return (a.name || '').localeCompare(b.name || '');
}
