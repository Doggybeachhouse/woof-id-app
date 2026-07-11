import type { Translator } from "@/i18n/translate";

export function getAchievementLabels(
  t: Translator,
  slug: string,
  fallback: { name: string; description: string },
) {
  const nameKey = `achievements.${slug}.name`;
  const descKey = `achievements.${slug}.description`;
  const name = t(nameKey);
  const description = t(descKey);

  return {
    name: name !== nameKey ? name : fallback.name,
    description: description !== descKey ? description : fallback.description,
  };
}
