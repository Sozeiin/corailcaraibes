
import { useState, useEffect } from 'react';
import { Wifi, WifiOff, CloudOff, Download, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useMobileCapacitor } from '@/hooks/useMobileCapacitor';
import { cn } from '@/lib/utils';

export const MobileOfflineBar = () => {
  // Toujours retourner null pour masquer complètement la barre
  return null;
};
