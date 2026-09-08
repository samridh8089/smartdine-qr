'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface PreviewModeContextType {
  isPreviewMode: boolean;
  setPreviewMode: (val: boolean) => void;
  togglePreviewMode: () => void;
}

const PreviewModeContext = createContext<PreviewModeContextType>({
  isPreviewMode: true,
  setPreviewMode: () => {},
  togglePreviewMode: () => {}
});

export function PreviewModeProvider({ children }: { children: React.ReactNode }) {
  // Default to true for localhost Founder review, can be toggled OFF instantly
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cleverops_preview_mode');
      if (saved !== null) {
        setIsPreviewMode(saved === 'true');
      } else {
        // Default to true on initial localhost launch
        localStorage.setItem('cleverops_preview_mode', 'true');
      }
    }
  }, []);

  const setPreviewMode = (val: boolean) => {
    setIsPreviewMode(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cleverops_preview_mode', val ? 'true' : 'false');
    }
  };

  const togglePreviewMode = () => {
    setPreviewMode(!isPreviewMode);
  };

  return (
    <PreviewModeContext.Provider value={{ isPreviewMode, setPreviewMode, togglePreviewMode }}>
      {children}
    </PreviewModeContext.Provider>
  );
}

export function usePreviewMode() {
  return useContext(PreviewModeContext);
}
