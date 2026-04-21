/**
 * Utilitaires de dates centrés sur le **fuseau horaire de la base**.
 *
 * Stratégie :
 * - Dates "pures" (date de check-in, planning, maintenance) :
 *   stockées en `timestamptz` à **midi heure locale de la base**
 *   pour qu'aucune conversion timezone ne fasse changer le jour.
 * - Instants (création, signature, début/fin réels) :
 *   stockés en UTC, formatés dans le fuseau de la base concernée.
 *
 * Toutes les conversions DOIVENT passer par ces helpers.
 * Plus aucun `new Date(x).toISOString()` ou `toLocaleDateString()` brut
 * dans le code applicatif pour les dates fonctionnelles.
 */

import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format as formatFns } from 'date-fns';

export const DEFAULT_TIMEZONE = 'America/Martinique';

export type TimezoneInput = string | null | undefined;

/**
 * Récupère le fuseau effectif (avec fallback).
 */
export function getBaseTimezone(tz?: TimezoneInput): string {
  return tz && tz.trim().length > 0 ? tz : DEFAULT_TIMEZONE;
}

/**
 * Date locale "now" représentée comme un Date JS portant
 * les composants visuels de l'heure dans le fuseau cible.
 * Utile pour l'affichage rapide ; pour stocker, préférer `nowAsUTC`.
 */
export function nowInTimezone(tz?: TimezoneInput): Date {
  return toZonedTime(new Date(), getBaseTimezone(tz));
}

/**
 * Retourne la date du jour au format `YYYY-MM-DD` selon le fuseau de la base.
 * Remplace l'ancien `getLocalDateString()` qui dépendait du navigateur.
 */
export function getLocalDateString(tz?: TimezoneInput): string {
  return formatInTimeZone(new Date(), getBaseTimezone(tz), 'yyyy-MM-dd');
}

/**
 * Convertit un `YYYY-MM-DD` (saisi via input type=date) en `Date` UTC
 * positionnée à **midi heure locale de la base**.
 *
 * Exemple : "2026-04-25" + "America/Guadeloupe"
 *   → instant représentant 25/04/2026 12:00 heure Guadeloupe
 *   → en UTC : 25/04/2026 16:00Z
 *
 * Cela garantit que l'affichage dans n'importe quel fuseau du monde
 * tombera toujours sur le 25/04 (jamais la veille).
 */
export function parseDateInputToUTC(dateString: string, tz?: TimezoneInput): Date {
  const timezone = getBaseTimezone(tz);
  // Construit la date "midi locale" puis convertit en UTC
  const localMidday = `${dateString}T12:00:00`;
  return fromZonedTime(localMidday, timezone);
}

/**
 * Compatibilité : ancien `parseLocalDateToUTC`.
 * Utilise désormais le fuseau passé en paramètre (par défaut Martinique).
 */
export function parseLocalDateToUTC(dateString: string, tz?: TimezoneInput): Date {
  return parseDateInputToUTC(dateString, tz);
}

/**
 * Normalise une Date (provenant d'un Calendar dans le navigateur) en
 * `midi heure locale de la base`. On utilise les composants
 * locaux de la Date (jour/mois/année tels que vus par l'utilisateur),
 * sans passer par une conversion qui décalerait le jour.
 */
export function normalizeToMiddayUTC(date: Date, tz?: TimezoneInput): Date {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return parseDateInputToUTC(`${y}-${m}-${d}`, tz);
}

/**
 * Convertit un instant ISO en `YYYY-MM-DD` correspondant au jour
 * dans le fuseau de la base. Utilisé pour pré-remplir les `<input type="date">`.
 *
 * Corrige le bug `toISOString()` qui pouvait renvoyer la veille
 * lorsqu'une date à minuit locale était convertie en UTC.
 */
export function formatDateForInput(date: Date | string | null | undefined, tz?: TimezoneInput): string {
  if (!date) return '';
  const timezone = getBaseTimezone(tz);
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return formatInTimeZone(d, timezone, 'yyyy-MM-dd');
}

/**
 * Formate une date pour l'affichage utilisateur, dans le fuseau choisi.
 * Format par défaut : `dd/MM/yyyy`.
 */
export function formatDateInTimezone(
  date: Date | string | null | undefined,
  tz?: TimezoneInput,
  fmt: string = 'dd/MM/yyyy'
): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return formatInTimeZone(d, getBaseTimezone(tz), fmt);
}

/**
 * Formate un instant complet `dd/MM/yyyy HH:mm` dans le fuseau cible.
 * Utilisé pour signatures, horodatages, créations.
 */
export function formatDateTimeInTimezone(
  date: Date | string | null | undefined,
  tz?: TimezoneInput
): string {
  return formatInTimeZone(
    typeof date === 'string' ? new Date(date) : (date ?? new Date()),
    getBaseTimezone(tz),
    'dd/MM/yyyy HH:mm'
  );
}

/**
 * Variante avec libellé explicite du fuseau de la base, ex :
 * `25/04/2026 09:00 (heure Martinique)`
 * Utile pour les utilisateurs direction qui consultent des fiches d'autres bases.
 */
export function formatDateTimeWithTimezoneLabel(
  date: Date | string | null | undefined,
  tz?: TimezoneInput
): string {
  const timezone = getBaseTimezone(tz);
  const formatted = formatDateTimeInTimezone(date, timezone);
  const label = timezoneLabel(timezone);
  return label ? `${formatted} (heure ${label})` : formatted;
}

/**
 * Libellé court d'un fuseau (utilisé pour l'affichage côté direction).
 */
export function timezoneLabel(tz?: TimezoneInput): string {
  switch (getBaseTimezone(tz)) {
    case 'America/Martinique':
      return 'Martinique';
    case 'America/Guadeloupe':
      return 'Guadeloupe';
    case 'Europe/Paris':
      return 'Paris';
    default:
      return getBaseTimezone(tz).split('/').pop() || '';
  }
}

/**
 * Formatage "safe" d'une date (string ou Date) dans le fuseau de la base.
 * Conserve la signature historique de `formatDateSafe(dateString, locale?)`.
 *
 * Si on passe encore l'ancienne `locale` (`fr-FR`), on l'ignore et on
 * applique automatiquement le format `dd/MM/yyyy` dans le fuseau base.
 */
export function formatDateSafe(
  dateString: string | Date | null | undefined,
  tzOrLocale?: TimezoneInput
): string {
  if (!dateString) return '';
  // Détecte l'ancien usage `formatDateSafe(date, 'fr-FR')`
  const looksLikeLocale = typeof tzOrLocale === 'string' && /^[a-z]{2}-[A-Z]{2}$/.test(tzOrLocale);
  const tz = looksLikeLocale ? DEFAULT_TIMEZONE : (tzOrLocale ?? DEFAULT_TIMEZONE);

  if (typeof dateString === 'string') {
    // Cas pur "YYYY-MM-DD" sans heure : on évite tout reparse timezone
    const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const [, y, m, d] = match;
      return `${d}/${m}/${y}`;
    }
  }
  return formatDateInTimezone(dateString, tz, 'dd/MM/yyyy');
}

/**
 * Ancien helper conservé pour rétro-compatibilité.
 * Renvoie une Date locale construite depuis la composante jour de l'ISO.
 */
export function parseUTCToLocalDate(isoString: string, tz?: TimezoneInput): Date {
  const timezone = getBaseTimezone(tz);
  const ymd = formatInTimeZone(new Date(isoString), timezone, 'yyyy-MM-dd');
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Helper de bas niveau : renvoie un format date-fns appliqué à un instant
 * "vu" dans le fuseau cible. Pratique pour les composants qui veulent
 * formater autrement que dd/MM/yyyy.
 */
export function formatWithTz(
  date: Date | string,
  tz: TimezoneInput,
  fmt: string
): string {
  return formatInTimeZone(typeof date === 'string' ? new Date(date) : date, getBaseTimezone(tz), fmt);
}

/**
 * Format date-fns classique, sans conversion. À utiliser uniquement quand
 * l'instant est déjà "zoned".
 */
export function rawFormat(date: Date, fmt: string): string {
  return formatFns(date, fmt);
}
