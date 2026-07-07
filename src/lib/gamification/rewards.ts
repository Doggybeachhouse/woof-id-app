export type WoofReward = {
  id: string;
  coins: number;
  title: string;
  description: string;
  icon: string;
  terms?: string;
};

export const WOOF_REWARDS: WoofReward[] = [
  {
    id: "free-licky",
    coins: 300,
    title: "Gratis Licky",
    description: "Eén gratis Licky ijsje voor je hond — smakelijke beloning!",
    icon: "🍦",
  },
  {
    id: "free-ball",
    coins: 400,
    title: "Gratis bal",
    description: "Een bal naar keuze uit ons assortiment, helemaal gratis.",
    icon: "🎾",
  },
  {
    id: "discount-10",
    coins: 500,
    title: "10% korting",
    description: "10% korting op je aankoop in de winkel.",
    icon: "🏷️",
    terms: "Minimaal €20 besteding. Niet combineerbaar met andere acties.",
  },
  {
    id: "snack-bag",
    coins: 1000,
    title: "Zak snacks",
    description:
      "Een zak gratis snacks uit onze snackbar — jij kiest, tot €15 waarde.",
    icon: "🦴",
    terms: "Maximaal €15 aan snacks naar keuze.",
  },
];

export function rewardsAffordable(coinBalance: number): WoofReward[] {
  return WOOF_REWARDS.filter((r) => coinBalance >= r.coins);
}

export function nextReward(coinBalance: number): WoofReward | null {
  return WOOF_REWARDS.find((r) => coinBalance < r.coins) ?? null;
}

export function getRewardById(rewardId: string): WoofReward | null {
  return WOOF_REWARDS.find((r) => r.id === rewardId) ?? null;
}
