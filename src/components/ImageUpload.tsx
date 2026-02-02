import React, { useRef, useState } from 'react';

interface ImageUploadProps {
  label: string;
  sublabel?: string;
  onImageSelected: (file: File) => void;
  selectedFile: File | null;
  accept?: string;
  previewUrl?: string | null;
  locked?: boolean;
  heightClass?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  label,
  sublabel,
  onImageSelected,
  selectedFile,
  accept = "image/*",
  previewUrl,
  locked = false,
  heightClass = "h-48"
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageSelected(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!locked) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!locked && e.dataTransfer.files && e.dataTransfer.files[0]) {
      onImageSelected(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
    if (!locked) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-bold uppercase tracking-wide text-vb-dark">{label}</label>
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative group border-2 border-dashed transition-all duration-200 ease-in-out
          ${heightClass} flex flex-col items-center justify-center text-center overflow-hidden
          ${locked ? 'cursor-default border-gray-200 bg-gray-50' : 'cursor-pointer'}
          ${!locked && isDragging 
            ? 'border-vb-blue bg-blue-50' 
            : !locked ? 'border-gray-300 hover:border-vb-dark hover:bg-white' : ''
          }
          bg-white
        `}
        style={{
           backgroundImage: !locked && (selectedFile || previewUrl) ? `
             linear-gradient(45deg, #f0f0f0 25%, transparent 25%), 
             linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), 
             linear-gradient(45deg, transparent 75%, #f0f0f0 75%), 
             linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)
           ` : undefined,
           backgroundSize: '20px 20px',
           backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={accept}
          className="hidden"
          disabled={locked}
        />

        {previewUrl ? (
          <img 
            src={previewUrl} 
            alt="Preview" 
            className={`absolute inset-0 w-full h-full object-contain p-2 transition-opacity ${locked ? 'opacity-100 object-cover p-0' : 'opacity-100 group-hover:opacity-40'}`}
          />
        ) : selectedFile ? (
           <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gray-50/90">
             <p className="text-gray-700 truncate px-4 font-medium">{selectedFile.name}</p>
           </div>
        ) : null}

        <div className="relative z-10 flex flex-col items-center gap-3 pointer-events-none">
          {!selectedFile && !previewUrl && (
            <>
              {locked ? (
                 <div className="text-gray-400 font-medium">Loading default...</div>
              ) : (
                <>
                  <svg className="w-10 h-10 text-gray-400 group-hover:text-vb-dark transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div className="text-sm text-gray-500">
                    <span className="font-bold text-vb-dark underline decoration-1 underline-offset-2">Click to upload</span> or drag and drop
                  </div>
                  {sublabel && <div className="text-xs text-gray-400 max-w-[220px] leading-tight">{sublabel}</div>}
                </>
              )}
            </>
          )}
          {(selectedFile || previewUrl) && (
            <div className={`px-3 py-1 text-xs font-bold uppercase tracking-wider shadow-sm ${locked ? 'bg-gray-200 text-gray-600' : 'bg-vb-dark text-white'}`}>
              {locked ? 'Default Model' : 'Change Image'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};