'use client'

export default function LogoFayclick({ className = "w-20 h-20" }: { className?: string }) {
  return (
    <svg 
      className={className}
      viewBox="0 0 200 200" 
      xmlns="http://www.w3.org/2000/svg" 
      role="img" 
      aria-labelledby="logo-title logo-desc"
    >
      <title id="logo-title">Logo FayClick</title>
      <desc id="logo-desc">Logo circulaire avec anneau tricolore du Sénégal et caddie stylisé</desc>

      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00853F"/>
          <stop offset="50%" stopColor="#FCD116"/>
          <stop offset="100%" stopColor="#E31B23"/>
        </linearGradient>

        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.15"/>
        </filter>

        <style>
          {`
            @keyframes ripple {
              0%   { r: 0;   opacity: .8; }
              70%  { r: 18;  opacity: .15; }
              100% { r: 26;  opacity: 0; }
            }
            .pulse { animation: ripple 2.2s ease-out infinite; }
            
            @keyframes twinkle {
              0%,100% { transform: scale(0.9) rotate(0deg); opacity:.9; }
              50%     { transform: scale(1.25) rotate(15deg); opacity:1; }
            }
            .sparkle { transform-origin: center; animation: twinkle 1.8s ease-in-out infinite; }
            
            @keyframes spin360 { to { transform: rotate(360deg); } }
            .spin { transform-origin: 100px 100px; animation: spin360 14s linear infinite; }
            .wheel { transform-origin: center; animation: spin360 4.5s linear infinite; }
            
            @media (prefers-reduced-motion: reduce) {
              .spin, .pulse, .sparkle, .wheel { animation: none !important; }
            }
          `}
        </style>
      </defs>

      <g filter="url(#softShadow)">
        {/* Anneau tricolore */}
        <g className="spin">
          <circle cx="100" cy="100" r="86" fill="none" stroke="url(#ringGrad)" strokeWidth="12" strokeLinecap="round" />
        </g>

        {/* Disque intérieur */}
        <circle cx="100" cy="100" r="72" fill="white" stroke="#e6eef7" strokeWidth="2"/>

        {/* Caddie stylisé */}
        {/* Poignée */}
        <path d="M55 72 L70 88" fill="none" stroke="#0b1220" strokeWidth="6" strokeLinecap="round"/>
        {/* Panier */}
        <rect x="68" y="86" width="64" height="42" rx="10" fill="#0ea5e9" stroke="#0b1220" strokeWidth="2"/>
        {/* Lettres FC dans le panier */}
        <text x="100" y="113" textAnchor="middle" fill="white" fontSize="26" fontWeight="700" letterSpacing="1">FC</text>
        
        {/* Roues */}
        <g className="wheel">
          <circle cx="82" cy="136" r="9" fill="white" stroke="#0b1220" strokeWidth="3"/>
          <circle cx="118" cy="136" r="9" fill="white" stroke="#0b1220" strokeWidth="3"/>
        </g>

        {/* Onde de clic */}
        <circle className="pulse" cx="152" cy="66" r="0" fill="none" stroke="#0ea5e9" strokeWidth="3"/>
        <circle className="pulse" style={{ animationDelay: '.6s' }} cx="152" cy="66" r="0" fill="none" stroke="#22c55e" strokeWidth="2.5"/>
        <circle className="pulse" style={{ animationDelay: '1.2s' }} cx="152" cy="66" r="0" fill="none" stroke="#f59e0b" strokeWidth="2"/>

        {/* Petite étoile étincelante */}
        <polygon 
          className="sparkle" 
          points="152,60 156,66 164,68 158,72 159,79 152,76 145,79 146,72 140,68 148,66"
          fill="#16a34a" 
          opacity="0.95"
        />
      </g>
    </svg>
  );
}