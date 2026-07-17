"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";

interface ShortenResult {
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  createdAt: string;
}

export default function Home() {
  const mutation = useMutation<ShortenResult, Error, { url: string; customCode?: string }>({
    mutationFn: async (body) => {
      const res = await fetch("/api/urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to shorten URL");
      }

      return data.data;
    },
  });

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const url = (formData.get("url") as string)?.trim();
    const customCode = (formData.get("customCode") as string)?.trim();

    if (!url) return;

    const payload: { url: string; customCode?: string } = { url };
    if (customCode) payload.customCode = customCode;

    try {
      await mutation.mutateAsync(payload);
      e.currentTarget.reset(); // Clears the form inputs on success
    } catch {
      // Error is already captured by the mutation state
    }
  }

  function copyToClipboard(code: string) {
    navigator.clipboard.writeText(`${window.location.origin}/${code}`).catch(() => {});
  }

  return (
    <div className="reading-width" style={{ margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
        Shorten a URL
      </h1>
      <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
        Paste a long URL and get a short link with cache-first redirect.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2 mb-4">
          <label htmlFor="url" className="text-sm" style={{ fontWeight: 500 }}>
            URL <span className="text-muted">*</span>
          </label>
          <input
            id="url"
            name="url"
            type="url"
            placeholder="https://example.com/very/long/url"
            required
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-2 mb-4">
          <label htmlFor="custom" className="text-sm" style={{ fontWeight: 500 }}>
            Custom code <span className="text-muted">(optional, 4–12 chars)</span>
          </label>
          <input
            id="custom"
            name="customCode"
            type="text"
            placeholder="my-link"
            minLength={4}
            maxLength={12}
            pattern="[a-zA-Z0-9_-]+"
          />
        </div>

        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Shortening…" : "Shorten URL"}
        </button>
      </form>

      {mutation.isError && (
        <div className="mt-4" style={{ padding: '0.75rem 1rem', background: 'var(--surface)', border: '1px solid var(--error)', color: 'var(--error)' }}>
          {mutation.error.message}
        </div>
      )}

      {mutation.isSuccess && mutation.data && (
        <div className="mt-4" style={{ padding: '1rem', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm text-muted mb-4">Short link created:</p>
          <div className="flex items-center gap-4" style={{ wordBreak: 'break-all' }}>
            <Link href={`/${mutation.data.shortCode}`} style={{ fontWeight: 600, fontSize: '1.125rem' }}>
              /{mutation.data.shortCode}
            </Link>
            <button className="btn-outline" onClick={() => copyToClipboard(mutation.data.shortCode)} style={{ flexShrink: 0 }}>
              Copy
            </button>
          </div>
          <p className="text-xs text-muted mt-4" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            → {mutation.data.originalUrl}
          </p>
          <p className="text-xs text-muted mt-4">
            <Link href={`/dashboard/${mutation.data.shortCode}`}>View analytics →</Link>
          </p>
        </div>
      )}
    </div>
  );
}