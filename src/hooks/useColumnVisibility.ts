import { useState, useEffect, useRef } from 'react';
import type { ImperativePanelHandle } from 'react-resizable-panels';

export type PanelState = {
  channels: { collapsed: boolean; size: number };
  threads: { collapsed: boolean; size: number };
};

const STORAGE_KEY = 'messagerie-panels-state';
const DEFAULT_STATE: PanelState = {
  channels: { collapsed: false, size: 20 },
  threads: { collapsed: false, size: 30 },
};

export function usePanelState() {
  const channelsRef = useRef<ImperativePanelHandle>(null);
  const threadsRef = useRef<ImperativePanelHandle>(null);

  const [panelState, setPanelState] = useState<PanelState>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_STATE;
      }
    }
    return DEFAULT_STATE;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(panelState));
  }, [panelState]);

  const togglePanel = (panel: keyof PanelState) => {
    const ref = panel === 'channels' ? channelsRef : threadsRef;
    const isCollapsed = panelState[panel].collapsed;

    if (isCollapsed) {
      ref.current?.expand();
    } else {
      ref.current?.collapse();
    }

    setPanelState((prev) => ({
      ...prev,
      [panel]: {
        ...prev[panel],
        collapsed: !isCollapsed,
      },
    }));
  };

  const onLayout = (sizes: number[]) => {
    setPanelState((prev) => ({
      channels: { ...prev.channels, size: sizes[0] },
      threads: { ...prev.threads, size: sizes[1] },
    }));
  };

  return {
    channelsRef,
    threadsRef,
    panelState,
    togglePanel,
    onLayout,
  };
}
