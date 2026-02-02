import React from 'react';

export const Header: React.FC = () => {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-baseline gap-2">
           <h1 className="text-4xl font-serif font-bold text-vb-text tracking-tight">
            VanVision
          </h1>
          <span className="text-xl font-sans text-vb-dark uppercase tracking-widest font-semibold">
            Roof Visualizer
          </span>
        </div>
      </div>
    </div>
  );
};