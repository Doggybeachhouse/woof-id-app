type HuntDifficultyStarsProps = {
  value: number;
  className?: string;
};

function StarIcon({ filled, half }: { filled: boolean; half?: boolean }) {
  if (half) {
    return (
      <span className="hunt-stars__star hunt-stars__star--half" aria-hidden>
        <span className="hunt-stars__half-fill">★</span>
        <span className="hunt-stars__half-empty">★</span>
      </span>
    );
  }
  return (
    <span
      className={`hunt-stars__star${filled ? " hunt-stars__star--filled" : ""}`}
      aria-hidden
    >
      ★
    </span>
  );
}

export function HuntDifficultyStars({ value, className }: HuntDifficultyStarsProps) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (value >= i) {
      stars.push(<StarIcon key={i} filled />);
    } else if (value >= i - 0.5) {
      stars.push(<StarIcon key={i} filled half />);
    } else {
      stars.push(<StarIcon key={i} filled={false} />);
    }
  }

  return (
    <span
      className={`hunt-stars${className ? ` ${className}` : ""}`}
      aria-label={`${value} / 5`}
      title={`${value} / 5`}
    >
      {stars}
    </span>
  );
}
