'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, Monitor, Smartphone, CheckCircle2, X } from 'lucide-react';

interface InstallAppButtonProps {
  className?: string;
  label?: string;
  compact?: boolean;
}

export default function InstallAppButton({ className = '', label, compact = false }: InstallAppButtonProps) {
  // 1. useState hooks
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const [showOptionsModal, setShowOptionsModal] = useState<boolean>(false);
  const [downloadStarted, setDownloadStarted] = useState<boolean>(false);

  // 2. useCallback hooks
  const handleDownloadWindows = useCallback(() => {
    setShowOptionsModal(false);
    const link = document.createElement('a');
    link.href = '/smartdine-desktop-setup.exe';
    link.download = 'SmartDine Setup RC2.exe';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleDownloadAndroid = useCallback(() => {
    setDownloadStarted(true);
    const link = document.createElement('a');
    link.href = '/app-release.apk';
    link.download = 'SmartDine-RC2.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleInstallClick = useCallback(() => {
    if (isMobileDevice) {
      // On mobile devices, trigger APK download directly and open guidance modal
      handleDownloadAndroid();
      setShowOptionsModal(true);
      return;
    }

    // On desktop, open installer choice modal
    setShowOptionsModal(true);
  }, [isMobileDevice, handleDownloadAndroid]);

  // 3. useEffect hooks
  useEffect(() => {
    setMounted(true);

    if (typeof window === 'undefined') return;

    const checkStandalone = () => {
      const isDisplayStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isNavigatorStandalone = (window.navigator as any).standalone === true;
      const isElectron = Boolean((window as any).electronAPI) || (navigator.userAgent || '').includes('Electron');

      if (isDisplayStandalone || isNavigatorStandalone || isElectron) {
        setIsStandalone(true);
      }
    };

    checkStandalone();

    const ua = navigator.userAgent || '';
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i;
    setIsMobileDevice(mobileRegex.test(ua));

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandalone(true);
      }
    };

    try {
      mediaQuery.addEventListener('change', handleMediaChange);
    } catch {
      mediaQuery.addListener(handleMediaChange);
    }

    return () => {
      try {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } catch {
        mediaQuery.removeListener(handleMediaChange);
      }
    };
  }, []);

  // Strict React Hooks Guardrail: Never return before hooks are declared!
  if (isStandalone) {
    return null;
  }

  const buttonText = label || (compact ? (isMobileDevice ? 'APK' : 'Install') : (isMobileDevice ? 'Download APK' : 'Install App'));

  return (
    <>
      <button
        id="install-app-btn"
        onClick={handleInstallClick}
        title={isMobileDevice ? 'Download SmartDine Android APK' : 'Install SmartDine on your device'}
        className={`
          inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg
          bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-950/20
          transition-all hover:scale-105 active:scale-95 cursor-pointer border border-emerald-500/30 shrink-0
          ${className}
        `}
      >
        <Download className="h-3.5 w-3.5 shrink-0" />
        <span className="whitespace-nowrap">{buttonText}</span>
      </button>

      {/* Direct Modal rendered into document.body via Portal to prevent header clipping */}
      {showOptionsModal && mounted && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
          onClick={() => setShowOptionsModal(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative text-slate-100 my-auto animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowOptionsModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>

            {isMobileDevice ? (
              /* Mobile View: Direct APK Download & Quick Instructions */
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">SmartDine Android App</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Direct APK Installation</p>
                  </div>
                </div>

                {downloadStarted && (
                  <div className="bg-emerald-950/50 border border-emerald-500/30 rounded-xl p-3 flex items-start gap-2.5 text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
                    <div className="text-xs font-medium">
                      <p className="font-bold">APK Download Started!</p>
                      <p className="text-[11px] text-emerald-400/90 mt-0.5">Notification panel me download check karein.</p>
                    </div>
                  </div>
                )}

                <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3.5 space-y-2 text-xs text-slate-300">
                  <p className="font-bold text-white text-[11px] uppercase tracking-wider text-slate-400">Install Kaise Karein:</p>
                  <ol className="space-y-1.5 list-decimal list-inside text-slate-300 text-[12px] leading-relaxed">
                    <li>Download complete hone par file ko open karein.</li>
                    <li>Agar prompt aaye toh <strong>&ldquo;Install Unknown Apps&rdquo;</strong> allow karein.</li>
                    <li><strong>&ldquo;Install&rdquo;</strong> button par tap karein.</li>
                  </ol>
                </div>

                <button
                  onClick={handleDownloadAndroid}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>{downloadStarted ? 'Download Again (.apk)' : 'Download APK (73 MB)'}</span>
                </button>

                <p className="text-[11px] text-slate-500 text-center font-medium">
                  Official CleverOps Android Release (RC2)
                </p>
              </div>
            ) : (
              /* Desktop View: Installer Options */
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Download className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">Install SmartDine App</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Select installer for your device</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {/* Windows Desktop Direct Option */}
                  <button
                    onClick={handleDownloadWindows}
                    className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Monitor className="h-5 w-5 text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-white">Windows Desktop App (.exe)</p>
                        <p className="text-[11px] text-slate-400">Tray icon, desktop shortcut, offline mode</p>
                      </div>
                    </div>
                    <Download className="h-4 w-4 text-slate-400 group-hover:text-emerald-400 transition-colors shrink-0" />
                  </button>

                  {/* Android Direct Option */}
                  <button
                    onClick={handleDownloadAndroid}
                    className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-white">Android Mobile App (.apk)</p>
                        <p className="text-[11px] text-slate-400">Waiter, Kitchen & Owner phone app</p>
                      </div>
                    </div>
                    <Download className="h-4 w-4 text-slate-400 group-hover:text-emerald-400 transition-colors shrink-0" />
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 text-center font-medium pt-1">
                  Official SmartDine Native Releases
                </p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
