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
      className={`card border-2 border-dashed transition-colors ${
        dragOver ? 'border-primary bg-primary/5' : 'border-base-300 bg-base-100'
      }`}
    >
      <div className="card-body items-center text-center py-16">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12 text-base-content/40"
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
        <h3 className="font-semibold text-lg mt-2">Drag & drop a video, or browse</h3>
        <p className="text-sm text-base-content/60">MP4, MOV, WebM — up to 1GB</p>

        <label className={`btn btn-primary mt-4 ${uploading ? 'btn-disabled' : ''}`}>
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
