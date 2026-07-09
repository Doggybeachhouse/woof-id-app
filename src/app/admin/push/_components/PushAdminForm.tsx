"use client";

import { useState } from "react";

import { useI18n } from "@/i18n/client";

export function PushAdminForm({ subscriberCount }: { subscriberCount: number }) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, url: url || undefined }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorKey = typeof data.error === "string" ? data.error : "sendFailed";
        setError(t(`push.admin.errors.${errorKey}`));
        return;
      }

      setResult(
        t("push.admin.success", {
          sent: String(data.sent ?? 0),
          failed: String(data.failed ?? 0),
        }),
      );
      setTitle("");
      setBody("");
      setUrl("");
    } catch {
      setError(t("push.admin.errors.sendFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-4 text-center">
        <p className="text-2xl font-display">{subscriberCount}</p>
        <p className="text-xs text-black/50">{t("push.admin.subscriberCount")}</p>
      </div>

      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
        {t("push.admin.iosHint")}
      </p>

      <form onSubmit={(event) => void handleSubmit(event)} className="card-luxe p-5 space-y-4">
        <div>
          <label className="label" htmlFor="push-title">
            {t("push.admin.titleLabel")}
          </label>
          <input
            id="push-title"
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={120}
          />
        </div>

        <div>
          <label className="label" htmlFor="push-body">
            {t("push.admin.bodyLabel")}
          </label>
          <textarea
            id="push-body"
            className="input min-h-24"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            required
            maxLength={500}
          />
        </div>

        <div>
          <label className="label" htmlFor="push-url">
            {t("push.admin.urlLabel")}
          </label>
          <input
            id="push-url"
            className="input"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://woof.doggybeachhouse.com/rewards"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {result && <p className="text-sm text-green-700">{result}</p>}

        <button type="submit" className="btn btn-primary" disabled={pending || subscriberCount === 0}>
          {pending ? t("push.admin.sending") : t("push.admin.sendToAll")}
        </button>
      </form>
    </div>
  );
}
