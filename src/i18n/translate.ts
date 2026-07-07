export type Messages = Record<string, unknown>;

export function createTranslator(messages: Messages) {
  return function t(
    key: string,
    vars?: Record<string, string | number>,
  ): string {
    const parts = key.split(".");
    let current: unknown = messages;

    for (const part of parts) {
      if (!current || typeof current !== "object" || !(part in current)) {
        return key;
      }
      current = (current as Record<string, unknown>)[part];
    }

    if (typeof current !== "string") return key;
    if (!vars) return current;

    return current.replace(/\{(\w+)\}/g, (_, name: string) =>
      String(vars[name] ?? `{${name}}`),
    );
  };
}

export type Translator = ReturnType<typeof createTranslator>;
