import React from 'react';

interface SPharmaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  className?: string;
  showText?: boolean;
}

export const SPharmaLogo: React.FC<SPharmaLogoProps> = ({
  size = 'md',
  className = '',
  showText = false,
}) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
    custom: '',
  };

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className={`${sizeMap[size]} shrink-0 rounded-2xl overflow-hidden bg-white p-0.5 shadow-md ring-1 ring-emerald-500/40 flex items-center justify-center`}
      >
        <img
          src="/app-icon.svg"
          alt="S Pharma Logo"
          className="w-full h-full object-contain"
          onError={(e) => {
            // Fallback to generated jpg if svg fails
            const target = e.currentTarget;
            if (target.src !== '/app-icon.jpg') {
              target.src = '/app-icon.jpg';
            }
          }}
        />
      </div>

      {showText && (
        <div className="flex flex-col leading-none select-none">
          <div className="flex items-baseline text-lg font-black tracking-tight text-white">
            <span>s pha</span>
            <span className="text-emerald-400">r</span>
            <span>ma</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider mt-0.5">
            Pharmacy Care
          </span>
        </div>
      )}
    </div>
  );
};
