type PawDecorProps = {
  className?: string;
  size?: number;
};

export function PawDecor({ className = "", size = 24 }: PawDecorProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <ellipse cx="7" cy="8" rx="2.2" ry="2.6" opacity="0.9" />
      <ellipse cx="12" cy="6" rx="2.4" ry="2.8" />
      <ellipse cx="17" cy="8" rx="2.2" ry="2.6" opacity="0.9" />
      <ellipse cx="9.5" cy="12.5" rx="1.8" ry="2.2" opacity="0.85" />
      <ellipse cx="14.5" cy="12.5" rx="1.8" ry="2.2" opacity="0.85" />
      <path d="M8 14.5c0 3 1.8 5.5 4 5.5s4-2.5 4-5.5c0-2.2-1.6-3.5-4-3.5s-4 1.3-4 3.5Z" />
    </svg>
  );
}
