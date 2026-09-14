'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Download, Monitor, Smartphone, CheckCircle2, X } from 'lucide-react';

export default function InstallAppButton({ className = '' }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isWindows, setIsWindows] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [showOptionsModal, setShowOptionsModal] = useState<boolean>(false);
  const [installSuccess, setInstallSuccess] = useState<boolean>(false);

  // Callbacks before Effects per CleverOps React Hooks Safety Guardrail
  const handleInstallClick = useCallback(async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          setInstallSuccess(true);
          setTimeout(() => setInstallSuccess(false), 4000);
        }
      } catch (err) {
        console.warn('[InstallApp] Prompt failed, showing fallback options:', err);
        setShowOptionsModal(true);
      }
    } else {
      // If native browser prompt is not active, open quick 1-click install modal
      setShowOptionsModal(true);
    }
  }, [deferredPrompt]);

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
    setShowOptionsModal(false);
    const link = document.createElement('a');
    link.href = '/app-release.apk';
    link.download = 'SmartDine-RC2.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Effects declared after callbacks
  useEffect(() => {
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
    setIsWindows(/Win/i.test(ua));
    setIsAndroid(/Android/i.test(ua));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setInstallSuccess(true);
      setTimeout(() => setInstallSuccess(false), 4000);
    };

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandalone(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    try {
      mediaQuery.addEventListener('change', handleMediaChange);
    } catch {
      mediaQuery.addListener(handleMediaChange);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      try {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } catch {
        mediaQuery.removeListener(handleMediaChange);
      }
    };
  }, []);

  // Strict React Hooks Guardrail: Never return before hooks are declared!
  if (isStandalone && !installSuccess) {
    return null;
  }

  return (
    <>
      {!isStandalone && !isInstalled && (
        <button
          id="install-app-btn"
          onClick={handleInstallClick}
          title="Install SmartDine on your device"
          className={`
            inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg
            bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-950/20
            transition-all hover:scale-105 active:scale-95 cursor-pointer border border-emerald-500/30
            ${className}
          `}
        >
          <Download className="h-3.5 w-3.5" />
          <span>Install App</span>
        </button>
      )}

      {/* Success Notification */}
      {installSuccess && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-slide-up border border-emerald-400/40 text-xs font-bold">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-white" />
          <span>SmartDine installed successfully! Launch it anytime from your desktop or home screen.</span>
        </div>
      )}

      {/* Fallback Install Dialog for Browsers without beforeinstallprompt */}
      {showOptionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative text-slate-100">
            <button
              onClick={() => setShowOptionsModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Install SmartDine App</h3>
                <p className="text-[11px] text-slate-400">Run SmartDine like Slack or Discord</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {/* Windows Desktop Direct Option */}
              <button
                onClick={handleDownloadWindows}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <Monitor className="h-4 w-4 text-emerald-400" />
                  <div>
                    <p className="text-xs font-bold text-white">Windows Installer (.exe)</p>
                    <p className="text-[10px] text-slate-400">Tray icon, desktop shortcut, offline mode</p>
                  </div>
                </div>
                <Download className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
              </button>

              {/* Android Direct Option */}
              <button
                onClick={handleDownloadAndroid}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <Smartphone className="h-4 w-4 text-emerald-400" />
                  <div>
                    <p className="text-xs font-bold text-white">Android Mobile App (.apk)</p>
                    <p className="text-[10px] text-slate-400">Waiter & KDS native push notifications</p>
                  </div>
                </div>
                <Download className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 text-center">
              <p className="text-[10px] text-slate-500">
                Or click the <strong>Install</strong> icon in your browser address bar to install as a web app.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
