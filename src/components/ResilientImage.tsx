import React, { useState } from 'react';
import { Warehouse } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  fallbackTitle: string;
  className?: string;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  fallbackTitle,
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-green-950 text-slate-200 p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Warehouse className="w-8 h-8 text-green-400 mb-3 opacity-80" />
        <p className="font-display text-sm font-semibold tracking-tight text-white">
          {fallbackTitle}
        </p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">{alt}</p>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};
