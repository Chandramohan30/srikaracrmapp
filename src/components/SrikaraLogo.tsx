import React from 'react';

interface SrikaraLogoProps {
  variant?: 'icon' | 'horizontal' | 'full';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  theme?: 'light' | 'dark';
}

export const SrikaraLogo: React.FC<SrikaraLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  className = '',
  theme = 'light'
}) => {
  // Dimensions
  const iconSizes = {
    sm: { w: 36, h: 40 },
    md: { w: 48, h: 54 },
    lg: { w: 72, h: 80 },
    xl: { w: 110, h: 122 }
  };

  const { w, h } = iconSizes[size];

  // Shield Emblem SVG
  const ShieldEmblem = (
    <svg
      width={w}
      height={h}
      viewBox="0 0 160 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-200"
    >
      {/* 3 Golden Stars on Top */}
      <g fill="#D97706">
        {/* Left Star */}
        <path d="M 58 14 L 60.5 19 L 66 19.8 L 62 23.7 L 62.9 29.2 L 58 26.6 L 53.1 29.2 L 54 23.7 L 50 19.8 L 55.5 19 Z" />
        {/* Center Star (slightly larger) */}
        <path d="M 80 6 L 83.2 12.5 L 90.4 13.5 L 85.2 18.6 L 86.4 25.8 L 80 22.4 L 73.6 25.8 L 74.8 18.6 L 69.6 13.5 L 76.8 12.5 Z" />
        {/* Right Star */}
        <path d="M 102 14 L 104.5 19 L 110 19.8 L 106 23.7 L 106.9 29.2 L 102 26.6 L 97.1 29.2 L 98 23.7 L 94 19.8 L 99.5 19 Z" />
      </g>

      {/* Golden Laurel Wreath (Leaves Left & Right) */}
      <g stroke="#D97706" fill="#D97706" opacity="0.95">
        {/* Left Wreath Leaves */}
        <path d="M 36 65 C 30 70, 24 82, 26 96 C 28 110, 36 122, 50 135 C 44 126, 42 114, 43 102 C 44 90, 48 78, 52 70 Z" fill="#D97706" />
        <ellipse cx="28" cy="80" rx="7" ry="3.5" transform="rotate(-35 28 80)" />
        <ellipse cx="25" cy="95" rx="7" ry="3.5" transform="rotate(-15 25 95)" />
        <ellipse cx="27" cy="110" rx="7.5" ry="3.8" transform="rotate(10 27 110)" />
        <ellipse cx="34" cy="125" rx="7.5" ry="3.8" transform="rotate(35 34 125)" />
        <ellipse cx="46" cy="138" rx="8" ry="4" transform="rotate(55 46 138)" />
        <ellipse cx="62" cy="148" rx="7" ry="3.5" transform="rotate(70 62 148)" />

        {/* Right Wreath Leaves */}
        <path d="M 124 65 C 130 70, 136 82, 134 96 C 132 110, 124 122, 110 135 C 116 126, 118 114, 117 102 C 116 90, 112 78, 108 70 Z" fill="#D97706" />
        <ellipse cx="132" cy="80" rx="7" ry="3.5" transform="rotate(35 132 80)" />
        <ellipse cx="135" cy="95" rx="7" ry="3.5" transform="rotate(15 135 95)" />
        <ellipse cx="133" cy="110" rx="7.5" ry="3.8" transform="rotate(-10 133 110)" />
        <ellipse cx="126" cy="125" rx="7.5" ry="3.8" transform="rotate(-35 126 125)" />
        <ellipse cx="114" cy="138" rx="8" ry="4" transform="rotate(-55 114 138)" />
        <ellipse cx="98" cy="148" rx="7" ry="3.5" transform="rotate(-70 98 148)" />
      </g>

      {/* Main Shield Outline & Shadow */}
      {/* Outer border (Dark Charcoal / Black) */}
      <path
        d="M 80 32 C 110 32, 126 40, 126 40 C 126 78, 120 114, 80 136 C 40 114, 34 78, 34 40 C 34 40, 50 32, 80 32 Z"
        fill="#1E242B"
        stroke="#E2E8F0"
        strokeWidth="2"
      />

      {/* Inner Shield (Divided into 4 quadrants) */}
      <g clipPath="url(#shieldClip)">
        {/* Top-Left Quadrant: Dark Slate/Charcoal #1E242B */}
        <rect x="37" y="34" width="43" height="46" fill="#1E242B" />
        {/* Top-Right Quadrant: Crimson Red #B91C1C */}
        <rect x="80" y="34" width="46" height="46" fill="#B91C1C" />
        {/* Bottom-Left Quadrant: Crimson Red #B91C1C */}
        <rect x="37" y="80" width="43" height="54" fill="#B91C1C" />
        {/* Bottom-Right Quadrant: Dark Slate/Charcoal #1E242B */}
        <rect x="80" y="80" width="46" height="54" fill="#1E242B" />

        {/* Quadrant Divider Lines (White/Silver cross) */}
        <line x1="80" y1="34" x2="80" y2="135" stroke="#FFFFFF" strokeWidth="2.5" />
        <line x1="36" y1="80" x2="124" y2="80" stroke="#FFFFFF" strokeWidth="2.5" />

        {/* 1. Top-Left Icon: Graduation Cap (White) */}
        <g transform="translate(48, 48) scale(0.9)" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="0.8">
          {/* Cap diamond */}
          <polygon points="12,3 23,8 12,13 1,8" fill="#FFFFFF" />
          {/* Cap skull base */}
          <path d="M 6 11 L 6 15 C 6 18, 18 18, 18 15 L 18 11" fill="none" stroke="#FFFFFF" strokeWidth="1.8" />
          {/* Tassel */}
          <path d="M 21 9 L 23 16" stroke="#FFFFFF" strokeWidth="1.5" />
          <circle cx="23" cy="16.5" r="1" fill="#FFFFFF" />
        </g>

        {/* 2. Top-Right Icon: Open Book (White) */}
        <g transform="translate(90, 48) scale(0.85)" fill="#FFFFFF" stroke="#FFFFFF">
          <path d="M 3 6 C 8 4, 12 5, 12 6 C 12 18, 8 17, 3 19 Z" fill="#FFFFFF" opacity="0.95" />
          <path d="M 21 6 C 16 4, 12 5, 12 6 C 12 18, 16 17, 21 19 Z" fill="#FFFFFF" opacity="0.95" />
          <line x1="12" y1="6" x2="12" y2="19" stroke="#B91C1C" strokeWidth="1.2" />
        </g>

        {/* 3. Bottom-Left Icon: Calculator & Invoice/Bill (White) */}
        <g transform="translate(48, 90) scale(0.85)" fill="#FFFFFF" stroke="#FFFFFF">
          {/* Calculator frame */}
          <rect x="3" y="2" width="16" height="20" rx="2" fill="none" stroke="#FFFFFF" strokeWidth="1.8" />
          {/* Screen */}
          <rect x="5.5" y="4.5" width="11" height="4" fill="#FFFFFF" />
          {/* Buttons */}
          <circle cx="7" cy="12" r="1.2" fill="#FFFFFF" />
          <circle cx="11" cy="12" r="1.2" fill="#FFFFFF" />
          <circle cx="15" cy="12" r="1.2" fill="#FFFFFF" />
          <circle cx="7" cy="16" r="1.2" fill="#FFFFFF" />
          <circle cx="11" cy="16" r="1.2" fill="#FFFFFF" />
          <circle cx="15" cy="16" r="1.2" fill="#FFFFFF" />
          <circle cx="7" cy="19" r="1.2" fill="#FFFFFF" />
          <circle cx="11" cy="19" r="1.2" fill="#FFFFFF" />
          <circle cx="15" cy="19" r="1.2" fill="#FFFFFF" />
        </g>

        {/* 4. Bottom-Right Icon: Globe with Meridians (White) */}
        <g transform="translate(90, 90) scale(0.85)" stroke="#FFFFFF" fill="none" strokeWidth="1.6">
          <circle cx="12" cy="12" r="9" />
          <ellipse cx="12" cy="12" rx="4.5" ry="9" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <path d="M 4.5 7.5 C 7 9, 17 9, 19.5 7.5" />
          <path d="M 4.5 16.5 C 7 15, 17 15, 19.5 16.5" />
        </g>
      </g>

      {/* Clip path for shield inner */}
      <defs>
        <clipPath id="shieldClip">
          <path d="M 80 35 C 107 35, 122 42, 122 42 C 122 76, 116 110, 80 131 C 44 110, 38 76, 38 42 C 38 42, 53 35, 80 35 Z" />
        </clipPath>
      </defs>
    </svg>
  );

  if (variant === 'icon') {
    return <div className={`inline-flex items-center justify-center ${className}`}>{ShieldEmblem}</div>;
  }

  if (variant === 'horizontal') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {ShieldEmblem}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-serif tracking-widest text-lg font-white leading-tight">
              SRIKARA
            </span>
            {/* <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 uppercase tracking-wider">
              Academy
            </span> */}
          </div>
          <span className="text-[11px] font-extrabold text-red-700 tracking-wider uppercase leading-none mt-0.5">
            Training & Placement Academy
          </span>
          <span className="text-[9px] text-slate-500 font-medium tracking-tight mt-0.5 hidden sm:inline">
            Technical Courses · Placements
          </span>
        </div>
      </div>
    );
  }

  // Full Variant for Login, Hero, Report & Invoices
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      {ShieldEmblem}
      <div className="mt-3">
        <h1 className="font-serif text-3xl font-black tracking-widest text-slate-900 uppercase">
          SRIKARA
        </h1>
        <h2 className="text-sm font-extrabold tracking-widest text-red-700 uppercase mt-1">
          Training & Placement Academy
        </h2>
        <div className="text-[11px] font-semibold text-slate-700 tracking-wider uppercase mt-1.5">
          Tally | GST | Digital Marketing | Technical Courses
        </div>
        <div className="text-[11px] font-bold text-red-600 tracking-wide mt-1">
          www.srikaraacademy.com
        </div>
      </div>
    </div>
  );
};
