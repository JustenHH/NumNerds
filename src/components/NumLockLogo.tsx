import React from 'react';

interface NumLockLogoProps {
  className?: string;
}

export const NumLockLogo: React.FC<NumLockLogoProps> = ({ className = 'h-9 w-9' }) => {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Numlock Nerds NumLock key logo"
    >
      {/* Outer keycap base / skirt */}
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="12"
        fill="#0D111A"
        stroke="#D4A843"
        strokeWidth="2.2"
      />
      {/* Keycap bottom bevel shadow */}
      <rect x="7" y="10" width="50" height="46" rx="9" fill="#070A0F" />
      {/* Raised top keycap face */}
      <rect
        x="8"
        y="7"
        width="48"
        height="44"
        rx="8"
        fill="#161D2B"
        stroke="#334155"
        strokeWidth="1.4"
      />
      {/* Subtle top highlight */}
      <path
        d="M15 8.5H49"
        stroke="#F3D999"
        strokeOpacity="0.45"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* Active NumLock status LED indicator */}
      <circle cx="48" cy="14.5" r="2.6" fill="#34D399" />
      <circle cx="48" cy="14.5" r="4.4" fill="#34D399" fillOpacity="0.22" />

      {/* NUM (crisp vector paths) */}
      {/* N */}
      <path
        d="M15.5 28V18.5L21.5 28V18.5"
        stroke="#F3D999"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* U */}
      <path
        d="M25.5 18.5V24.8C25.5 26.6 26.8 28 28.6 28C30.4 28 31.7 26.6 31.7 24.8V18.5"
        stroke="#F3D999"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* M */}
      <path
        d="M35.7 28V18.5L39.6 24.4L43.5 18.5V28"
        stroke="#F3D999"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* LOCK (crisp vector paths) */}
      {/* L */}
      <path
        d="M15.5 34V42H19.8"
        stroke="#CBD5E1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* O */}
      <rect
        x="22.8"
        y="34"
        width="5.2"
        height="8"
        rx="2.4"
        stroke="#CBD5E1"
        strokeWidth="2"
      />
      {/* C */}
      <path
        d="M36 35.3C35.4 34.5 34.4 34 33.4 34C31.7 34 30.8 35.4 30.8 38C30.8 40.6 31.7 42 33.4 42C34.4 42 35.4 41.5 36 40.7"
        stroke="#CBD5E1"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* K */}
      <path
        d="M39.5 34V42M44.3 34L39.8 38L44.5 42"
        stroke="#CBD5E1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
