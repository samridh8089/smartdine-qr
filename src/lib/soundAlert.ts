/**
 * Loud Bell Sound Alert Utility for Web KDS, Web Waiter, & Owner Dashboard
 * Features:
 * - DynamicsCompressor + Gain boost for loud, punchy, unclipped alert volume
 * - Continuous looping ring with 28s auto-timeout (~8 loud chime cycles) so alerts aren't missed
 * - Central mute state synchronization across tabs & components
 * - Immediate stop & mute controls
 */

let globalAudioCtx: AudioContext | null = null;
let audioBuffer: AudioBuffer | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let isUnlocked = false;
let isLoadingBuffer = false;
let fallbackAudio: HTMLAudioElement | null = null;
let autoStopTimer: any = null;
let isMutedState = false;

// Initialize mute state from localStorage if available
if (typeof window !== 'undefined') {
  try {
    isMutedState = localStorage.getItem('cleverops_bell_muted') === 'true';
    window.addEventListener('stop-kitchen-sound', () => stopLoudBell());
    window.addEventListener('stop-waiter-sound', () => stopLoudBell());
    window.addEventListener('stop-all-sounds', () => stopLoudBell());
  } catch (_) {}
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

export function playLoudBell(type: 'kitchen' | 'waiter' | 'owner' = 'kitchen'): void {
  if (typeof window === 'undefined') return;

  // STRICT GUARD: If globally muted by Owner/KDS, do not play any sound!
  if (isGloballyMuted()) {
    console.log('[soundAlert] Sound skipped: Bell alerts are currently muted');
    return;
  }

  stopLoudBell(); // Stop any currently playing instance

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
      // Loop the audio so it rings continuously until dismissed (not just 3 times)
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

      // Auto-stop after 28 seconds (~7-8 loud chimes) if nobody acknowledges it
      if (autoStopTimer) clearTimeout(autoStopTimer);
      autoStopTimer = setTimeout(() => {
        stopLoudBell();
      }, 28000);

      source.onended = () => {
        if (currentSource === source) {
          currentSource = null;
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
    }, 28000);
  } catch (e) {
    console.error('[soundAlert] playLoudBell failed:', e);
  }
}

export function stopLoudBell(): void {
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
}

export function isAudioUnlocked(): boolean {
  return isUnlocked;
}
