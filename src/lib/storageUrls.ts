import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Buckets privés : les URLs stockées en base (anciennes URLs "public")
 * doivent être re-signées avant affichage / téléchargement.
 */
const PRIVATE_BUCKETS = ['stock-photos', 'purchase-requests', 'checklist-photos'];

const SIGNED_TTL_SECONDS = 60 * 60; // 1 heure

type CacheEntry = { url: string; expiresAt: number };
const cache = new Map<string, CacheEntry>();

/** Extrait bucket + chemin d'une URL de storage Supabase (public ou signée). */
export const parseStorageUrl = (url: string): { bucket: string; path: string } | null => {
  if (!url) return null;
  const match = url.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+?)(?:\?|$)/);
  if (!match) return null;
  const bucket = match[1];
  if (!PRIVATE_BUCKETS.includes(bucket)) return null;
  return { bucket, path: decodeURIComponent(match[2]) };
};

/**
 * Retourne une URL affichable : si l'URL pointe vers un bucket privé,
 * une URL signée est générée (avec cache). Sinon l'URL est renvoyée telle quelle.
 */
export const resolveStorageUrl = async (url?: string | null): Promise<string> => {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  const parsed = parseStorageUrl(url);
  if (!parsed) return url;

  const key = `${parsed.bucket}/${parsed.path}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, SIGNED_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.warn('[storage] Impossible de signer l\'URL:', key, error?.message);
    return url;
  }

  cache.set(key, {
    url: data.signedUrl,
    expiresAt: Date.now() + (SIGNED_TTL_SECONDS - 60) * 1000,
  });
  return data.signedUrl;
};

/** Ouvre un fichier de storage (privé ou non) dans un nouvel onglet. */
export const openStorageFile = async (url?: string | null) => {
  const resolved = await resolveStorageUrl(url);
  if (resolved) window.open(resolved, '_blank', 'noopener,noreferrer');
};

/** Hook d'affichage : renvoie l'URL utilisable pour un <img src>. */
export const useSignedStorageUrl = (url?: string | null): string => {
  const [resolved, setResolved] = useState<string>(() => {
    if (!url) return '';
    return parseStorageUrl(url) ? '' : url;
  });

  useEffect(() => {
    let active = true;
    if (!url) {
      setResolved('');
      return;
    }
    if (!parseStorageUrl(url)) {
      setResolved(url);
      return;
    }
    resolveStorageUrl(url).then((value) => {
      if (active) setResolved(value);
    });
    return () => {
      active = false;
    };
  }, [url]);

  return resolved;
};
