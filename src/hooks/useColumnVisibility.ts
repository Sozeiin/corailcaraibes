import { useState, useEffect } from 'react';

export type ColumnVisibility = {
  channels: boolean;
  threads: boolean;
  detail: boolean;
};

const STORAGE_KEY = 'messagerie-columns-visibility';

export function useColumnVisibility() {
  const [visibility, setVisibility] = useState<ColumnVisibility>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Ignore parse errors
      }
    }
    return { channels: true, threads: true, detail: true };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility));
  }, [visibility]);

  const toggleColumn = (column: keyof ColumnVisibility) => {
    setVisibility((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  const showColumn = (column: keyof ColumnVisibility) => {
    setVisibility((prev) => ({
      ...prev,
      [column]: true,
    }));
  };

  const hideColumn = (column: keyof ColumnVisibility) => {
    setVisibility((prev) => ({
      ...prev,
      [column]: false,
    }));
  };

  return {
    visibility,
    toggleColumn,
    showColumn,
    hideColumn,
  };
}
