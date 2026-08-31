/**
 * Loud Bell Sound Alert Utility for Web KDS & Web Waiter
 * Uses HTML5 Audio and Web Audio API with gain boost for loud alert sound.
 */

let globalAudioCtx: AudioContext | null = null;
let audioBuffer: AudioBuffer | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let isUnlocked = false;
let isLoadingBuffer = false;
let fallbackAudio: HTMLAudioElement | null = null;

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
        // Will unlock on first user click/tap
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

export function playLoudBell(type: 'kitchen' | 'waiter' = 'kitchen'): void {
  if (typeof window === 'undefined') return;

  stopLoudBell(); // Stop any currently playing bell instance

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

      // Gain boost node for loud audible bell
      const gainNode = globalAudioCtx.createGain();
      gainNode.gain.value = type === 'kitchen' ? 1.5 : 1.2;

      source.connect(gainNode);
      gainNode.connect(globalAudioCtx.destination);

      source.start(0);
      currentSource = source;
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
    fallbackAudio.play().catch(e => {
      console.warn('[soundAlert] HTMLAudioElement play blocked:', e?.message);
    });
  } catch (e) {
    console.error('[soundAlert] playLoudBell failed:', e);
  }
}

export function stopLoudBell(): void {
  if (currentSource) {
    try {
      currentSource.stop();
      currentSource.disconnect();
    } catch (e) {}
    currentSource = null;
  }
  if (fallbackAudio) {
    try {
      fallbackAudio.pause();
      fallbackAudio.currentTime = 0;
    } catch (e) {}
  }
}

export function isAudioUnlocked(): boolean {
  return isUnlocked;
}
