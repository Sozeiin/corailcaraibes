import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  aspect?: 'video' | 'square';
}

export function ResponsiveImage({ aspect = 'square', className, src, alt, ...props }: ResponsiveImageProps) {
  const aspectClass = aspect === 'video' ? 'aspect-video' : 'aspect-square';

  return (
    <div className={cn('relative w-full overflow-hidden', aspectClass, className)}>
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        {...props}
      />
    </div>
  );
}
