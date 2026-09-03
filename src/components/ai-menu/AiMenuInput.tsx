'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, FileText, Image as ImageIcon, X, AlertCircle, Sparkles, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

import Link from 'next/link';

interface AiMenuInputProps {
  onAnalyze: (payload: { images: Array<{ base64: string; type: string; name: string }>; textContent: string }) => void;
  isAnalyzing: boolean;
  errorMsg?: string | null;
  onClearError?: () => void;
}

export default function AiMenuInput({ onAnalyze, isAnalyzing, errorMsg: externalError, onClearError }: AiMenuInputProps) {
  const [selectedFiles, setSelectedFiles] = useState<Array<{ id: string; name: string; base64: string; type: string; previewUrl: string }>>([]);
  const [textContent, setTextContent] = useState('');
  const [internalErrorMsg, setInternalErrorMsg] = useState<string | null>(null);

  const errorMsg = externalError || internalErrorMsg;
  const setErrorMsg = (msg: string | null) => {
    setInternalErrorMsg(msg);
    if (!msg && onClearError) onClearError();
  };

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMsg(null);

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/csv', 'text/plain'];
    const newFiles: Array<{ id: string; name: string; base64: string; type: string; previewUrl: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg(`File "${file.name}" exceeds 10MB limit. Please upload a smaller file or photo.`);
        continue;
      }

      if (file.type.startsWith('image/')) {
        const base64 = await fileToBase64(file);
        newFiles.push({
          id: `img_${Date.now()}_${i}`,
          name: file.name,
          base64,
          type: file.type,
          previewUrl: base64
        });
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const text = await file.text();
        setTextContent(prev => prev ? `${prev}\n${text}` : text);
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const base64 = await fileToBase64(file);
        newFiles.push({
          id: `pdf_${Date.now()}_${i}`,
          name: file.name,
          base64,
          type: 'application/pdf',
          previewUrl: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=300'
        });
      } else {
        setErrorMsg(`Format "${file.name.split('.').pop()}" is not supported. Please upload JPG, PNG, PDF or TXT files.`);
      }
    }

    if (newFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleRemoveFile = (id: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleStartAnalysis = () => {
    if (selectedFiles.length === 0 && !textContent) {
      setErrorMsg('Please take a photo or select at least one menu file before analyzing.');
      return;
    }
    onAnalyze({
      images: selectedFiles.map(f => ({ base64: f.base64, type: f.type, name: f.name })),
      textContent
    });
  };

  const handleLoadSampleFixture = () => {
    setErrorMsg(null);
    const sampleBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    setSelectedFiles(prev => [
      ...prev,
      {
        id: `sample_fixture_${Date.now()}`,
        name: 'sample_menu_card.png',
        base64: sampleBase64,
        type: 'image/png',
        previewUrl: sampleBase64
      }
    ]);
    setTextContent(`Starters\nPaneer Tikka ₹240\nCrispy Corn ₹180\n\nMain Course\nButter Chicken ₹360\nDal Makhani ₹260`);
  };

  return (
    <div className="space-y-6">
      {/* Testable Standard File Input & Fixture Loader */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">Select Menu File or Test Fixture</h4>
            <p className="text-[11px] text-slate-500">Upload any JPG, PNG, PDF or TXT menu file directly</p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleLoadSampleFixture}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm shrink-0 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1" /> Load Sample Menu Fixture
          </Button>
        </div>
        <input
          type="file"
          data-testid="smart-menu-file-input"
          id="smart-menu-standard-file-input"
          accept="image/*,.pdf,.txt,.csv"
          onChange={(e) => handleProcessFiles(e.target.files)}
          className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 dark:file:bg-emerald-950 dark:file:text-emerald-300 cursor-pointer"
        />
      </div>

      {/* Hidden File & Camera Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleProcessFiles(e.target.files)}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleProcessFiles(e.target.files)}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.csv"
        className="hidden"
        onChange={(e) => handleProcessFiles(e.target.files)}
      />

      {/* 3 Main Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* A) Take Photo (Direct Mobile Camera) */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="p-6 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-500 text-left transition-all duration-200 group cursor-pointer shadow-sm flex flex-col justify-between h-44"
        >
          <div className="flex items-center justify-between">
            <div className="h-12 w-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <Camera className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-200 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full">
              Mobile Camera
            </span>
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900 dark:text-white text-base">Take Menu Photo</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Photograph physical menu, printed card, or board directly.</p>
          </div>
        </button>

        {/* B) Upload Image */}
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          className="p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 text-left transition-all duration-200 group cursor-pointer shadow-sm flex flex-col justify-between h-44"
        >
          <div className="flex items-center justify-between">
            <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ImageIcon className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Multi-Image
            </span>
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900 dark:text-white text-base">Upload Image Files</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Upload multi-page menu photos (JPG, PNG, WebP).</p>
          </div>
        </button>

        {/* C) Upload Document File */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 text-left transition-all duration-200 group cursor-pointer shadow-sm flex flex-col justify-between h-44"
        >
          <div className="flex items-center justify-between">
            <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileText className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              PDF / TXT
            </span>
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900 dark:text-white text-base">Upload Document</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Parse existing digital menu PDF or text files.</p>
          </div>
        </button>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <h4 className="font-extrabold text-rose-900 dark:text-rose-200 text-sm">Couldn't read this menu image.</h4>
              <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5">{errorMsg}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setErrorMsg(null);
                setSelectedFiles([]);
              }}
              className="text-xs font-bold border-rose-300 text-rose-800 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300 cursor-pointer"
            >
              Try Again
            </Button>
            <Link href="/dashboard/menu">
              <Button
                type="button"
                size="sm"
                className="text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 cursor-pointer"
              >
                Enter Manually
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Selected Files Preview Thumbnails Grid */}
      {selectedFiles.length > 0 && (
        <div className="space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Selected Menu Pages ({selectedFiles.length})
            </h4>
            <button
              type="button"
              onClick={() => setSelectedFiles([])}
              className="text-xs text-rose-600 font-semibold hover:underline cursor-pointer"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {selectedFiles.map((file, index) => (
              <div key={file.id} className="relative group border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 h-28 flex flex-col items-center justify-center p-2">
                {file.type.startsWith('image/') ? (
                  <img src={file.previewUrl} alt={file.name} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-center p-2">
                    <FileText className="h-8 w-8 text-amber-500" />
                    <span className="text-[10px] font-bold truncate max-w-full text-slate-700 dark:text-slate-300">{file.name}</span>
                  </div>
                )}
                <span className="absolute top-1.5 left-1.5 bg-slate-900/80 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                  Page {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(file.id)}
                  className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-90 hover:opacity-100 shadow-md cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sticky / Main Analyze Button */}
      <div className="pt-2">
        <Button
          onClick={handleStartAnalysis}
          isLoading={isAnalyzing}
          disabled={isAnalyzing || (selectedFiles.length === 0 && !textContent)}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-4 rounded-2xl text-base shadow-lg shadow-emerald-600/20 gap-2 cursor-pointer"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              Analyzing Menu with Smart Menu Vision...
            </>
          ) : (
            <>
              Analyze Menu with Smart Menu AI ({selectedFiles.length} Pages)
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
