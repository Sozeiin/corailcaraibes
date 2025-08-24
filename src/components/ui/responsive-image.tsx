import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {}

export function ResponsiveImage({ className, ...props }: ResponsiveImageProps) {
  return <img {...props} className={cn('h-auto w-full', className)} />;
}

export default ResponsiveImage;
