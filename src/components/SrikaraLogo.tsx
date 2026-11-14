import React from 'react';

/**
 * Official Srikara Training & Placement Academy logo (the real artwork, from /public).
 *  - variant "horizontal" | "full": shield + SRIKARA wordmark   -> /srikara-logo.png
 *  - variant "icon":                shield emblem only           -> /srikara-emblem.png
 * The artwork has a white background, so on a coloured surface pass theme="dark"
 * and it is placed on a white rounded plate.
 */
interface SrikaraLogoProps {
  variant?: 'icon' | 'horizontal' | 'full';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  theme?: 'light' | 'dark';
}

// Height in px per size
const LOGO_HEIGHT = { sm: 40, md: 56, lg: 80, xl: 112 };
const ICON_HEIGHT = { sm: 36, md: 48, lg: 72, xl: 110 };

export const SrikaraLogo: React.FC<SrikaraLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  className = '',
  theme = 'light'
}) => {
  const isIcon = variant === 'icon';
  const height = isIcon ? ICON_HEIGHT[size] : LOGO_HEIGHT[size];

  const img = (
    <img
      src={isIcon ? '/srikara-emblem.png' : '/srikara-logo.png'}
      alt="Srikara Training and Placement Academy"
      style={{ height, width: 'auto' }}
      className="block select-none object-contain"
      draggable={false}
    />
  );

  if (theme === 'dark') {
    return (
      <div className={`inline-flex items-center rounded-xl bg-white px-2.5 py-1.5 shadow-sm ${className}`}>
        {img}
      </div>
    );
  }
  return <div className={`inline-flex items-center ${className}`}>{img}</div>;
};

export default SrikaraLogo;
