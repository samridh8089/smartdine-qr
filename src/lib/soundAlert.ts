/**
 * Smart Loud Bell Alert Utility for Web KDS, Web Waiter, & Owner Dashboard
 * Features:
 * - Anti-Fatigue / Anti-Spam Queue Cooldown: Prevents endless ringing when multiple orders arrive in rapid succession.
 * - Sensible Alert Duration: Rings for 5 seconds (~1-2 clear chime cycles), not 28 seconds continuous loop.
 * - DynamicsCompressor + Gain boost for loud, punchy, unclipped alert volume.
 * - Central mute state synchronization across tabs & components.
 * - Realtime Ringing state broadcaster (cleverops-bell-state-changed) for instant 1-tap "Silence Bell" UI.
 * - Immediate stop on chef / waiter screen interaction.
 */

let globalAudioCtx: AudioContext | null = null;
let audioBuffer: AudioBuffer | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let isUnlocked = false;
let isLoadingBuffer = false;
let fallbackAudio: HTMLAudioElement | null = null;
let autoStopTimer: any = null;
let isMutedState = false;
let isCurrentlyRinging = false;

// Per-role timestamps for smart burst cooldown
const lastAlertTimestamps: Record<string, number> = {
  kitchen: 0,
  waiter: 0,
  owner: 0
};

export const DEFAULT_ALERT_DURATION_MS = 5000; // 5s chime (1-2 clear cycles), never 28s endless loop
export const DEFAULT_ALERT_COOLDOWN_MS = 15000; // 15s cooldown per role so queue bursts don't ring repeatedly

export interface PlayBellOptions {
  force?: boolean;
  cooldownMs?: number;
  durationMs?: number;
}

// Initialize mute state from localStorage if available
if (typeof window !== 'undefined') {
  try {
    isMutedState = localStorage.getItem('cleverops_bell_muted') === 'true';
    window.addEventListener('stop-kitchen-sound', () => stopLoudBell());
    window.addEventListener('stop-waiter-sound', () => stopLoudBell());
    window.addEventListener('stop-all-sounds', () => stopLoudBell());
  } catch (_) {}
}

function notifyBellState(isRinging: boolean, type?: string) {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('cleverops-bell-state-changed', {
        detail: { isRinging, type: type || 'general' }
      }));
    } catch (_) {}
  }
}

export function setGlobalMute(muted: boolean): void {
  isMutedState = muted;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('cleverops_bell_muted', muted ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('cleverops-bell-mute-changed', { detail: { muted } }));
    } catch (_) {}
  }
  if (muted) {
    stopLoudBell();
  }
}

export function isGloballyMuted(): boolean {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('cleverops_bell_muted');
      if (stored !== null) {
        isMutedState = stored === 'true';
      }
    } catch (_) {}
  }
  return isMutedState;
}

export function isBellRinging(): boolean {
  return isCurrentlyRinging;
}

export function unlockAudio(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    if (!globalAudioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        globalAudioCtx = new AudioCtx();
      }
    }

    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume();
    }

    if (!fallbackAudio) {
      fallbackAudio = new Audio('/sounds/order_tune.mp3');
      fallbackAudio.preload = 'auto';
    }

    // Gentle silent unlock attempt
    fallbackAudio.volume = 0.01;
    const playPromise = fallbackAudio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        if (fallbackAudio) {
          fallbackAudio.pause();
          fallbackAudio.currentTime = 0;
          fallbackAudio.volume = 1.0;
        }
        isUnlocked = true;
      }).catch(() => {
        // Will unlock on user click/tap
      });
    }

    isUnlocked = true;
    preloadAudioBuffer();
    return true;
  } catch (e) {
    console.warn('[soundAlert] unlockAudio warning:', e);
    return false;
  }
}

async function preloadAudioBuffer() {
  if (audioBuffer || isLoadingBuffer || typeof window === 'undefined') return;
  isLoadingBuffer = true;
  try {
    const res = await fetch('/sounds/order_tune.mp3');
    const arrayBuf = await res.arrayBuffer();
    if (globalAudioCtx) {
      audioBuffer = await globalAudioCtx.decodeAudioData(arrayBuf);
    }
  } catch (e) {
    console.warn('[soundAlert] Audio decode warning:', e);
  } finally {
    isLoadingBuffer = false;
  }
}

export function playLoudBell(
  type: 'kitchen' | 'waiter' | 'owner' = 'kitchen',
  options?: PlayBellOptions
): void {
  if (typeof window === 'undefined') return;

  // STRICT GUARD: If globally muted by Owner/KDS, do not play any sound!
  if (isGloballyMuted()) {
    console.log('[soundAlert] Sound skipped: Bell alerts are currently muted');
    return;
  }

  const now = Date.now();
  const cooldown = options?.cooldownMs ?? DEFAULT_ALERT_COOLDOWN_MS;
  const duration = options?.durationMs ?? DEFAULT_ALERT_DURATION_MS;

  // Smart Cooldown Guard:
  // If an alert is already actively playing, or was triggered within the cooldown window for this role, coalesce it!
  const lastPlay = lastAlertTimestamps[type] || 0;
  const elapsed = now - lastPlay;
  if (!options?.force && (elapsed < cooldown || isCurrentlyRinging)) {
    console.log(`[soundAlert] Coalescing burst alert for ${type} (last played ${Math.round(elapsed / 1000)}s ago, cooldown ${cooldown / 1000}s, ringing: ${isCurrentlyRinging})`);
    return;
  }

  lastAlertTimestamps[type] = now;
  isCurrentlyRinging = true;
  notifyBellState(true, type);

  // Stop any previous sound cleanly without firing stop notification
  stopLoudBellInternal(false);

  if (!isUnlocked) {
    unlockAudio();
  }

  try {
    if (globalAudioCtx && audioBuffer) {
      if (globalAudioCtx.state === 'suspended') {
        globalAudioCtx.resume();
      }
      const source = globalAudioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = true;

      // Dynamics Compressor to maximize loudness and prevent distortion
      const compressor = globalAudioCtx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-24, globalAudioCtx.currentTime);
      compressor.knee.setValueAtTime(30, globalAudioCtx.currentTime);
      compressor.ratio.setValueAtTime(12, globalAudioCtx.currentTime);
      compressor.attack.setValueAtTime(0.003, globalAudioCtx.currentTime);
      compressor.release.setValueAtTime(0.25, globalAudioCtx.currentTime);

      // Boosted gain for clear, audible kitchen and waiter ringtone
      const gainNode = globalAudioCtx.createGain();
      gainNode.gain.value = type === 'kitchen' ? 2.8 : 2.4;

      source.connect(compressor);
      compressor.connect(gainNode);
      gainNode.connect(globalAudioCtx.destination);

      source.start(0);
      currentSource = source;

      // Auto-stop after 5 seconds (~1-2 loud chimes) so it does NOT ring continuously
      if (autoStopTimer) clearTimeout(autoStopTimer);
      autoStopTimer = setTimeout(() => {
        stopLoudBell();
      }, duration);

      source.onended = () => {
        if (currentSource === source) {
          currentSource = null;
          isCurrentlyRinging = false;
          notifyBellState(false, type);
        }
      };
      return;
    }
  } catch (e) {
    console.warn('[soundAlert] WebAudio play error, falling back to HTMLAudioElement:', e);
  }

  // Fallback to HTMLAudioElement
  try {
    if (!fallbackAudio) {
      fallbackAudio = new Audio('/sounds/order_tune.mp3');
    }
    fallbackAudio.currentTime = 0;
    fallbackAudio.volume = 1.0;
    fallbackAudio.loop = true;
    fallbackAudio.play().catch(e => {
      console.warn('[soundAlert] HTMLAudioElement play blocked:', e?.message);
    });

    if (autoStopTimer) clearTimeout(autoStopTimer);
    autoStopTimer = setTimeout(() => {
      stopLoudBell();
    }, duration);
  } catch (e) {
    console.error('[soundAlert] playLoudBell failed:', e);
    isCurrentlyRinging = false;
    notifyBellState(false, type);
  }
}

function stopLoudBellInternal(shouldNotify = true): void {
  if (autoStopTimer) {
    clearTimeout(autoStopTimer);
    autoStopTimer = null;
  }
  if (currentSource) {
    try {
      currentSource.stop();
      currentSource.disconnect();
    } catch (_) {}
    currentSource = null;
  }
  if (fallbackAudio) {
    try {
      fallbackAudio.pause();
      fallbackAudio.currentTime = 0;
    } catch (_) {}
  }
  isCurrentlyRinging = false;
  if (shouldNotify) {
    notifyBellState(false);
  }
}

export function stopLoudBell(): void {
  stopLoudBellInternal(true);
}
