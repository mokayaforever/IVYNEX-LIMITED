export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 29.5C21.6569 29.5 23 28.1569 23 26.5C23 24.8431 21.6569 23.5 20 23.5C18.3431 23.5 17 24.8431 17 26.5C17 28.1569 18.3431 29.5 20 29.5Z" fill="url(#ivynex-g1)" />
      <path d="M13.5 20.5C16 18 19 17 20 17C21 17 24 18 26.5 20.5" stroke="url(#ivynex-g1)" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M8 14.5C12.5 10.2 16 9 20 9C24 9 27.5 10.2 32 14.5" stroke="url(#ivynex-g1)" strokeWidth="2.6" strokeLinecap="round" opacity="0.55" />
      <defs>
        <linearGradient id="ivynex-g1" x1="8" y1="9" x2="32" y2="29.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00C2A8" />
          <stop offset="1" stopColor="#FFB020" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function BrandName() {
  return (
    <span className="brand-name">
      IVYNEX<span className="brand-accent"> WIFI</span>
    </span>
  );
}
