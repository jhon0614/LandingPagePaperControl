function Logo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 800 350"
      className="logo-svg"
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0080b0" />
          <stop offset="60%" stopColor="#26a99a" />
          <stop offset="100%" stopColor="#7ad080" />
        </linearGradient>
      </defs>

      <g transform="translate(50, 50)">
        <path
          d="M 40,20 L 110,20 A 15,15 0 0 1 125,35 L 125,130 A 15,15 0 0 1 110,145 L 40,145 A 15,15 0 0 1 25,130 L 25,35 A 15,15 0 0 1 40,20 Z"
          fill="none"
          stroke="url(#logo-gradient)"
          strokeWidth="7"
          strokeLinejoin="round"
        />

        <circle
          cx="135"
          cy="135"
          r="28"
          fill="none"
          stroke="url(#logo-gradient)"
          strokeWidth="7"
        />

        <line
          x1="155"
          y1="155"
          x2="175"
          y2="175"
          stroke="url(#logo-gradient)"
          strokeWidth="7"
          strokeLinecap="round"
        />

        <text
          x="210"
          y="112"
          fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
          fontSize="62"
          fontWeight="700"
          fill="#0092c5"
          letterSpacing="-1"
        >
          PaperControl
        </text>

        <text
          x="210"
          y="162"
          fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
          fontSize="34"
          fontWeight="400"
          fill="#6b7280"
        >
          inventario y ventas
        </text>
      </g>
    </svg>
  );
}

export default Logo;
