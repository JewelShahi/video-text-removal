import React, { useState, useCallback } from 'react';

export default function VideoUploader({ onSelect, uploading }) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      if (uploading) return;
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith('video/')) onSelect(file);
    },
    [onSelect, uploading]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`rounded-2xl border-2 border-dashed backdrop-blur-sm transition-all duration-300 ${
        dragOver
          ? 'border-primary bg-primary/10 scale-[1.01]'
          : 'border-white/10 bg-base-100/40 hover:border-white/20 hover:bg-base-100/60'
      }`}
    >
      <div className="flex flex-col items-center text-center py-12 sm:py-16 px-6">
        <div
          className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 ${
            dragOver ? 'bg-gradient-to-br from-primary to-accent' : 'bg-white/5 border border-white/10'
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-6 w-6 sm:h-7 sm:w-7 transition-colors ${dragOver ? 'text-base-300' : 'text-base-content/50'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
            />
          </svg>
          {dragOver && (
            <span className="absolute inset-0 rounded-2xl bg-primary/40 blur-xl -z-10" />
          )}
        </div>

        <h3 className="font-display text-base sm:text-lg font-semibold">
          {dragOver ? 'Drop it in' : 'Drag & drop a video, or browse'}
        </h3>
        <p className="text-xs sm:text-sm text-base-content/50 mt-1">MP4, MOV, WebM — up to 1GB</p>

        <label
          className={`btn btn-sm sm:btn-md mt-5 border-none gap-2 font-extrabold ${
            uploading
              ? 'text-white pointer-events-none'
              : 'text-black/70 bg-gradient-to-r from-primary to-accent hover:brightness-110'
          }`}
        >
          {uploading && <span className="loading loading-spinner loading-sm" />}
          {uploading ? 'Uploading…' : 'Choose video'}
          <input
            type="file"
            accept="video/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) onSelect(file);
              e.target.value = '';
            }}
          />
        </label>
      </div>
    </div>
  );
}