"use client";

import useSWR from 'swr';
import { formatDistanceToNow } from 'date-fns';
import { LinkIcon } from 'lucide-react';
import Link from 'next/link'

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface UrlItem {
  shortCode: string;
  originalUrl: string;
  createdAt: string;
  expiresAt: string | null;
}

export default function Dashboard() {
  const { data, error, isLoading } = useSWR("/api/urls", fetcher, {
    refreshInterval: 10000,
  });

  if (isLoading) {
    return (
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Dashboard</h1>
        <p className="text-muted">Loading URLs…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Dashboard</h1>
        <p style={{ color: 'var(--error)' }}>Failed to load URLs. Please try again.</p>
      </div>
    );
  }

  const urls: UrlItem[] = data?.data || [];

  if (urls.length === 0) {
    return (
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Dashboard</h1>
        <div style={{ padding: '3rem 1rem', textAlign: 'center', border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <LinkIcon size={32} style={{ color: 'var(--muted)', marginBottom: '1rem' }} />
          <p className="text-muted" style={{ marginBottom: '0.75rem' }}>No URLs yet</p>
          <Link href="/" className="btn" style={{ display: 'inline-block' }}>Create your first short link</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Dashboard</h1>
        <span className="text-muted text-sm">{urls.length} URL{urls.length !== 1 ? 's' : ''}</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Short Code</th>
              <th>Original URL</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {urls.map((u) => (
              <tr key={u.shortCode}>
                <td style={{ fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                  /{u.shortCode}
                </td>
                <td className="truncate" style={{ maxWidth: 360 }}>
                  <a href={u.originalUrl} target="_blank" rel="noopener noreferrer">
                    {u.originalUrl}
                  </a>
                </td>
                <td className="text-muted text-sm" style={{ whiteSpace: 'nowrap' }}>
                  {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <a href={`/dashboard/${u.shortCode}`} className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}>
                    Stats →
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
