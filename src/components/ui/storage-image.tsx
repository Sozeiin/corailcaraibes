import React from 'react';
import { useSignedStorageUrl } from '@/lib/storageUrls';

type StorageImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string | null;
};

/**
 * <img> qui sait afficher les fichiers des buckets privés
 * en générant une URL signée à la volée.
 */
export const StorageImage = ({ src, ...props }: StorageImageProps) => {
  const resolved = useSignedStorageUrl(src);
  if (!resolved) return null;
  return <img src={resolved} {...props} />;
};
