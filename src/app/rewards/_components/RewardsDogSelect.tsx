"use client";

import { useRouter } from "next/navigation";

export function RewardsDogSelect({
  dogs,
  activeDogId,
}: {
  dogs: { id: string; name: string }[];
  activeDogId: string;
}) {
  const router = useRouter();

  if (dogs.length <= 1) {
    return <p className="font-display text-xl mt-1">{dogs[0]?.name}</p>;
  }

  return (
    <select
      className="input text-base font-semibold py-2 mt-2"
      value={activeDogId}
      onChange={(e) => router.push(`/rewards?dog=${e.target.value}`)}
    >
      {dogs.map((d) => (
        <option key={d.id} value={d.id}>
          {d.name}
        </option>
      ))}
    </select>
  );
}
