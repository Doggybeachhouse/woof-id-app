import { WalletBalanceSkeleton } from "@/app/dogs/[id]/_components/WalletBalanceSection";

export default function DogDetailLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <header>
        <div className="skeleton skeleton--text w-16" />
        <div className="flex items-start gap-4 mt-3">
          <div className="skeleton skeleton--avatar shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="skeleton skeleton--text skeleton--xl w-36" />
            <div className="skeleton skeleton--text w-24" />
          </div>
          <div className="skeleton skeleton--badge shrink-0" />
        </div>
      </header>

      <WalletBalanceSkeleton />

      <section className="card p-5 space-y-3">
        <div className="skeleton skeleton--text skeleton--lg w-28" />
        <div className="skeleton skeleton--text w-full" />
        <div className="skeleton skeleton--text w-2/3" />
        <div className="skeleton skeleton--text w-1/2" />
      </section>

      <section className="space-y-3">
        <div className="skeleton skeleton--text skeleton--lg w-40" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton skeleton--card h-24" />
          ))}
        </div>
      </section>
    </div>
  );
}
