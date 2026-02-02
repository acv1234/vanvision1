import React from 'react';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
  allowOriginal?: boolean;
}

const PRESET_COLORS = [
  '#ffffff', // White
  '#d6d3d1', // Grey
  '#0c0a09', // Black
  '#e7180b', // Red
  '#ff8904', // Orange
  '#ffdf20', // Yellow
  '#9ae630', // Green
  '#1447e6', // Blue
];

export const ColorPicker: React.FC<ColorPickerProps> = ({ 
  color, 
  onChange, 
  label = "Underlayment Color",
  allowOriginal = false
}) => {
  const isCustomColor = !PRESET_COLORS.includes(color) && color !== 'original';

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-bold uppercase tracking-wide text-vb-dark">{label}</label>
      
      <div className="flex flex-wrap gap-2">
        {allowOriginal && (
          <button
            onClick={() => onChange('original')}
            className={`px-3 h-9 border-2 text-xs font-bold uppercase tracking-wide transition-transform hover:scale-105 focus:outline-none flex items-center justify-center bg-white ${
              color === 'original'
                ? 'border-vb-dark ring-2 ring-gray-200 text-vb-dark' 
                : 'border-gray-200 text-gray-500'
            }`}
          >
            Original
          </button>
        )}

        {PRESET_COLORS.map((preset) => {
          const isSelected = color === preset;
          const isLight = preset === '#ffffff';
          
          return (
            <button
              key={preset}
              onClick={() => onChange(preset)}
              className={`w-9 h-9 border-2 transition-transform hover:scale-105 focus:outline-none ${
                isSelected 
                  ? 'border-vb-dark ring-2 ring-gray-200' 
                  : isLight ? 'border-gray-200' : 'border-transparent'
              }`}
              style={{ backgroundColor: preset }}
              aria-label={`Select color ${preset}`}
            />
          );
        })}
        
        <div className="relative group w-9 h-9 transition-transform hover:scale-105">
           <input
            type="color"
            value={isCustomColor ? color : '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-full p-0 border-0 cursor-pointer opacity-0 absolute inset-0 z-10"
            title="Choose custom color"
          />
          <div 
            className={`w-full h-full border-2 flex items-center justify-center overflow-hidden ${
              isCustomColor ? 'border-vb-dark ring-2 ring-gray-200' : 'border-gray-200'
            }`}
            style={{
                background: isCustomColor 
                  ? color 
                  : 'conic-gradient(from 180deg at 50% 50%, #FF0000 0deg, #FFFF00 60deg, #00FF00 120deg, #00FFFF 180deg, #0000FF 240deg, #FF00FF 300deg, #FF0000 360deg)'
            }}
          >
             {!isCustomColor && (
                <div className="w-full h-full bg-white/30 flex items-center justify-center backdrop-blur-[1px]">
                    <span className="text-lg text-gray-800 font-bold leading-none mt-[-2px]">+</span>
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};