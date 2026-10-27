'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Check, X, AlertCircle, Upload, SwitchCamera } from 'lucide-react';

interface SelfieCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (selfieDataUrl: string) => void;
}

export default function SelfieCaptureModal({
  isOpen,
  onClose,
  onCapture
}: SelfieCaptureModalProps) {
  // 1. useState
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedSizeKb, setCapturedSizeKb] = useState<number | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // 2. useRef
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 3. useEffect: Start camera when modal opens or facing mode toggles
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let isCancelled = false;

    async function startCamera() {
      if (!isOpen || capturedImage) return;
      setCameraLoading(true);
      setCameraError(null);

      // Stop any existing stream before starting a new one
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      try {
        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error('Camera API is not supported on this browser/device.');
        }

        let mediaStream: MediaStream | null = null;

        // Try exact facingMode constraint first for guaranteed front camera
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { exact: facingMode },
              width: { ideal: 640 },
              height: { ideal: 640 }
            },
            audio: false
          });
        } catch (exactErr) {
          // Fallback to relaxed facingMode constraint
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: facingMode,
              width: { ideal: 640 },
              height: { ideal: 640 }
            },
            audio: false
          });
        }

        if (isCancelled) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        activeStream = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }
      } catch (err: any) {
        if (isCancelled) return;
        console.warn('Failed to access camera:', err);
        setCameraError(
          err?.message || 'Unable to access front camera. Please allow camera permissions or upload a selfie below.'
        );
      } finally {
        if (!isCancelled) {
          setCameraLoading(false);
        }
      }
    }

    if (isOpen && !capturedImage) {
      startCamera();
    }

    return () => {
      isCancelled = true;
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, capturedImage, facingMode]);

  // Clean up stream when closing
  useEffect(() => {
    if (!isOpen) {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      setCapturedImage(null);
      setCapturedSizeKb(null);
      setCameraError(null);
      setFacingMode('user');
    }
  }, [isOpen]);

  // Conditional early return AFTER all hooks
  if (!isOpen) return null;

  const handleSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');

    const srcWidth = video.videoWidth || 480;
    const srcHeight = video.videoHeight || 480;

    // Center-crop to 1:1 square & downscale to 240x240 for ultra-low KB storage
    const TARGET_SIZE = 240;
    canvas.width = TARGET_SIZE;
    canvas.height = TARGET_SIZE;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const minDim = Math.min(srcWidth, srcHeight);
    const sx = (srcWidth - minDim) / 2;
    const sy = (srcHeight - minDim) / 2;

    // Only mirror horizontally when front camera is active
    if (facingMode === 'user') {
      ctx.translate(TARGET_SIZE, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, sx, sy, minDim, minDim, 0, 0, TARGET_SIZE, TARGET_SIZE);

    // Highly compressed JPEG at 0.55 quality (< 15-20 KB)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.55);
    const sizeKb = Math.round(((dataUrl.length * 0.75) / 1024) * 10) / 10;
    setCapturedSizeKb(sizeKb);
    setCapturedImage(dataUrl);

    // Stop active camera stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedSizeKb(null);
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  const handleToggleCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current || document.createElement('canvas');
          const TARGET_SIZE = 240;
          canvas.width = TARGET_SIZE;
          canvas.height = TARGET_SIZE;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;

          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, TARGET_SIZE, TARGET_SIZE);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.55);
          const sizeKb = Math.round(((compressedDataUrl.length * 0.75) / 1024) * 10) / 10;
          setCapturedSizeKb(sizeKb);
          setCapturedImage(compressedDataUrl);
        };
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden text-slate-900 dark:text-slate-100 flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">
            Selfie Attendance Verification
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder Canvas */}
        <div className="p-5 flex flex-col items-center">
          <div className="relative w-60 h-60 sm:w-64 sm:h-64 aspect-square rounded-full overflow-hidden border-4 border-slate-700 shadow-inner bg-slate-900 flex items-center justify-center">
            {capturedImage ? (
              <img
                src={capturedImage}
                alt="Captured Selfie"
                className="w-full h-full object-cover"
              />
            ) : cameraError ? (
              <div className="p-4 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-[11px] text-slate-300 leading-tight">
                  {cameraError}
                </p>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transform ${
                    facingMode === 'user' ? '-scale-x-100' : 'scale-x-100'
                  }`}
                />
                {cameraLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
                    <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
                  </div>
                )}
                {/* Face Guide Overlay Ring */}
                <div className="absolute inset-3 border-2 border-dashed border-slate-500/50 rounded-full pointer-events-none" />

                {/* Camera Flip Switch Button */}
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  disabled={cameraLoading}
                  className="absolute bottom-3 right-3 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full shadow-md cursor-pointer transition border border-slate-700/80 active:scale-95"
                  title="Switch Front/Rear Camera"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 text-center">
            {capturedImage
              ? 'Selfie captured! Click Confirm to punch in.'
              : 'Fit your face inside the circle and click Capture.'}
          </p>

          {capturedImage && capturedSizeKb !== null && (
            <div className="mt-1.5 flex items-center justify-center">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60 shadow-2xs">
                Ultra-Light Selfie: {capturedSizeKb} KB
              </span>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleFileUpload}
            className="hidden"
          />

          <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-2 mb-1 select-none">
            DPDP Notice: Selfie is captured solely to verify shift attendance and is securely pruned periodically.
          </p>

          {/* Action Buttons */}
          <div className="w-full mt-4 space-y-2">
            {!capturedImage ? (
              <>
                <button
                  type="button"
                  onClick={handleSnap}
                  disabled={!!cameraError || cameraLoading}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center justify-center cursor-pointer transition disabled:opacity-50"
                >
                  Capture Selfie
                </button>

                {cameraError && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center cursor-pointer transition"
                  >
                    Upload Photo from Gallery
                  </button>
                )}
              </>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="flex-1 py-2.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center justify-center cursor-pointer transition"
                >
                  Retake
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center cursor-pointer transition"
                >
                  Confirm & Punch In
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
