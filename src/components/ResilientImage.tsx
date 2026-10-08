import React, { useState } from 'react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = '',
  fallbackLabel,
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#0F1F18] via-[#0A130E] to-[#090D0B] text-[#C6A355] p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <svg
          className="w-10 h-10 mb-2 opacity-80"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
        >
          <path d="M12 3c-4.5 0-8 3-8 7 0 3.5 3 5.5 6 6.5s5 2.5 5 4.5c0 1.5-1.5 2-3 2-2 0-3.5-1-4-2.5" />
          <circle cx="12" cy="7" r="1" fill="currentColor" />
        </svg>
        <span className="font-serif-display text-sm text-[#F5F3EE]/85 line-clamp-2">
          {fallbackLabel || alt}
        </span>
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
