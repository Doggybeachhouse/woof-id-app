const CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateWoofId(): string {
  let suffix = "";
  for (let i = 0; i < 5; i++) {
    suffix += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return `WBH-${suffix}`;
}

export async function createUniqueWoofId(
  exists: (woofId: string) => Promise<boolean>,
): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const woofId = generateWoofId();
    if (!(await exists(woofId))) return woofId;
  }
  throw new Error("Could not generate unique Woof ID");
}
