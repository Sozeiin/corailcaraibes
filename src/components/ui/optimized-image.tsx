import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ImageIcon, Package } from 'lucide-react';

interface OptimizedImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32'
};

export function OptimizedImage({ 
  src, 
  alt, 
  className, 
  fallbackIcon,
  size = 'md' 
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(!!src);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // If no src or error, show fallback
  if (!src || hasError) {
    return (
      <div className={cn(
        'flex items-center justify-center rounded-lg border bg-muted/30',
        sizeClasses[size],
        className
      )}>
        {fallbackIcon || <Package className="h-1/2 w-1/2 text-muted-foreground" />}
      </div>
    );
  }

  return (
    <div className={cn('relative rounded-lg border overflow-hidden', sizeClasses[size], className)}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <ImageIcon className="h-1/3 w-1/3 text-muted-foreground animate-pulse" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-200',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />
    </div>
  );
}