import React from 'react';

/**
 * Login-page illustration (flat style, blue palette): a person relaxing on a bean bag with a
 * tablet, a large phone showing the CRM (students, fee installments), a window, a plant and a cat.
 * Pure SVG, no external assets.
 */
export const CrmIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 560 470" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Person managing students and fees on the Srikara CRM">
    {/* floor */}
    <ellipse cx="270" cy="420" rx="250" ry="42" fill="white" fillOpacity="0.95" />
    <ellipse cx="270" cy="420" rx="250" ry="42" fill="#DBEAFE" fillOpacity="0.35" />

    {/* arched window */}
    <g>
      <path d="M40 210 V95 a55 55 0 0 1 110 0 V210 Z" fill="white" fillOpacity="0.95" />
      <path d="M52 200 V97 a43 43 0 0 1 86 0 V200 Z" fill="#EFF6FF" />
      <path d="M95 54 V200 M52 128 H138" stroke="white" strokeWidth="6" />
      <rect x="34" y="208" width="122" height="10" rx="3" fill="white" />
    </g>

    {/* floating boxes (top right) */}
    <g transform="translate(468 58) rotate(12)">
      <rect width="46" height="32" rx="4" fill="white" />
      <path d="M0 10 H46" stroke="#BFDBFE" strokeWidth="3" />
      <rect x="18" y="0" width="10" height="32" fill="#DBEAFE" />
    </g>
    <g transform="translate(500 104) rotate(-8)">
      <rect width="34" height="24" rx="4" fill="white" fillOpacity="0.9" />
      <rect x="12" y="0" width="9" height="24" fill="#DBEAFE" />
    </g>

    {/* profile card behind phone */}
    <g transform="rotate(-6 210 170)">
      <rect x="150" y="70" width="150" height="190" rx="16" fill="#1E3A8A" />
      <rect x="160" y="82" width="130" height="166" rx="10" fill="#3B82F6" fillOpacity="0.35" />
      <circle cx="225" cy="135" r="26" fill="white" fillOpacity="0.95" />
      <circle cx="225" cy="128" r="9" fill="#2563EB" />
      <path d="M210 150 c4-11 26-11 30 0" fill="#2563EB" />
      <rect x="185" y="175" width="80" height="8" rx="4" fill="white" fillOpacity="0.9" />
      <rect x="195" y="191" width="60" height="6" rx="3" fill="white" fillOpacity="0.55" />
      <rect x="180" y="212" width="90" height="18" rx="9" fill="white" />
      <rect x="205" y="218" width="40" height="6" rx="3" fill="#2563EB" />
    </g>

    {/* big phone */}
    <g>
      <rect x="262" y="30" width="190" height="370" rx="26" fill="#0F172A" />
      <rect x="272" y="42" width="170" height="346" rx="18" fill="white" />
      <rect x="332" y="48" width="50" height="7" rx="3.5" fill="#0F172A" />
      {/* header */}
      <rect x="272" y="62" width="170" height="44" fill="#2563EB" />
      <rect x="286" y="76" width="70" height="7" rx="3.5" fill="white" />
      <rect x="286" y="89" width="44" height="5" rx="2.5" fill="#BFDBFE" />
      <circle cx="420" cy="84" r="11" fill="white" fillOpacity="0.25" />
      {/* KPI chips */}
      <rect x="284" y="118" width="70" height="44" rx="10" fill="#EFF6FF" />
      <text x="292" y="135" fontSize="8" fill="#64748B" fontFamily="system-ui, sans-serif">Students</text>
      <text x="292" y="153" fontSize="15" fontWeight="700" fill="#1E3A8A" fontFamily="system-ui, sans-serif">248</text>
      <rect x="362" y="118" width="70" height="44" rx="10" fill="#EFF6FF" />
      <text x="370" y="135" fontSize="8" fill="#64748B" fontFamily="system-ui, sans-serif">Collected</text>
      <text x="370" y="153" fontSize="15" fontWeight="700" fill="#1E3A8A" fontFamily="system-ui, sans-serif">₹8.4L</text>
      {/* chart */}
      <rect x="284" y="172" width="148" height="76" rx="10" fill="#F8FAFC" />
      <rect x="296" y="218" width="12" height="20" rx="3" fill="#BFDBFE" />
      <rect x="315" y="204" width="12" height="34" rx="3" fill="#93C5FD" />
      <rect x="334" y="210" width="12" height="28" rx="3" fill="#60A5FA" />
      <rect x="353" y="192" width="12" height="46" rx="3" fill="#3B82F6" />
      <rect x="372" y="198" width="12" height="40" rx="3" fill="#2563EB" />
      <rect x="391" y="184" width="12" height="54" rx="3" fill="#1D4ED8" />
      <rect x="410" y="190" width="12" height="48" rx="3" fill="#1E40AF" />
      {/* installment rows */}
      <text x="286" y="268" fontSize="9" fontWeight="700" fill="#1E3A8A" fontFamily="system-ui, sans-serif">Installments</text>
      <g>
        <rect x="284" y="276" width="148" height="28" rx="8" fill="#F8FAFC" />
        <circle cx="298" cy="290" r="6" fill="#22C55E" />
        <rect x="310" y="285" width="56" height="5" rx="2.5" fill="#94A3B8" />
        <rect x="310" y="294" width="34" height="4" rx="2" fill="#CBD5E1" />
        <rect x="394" y="284" width="30" height="12" rx="6" fill="#DCFCE7" />
      </g>
      <g>
        <rect x="284" y="310" width="148" height="28" rx="8" fill="#F8FAFC" />
        <circle cx="298" cy="324" r="6" fill="#22C55E" />
        <rect x="310" y="319" width="50" height="5" rx="2.5" fill="#94A3B8" />
        <rect x="310" y="328" width="30" height="4" rx="2" fill="#CBD5E1" />
        <rect x="394" y="318" width="30" height="12" rx="6" fill="#DCFCE7" />
      </g>
      <g>
        <rect x="284" y="344" width="148" height="28" rx="8" fill="#F8FAFC" />
        <circle cx="298" cy="358" r="6" fill="#F59E0B" />
        <rect x="310" y="353" width="58" height="5" rx="2.5" fill="#94A3B8" />
        <rect x="310" y="362" width="36" height="4" rx="2" fill="#CBD5E1" />
        <rect x="394" y="352" width="30" height="12" rx="6" fill="#FEF3C7" />
      </g>
    </g>

    {/* notification bubble */}
    <g>
      <rect x="430" y="150" width="112" height="46" rx="12" fill="white" />
      <circle cx="451" cy="173" r="11" fill="#DBEAFE" />
      <path d="M446 173 l4 4 l7-8" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="468" y="164" width="60" height="6" rx="3" fill="#1E3A8A" />
      <rect x="468" y="176" width="42" height="5" rx="2.5" fill="#93C5FD" />
    </g>

    {/* plant */}
    <g>
      <path d="M492 418 h40 l-6 -44 h-28 z" fill="white" />
      <path d="M498 374 h28 l-1 8 h-26 z" fill="#DBEAFE" />
      <path d="M512 374 C510 340 488 330 478 300 C500 310 514 330 512 374" fill="#1D4ED8" />
      <path d="M512 374 C514 330 530 316 548 296 C546 326 528 346 512 374" fill="#2563EB" />
      <path d="M512 374 C506 350 494 352 482 344 C498 340 510 352 512 374" fill="#3B82F6" />
    </g>

    {/* bean bag */}
    <path d="M70 410 C50 360 80 300 150 292 C210 286 262 318 268 368 C272 400 250 420 170 422 C110 424 78 420 70 410 Z" fill="#60A5FA" />
    <path d="M90 404 C80 370 104 324 152 318 C200 312 238 340 244 374 C248 398 228 410 168 412 C124 413 96 410 90 404 Z" fill="#93C5FD" fillOpacity="0.55" />

    {/* person */}
    <g>
      {/* back leg */}
      <path d="M170 360 C200 352 222 350 236 352 L262 400" stroke="#334155" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" />
      {/* front leg */}
      <path d="M160 352 C196 340 226 336 244 340 L276 392" stroke="#475569" strokeWidth="21" strokeLinecap="round" strokeLinejoin="round" />
      {/* shoes */}
      <path d="M252 400 h26 a8 8 0 0 1 0 16 h-30 z" fill="white" />
      <path d="M266 392 h26 a8 8 0 0 1 0 16 h-30 z" fill="white" />
      <path d="M252 412 h34 M266 404 h34" stroke="#94A3B8" strokeWidth="2" />
      {/* torso */}
      <path d="M128 270 C140 252 172 246 186 258 C200 272 202 320 196 352 L150 360 C134 340 120 300 128 270 Z" fill="#1E40AF" />
      <path d="M150 262 C160 280 170 284 182 262" stroke="#93C5FD" strokeWidth="3" strokeLinecap="round" />
      {/* neck + head */}
      <rect x="152" y="236" width="18" height="22" rx="6" fill="#B8774A" />
      <circle cx="162" cy="222" r="22" fill="#C68B5E" />
      <path d="M140 222 C136 196 160 186 176 194 C190 200 188 214 184 218 C176 210 162 212 154 220 C150 230 146 232 140 222 Z" fill="#1F2937" />
      <circle cx="173" cy="224" r="2" fill="#1F2937" />
      <path d="M170 234 q5 3 9 -1" stroke="#7C4A2A" strokeWidth="1.8" strokeLinecap="round" />
      {/* tablet */}
      <g transform="rotate(-18 228 290)">
        <rect x="200" y="268" width="58" height="40" rx="6" fill="#0F172A" />
        <rect x="204" y="272" width="50" height="32" rx="3" fill="#DBEAFE" />
        <rect x="208" y="277" width="24" height="4" rx="2" fill="#2563EB" />
        <rect x="208" y="285" width="38" height="3" rx="1.5" fill="#93C5FD" />
        <rect x="208" y="292" width="30" height="3" rx="1.5" fill="#93C5FD" />
      </g>
      {/* arms */}
      <path d="M182 270 C196 292 204 306 214 304" stroke="#1E40AF" strokeWidth="16" strokeLinecap="round" />
      <path d="M140 286 C150 310 178 316 206 300" stroke="#1D4ED8" strokeWidth="16" strokeLinecap="round" />
      <circle cx="214" cy="302" r="8" fill="#C68B5E" />
      <circle cx="208" cy="298" r="7" fill="#B8774A" />
    </g>

    {/* cat */}
    <g fill="#1E293B">
      <ellipse cx="338" cy="410" rx="30" ry="14" />
      <circle cx="362" cy="396" r="12" />
      <path d="M354 388 l3 -12 l6 9 z M366 386 l6 -10 l2 12 z" />
      <path d="M310 410 C290 410 288 392 300 388" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" fill="none" />
      <circle cx="366" cy="395" r="1.6" fill="#FDE68A" />
    </g>
  </svg>
);
