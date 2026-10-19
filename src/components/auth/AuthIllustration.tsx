/**
 * Bookstore + Academy scene (shelf, stacked books with a graduation cap, open book, ₿ coin) for the sign-in panel.
 * Shapes use currentColor and details use --auth-accent, so the parent sets both colours per theme.
 */
export function AuthIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 270" fill="none" aria-hidden className={className}>
      {/* Bookshelf: standing books */}
      <g fill="currentColor">
        <rect x="28" y="130" width="24" height="100" rx="3" fillOpacity="0.9" />
        <rect x="33" y="146" width="14" height="3" rx="1.5" fill="var(--auth-accent, #f7931a)" fillOpacity="0.55" />
        <rect x="33" y="210" width="14" height="3" rx="1.5" fill="var(--auth-accent, #f7931a)" fillOpacity="0.55" />
        <rect x="55" y="152" width="18" height="78" rx="3" fillOpacity="0.6" />
        <rect x="76" y="118" width="26" height="112" rx="3" fillOpacity="0.8" />
        <rect x="81" y="134" width="16" height="22" rx="2" fill="var(--auth-accent, #f7931a)" fillOpacity="0.45" />
        <rect x="105" y="146" width="16" height="84" rx="3" fillOpacity="0.5" />
        <rect x="128" y="140" width="20" height="92" rx="3" fillOpacity="0.75" transform="rotate(14 138 232)" />
      </g>

      {/* Stack of books with a graduation cap on top */}
      <g fill="currentColor">
        <rect x="168" y="206" width="124" height="24" rx="4" fillOpacity="0.9" />
        <rect x="174" y="213" width="112" height="2" rx="1" fill="var(--auth-accent, #f7931a)" fillOpacity="0.35" />
        <rect x="174" y="219" width="112" height="2" rx="1" fill="var(--auth-accent, #f7931a)" fillOpacity="0.35" />
        <rect x="178" y="183" width="106" height="23" rx="4" fillOpacity="0.65" />
        <rect x="172" y="161" width="114" height="22" rx="4" fillOpacity="0.8" />
        <rect x="178" y="168" width="10" height="8" rx="1.5" fill="var(--auth-accent, #f7931a)" fillOpacity="0.5" />
      </g>
      <g>
        <path d="M200 140v14c0 8 42 8 42 0v-14" fill="currentColor" fillOpacity="0.75" />
        <path d="M221 112l56 22-56 22-56-22z" fill="currentColor" />
        <path d="M221 134l40 6v22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="261" cy="165" r="4.5" fill="currentColor" />
      </g>

      {/* Open book */}
      <g fill="currentColor">
        <path d="M300 204c14-8 30-8 44 0v28c-14-8-30-8-44 0z" fillOpacity="0.85" />
        <path d="M344 204c14-8 30-8 44 0v28c-14-8-30-8-44 0z" fillOpacity="0.65" />
        <path d="M308 210c10-4 20-4 28 0M308 217c10-4 20-4 28 0M352 210c10-4 20-4 28 0M352 217c10-4 20-4 28 0" stroke="var(--auth-accent, #f7931a)" strokeOpacity="0.4" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </g>

      {/* ₿ coin and sparkles */}
      <g>
        <circle cx="340" cy="120" r="22" fill="currentColor" fillOpacity="0.95" />
        <circle cx="340" cy="120" r="17" stroke="var(--auth-accent, #f7931a)" strokeOpacity="0.35" strokeWidth="2" />
        <text x="340" y="128" textAnchor="middle" fontSize="22" fontWeight="800" fill="var(--auth-accent, #f7931a)" fontFamily="Inter, system-ui, sans-serif">₿</text>
      </g>
      <g fill="currentColor">
        <path d="M160 70l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fillOpacity="0.85" />
        <path d="M300 60l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fillOpacity="0.7" />
        <path d="M60 80l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fillOpacity="0.6" />
        <circle cx="110" cy="100" r="3" fillOpacity="0.5" />
        <circle cx="270" cy="96" r="2.5" fillOpacity="0.6" />
        <circle cx="384" cy="170" r="3" fillOpacity="0.5" />
      </g>

      {/* Shelf */}
      <rect x="14" y="230" width="378" height="7" rx="3.5" fill="currentColor" fillOpacity="0.55" />
      <rect x="40" y="237" width="6" height="16" rx="2" fill="currentColor" fillOpacity="0.4" />
      <rect x="360" y="237" width="6" height="16" rx="2" fill="currentColor" fillOpacity="0.4" />
    </svg>
  )
}
