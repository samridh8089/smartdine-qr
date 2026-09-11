'use client';

import React, { createContext, useContext } from 'react';

interface PreviewModeContextType {
  isPreviewMode: boolean;
  setPreviewMode: (val: boolean) => void;
  togglePreviewMode: () => void;
}

const PreviewModeContext = createContext<PreviewModeContextType>({
  isPreviewMode: false,
  setPreviewMode: () => {},
  togglePreviewMode: () => {},
});

export function PreviewModeProvider({ children }: { children: React.ReactNode }) {
  return (
    <PreviewModeContext.Provider value={{ isPreviewMode: false, setPreviewMode: () => {}, togglePreviewMode: () => {} }}>
      {children}
    </PreviewModeContext.Provider>
  );
}

export function usePreviewMode() {
  return useContext(PreviewModeContext);
}
