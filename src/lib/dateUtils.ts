/**
 * Utilitaires pour gérer les dates de manière consistante
 * indépendamment du fuseau horaire de l'utilisateur.
 * 
 * Les dates sont stockées à midi UTC pour éviter les décalages
 * lors de l'affichage dans différents fuseaux horaires.
 */

/**
 * Convertir une date string "YYYY-MM-DD" en Date à midi UTC
 * Utilisé lors de la soumission de formulaires avec input type="date"
 */
export function parseLocalDateToUTC(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

/**
 * Convertir une Date UTC en string "YYYY-MM-DD" pour les inputs date
 */
export function formatDateForInput(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * Convertir une Date (sélectionnée via Calendar) en Date à midi UTC
 * Utilisé lors de la sauvegarde de dates sélectionnées via un composant Calendar
 */
export function normalizeToMiddayUTC(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0));
}

/**
 * Créer une Date locale à partir d'une date ISO stockée en base
 * Évite les problèmes de décalage lors de l'initialisation des states
 */
export function parseUTCToLocalDate(isoString: string): Date {
  const d = new Date(isoString);
  // Créer une nouvelle date en utilisant seulement l'année, le mois et le jour
  // pour éviter les décalages de timezone
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Formater une date string de manière safe, sans décalage de timezone.
 * Pour les dates "YYYY-MM-DD", parse directement sans passer par new Date()
 * qui interprète en UTC et cause un décalage d'un jour en timezone négative.
 */
export function formatDateSafe(dateString: string, locale: string = 'fr-FR'): string {
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
    return date.toLocaleDateString(locale);
  }
  // Fallback pour les dates ISO complètes
  const d = new Date(dateString);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0)
    .toLocaleDateString(locale);
}

/**
 * Obtenir la date locale actuelle en format "YYYY-MM-DD"
 * Utilise les composants locaux (pas UTC) pour éviter le décalage
 */
export function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
