"use client";

import { use } from 'react';
import useSWR from 'swr';
import Link from 'next/link'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const COLORS = ["#0000ee", "#666666", "#999999", "#cccccc", "#e0e0e0", "#333333", "#551a8b", "#888888"];

interface StatCardProps {
  label: string;
  value: number | string;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function CodeDashboard({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);

  const { data: overview, error: overviewErr } = useSWR(
    `/api/urls/${code}/stats/overview`, fetcher, { refreshInterval: 5000 }
  );
  const { data: timeseries } = useSWR(
    `/api/urls/${code}/stats/timeseries?range=7d`, fetcher, { refreshInterval: 5000 }
  );
  const { data: devices } = useSWR(
    `/api/urls/${code}/stats/devices`, fetcher, { refreshInterval: 5000 }
  );
  const { data: geo } = useSWR(
    `/api/urls/${code}/stats/geo`, fetcher, { refreshInterval: 5000 }
  );
  const { data: referrers } = useSWR(
    `/api/urls/${code}/stats/referrers`, fetcher, { refreshInterval: 5000 }
  );

  if (overviewErr) {
    return (
      <div>
        <Link href="/dashboard" className="text-sm text-muted">← Back to Dashboard</Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', marginTop: '0.5rem' }}>
          /{code}
        </h1>
        <p style={{ color: 'var(--error)' }}>Failed to load analytics. The short link may not exist.</p>
      </div>
    );
  }

  const o = overview?.data;

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-muted">← Back to Dashboard</Link>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', marginTop: '0.5rem', fontFamily: 'monospace' }}>
        /{code}
      </h1>

      {/* Overview Stat Cards */}
      <div className="stats-grid mb-4">
        <StatCard label="Total Clicks" value={o?.totalClicks ?? "—"} />
        <StatCard label="Unique IPs" value={o?.uniqueIPs ?? "—"} />
        <StatCard label="Last 7 Days" value={o?.last7Days ?? "—"} />
        <StatCard label="Last 30 Days" value={o?.last30Days ?? "—"} />
      </div>

      {/* Timeseries Chart */}
      {timeseries?.data?.length > 0 && (
        <section className="mb-4">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Clicks Over Time</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={timeseries.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11, fill: 'var(--muted)' }}
                  tickFormatter={(t: string) => {
                    const d = new Date(t);
                    return `${String(d.getHours()).padStart(2, '0')}:00`;
                  }}
                />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 0, fontSize: '0.75rem' }}
                  labelFormatter={(l: unknown) => new Date(l as string).toLocaleString()}
                />
                <Line type="monotone" dataKey="count" stroke="var(--link)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Devices + Geo side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Device Types */}
        {devices?.data?.deviceTypes?.length > 0 && (
          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Device Types</h2>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={devices.data.deviceTypes} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={70}>
                    {devices.data.deviceTypes.map((_: unknown, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend formatter={(v: string) => <span style={{ color: 'var(--fg)', fontSize: '0.75rem' }}>{v}</span>} />
                  <Tooltip contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 0, fontSize: '0.75rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Browsers */}
        {devices?.data?.browsers?.length > 0 && (
          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Browsers</h2>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={devices.data.browsers} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted)' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--fg)' }} width={80} />
                  <Tooltip contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 0, fontSize: '0.75rem' }} />
                  <Bar dataKey="count" fill="var(--link)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Geo */}
        {geo?.data?.length > 0 && (
          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Countries</h2>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={geo.data} layout="vertical" margin={{ left: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted)' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="country" tick={{ fontSize: 11, fill: 'var(--fg)' }} width={45} />
                  <Tooltip contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 0, fontSize: '0.75rem' }} />
                  <Bar dataKey="count" fill="var(--fg)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}
      </div>

      {/* Referrers Table */}
      {referrers?.data?.length > 0 && (
        <section>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Top Referrers</h2>
          <table>
            <thead>
              <tr>
                <th>Referrer</th>
                <th style={{ textAlign: 'right' }}>Clicks</th>
              </tr>
            </thead>
            <tbody>
              {referrers.data.map((r: { referrer: string; count: number }, i: number) => (
                <tr key={i}>
                  <td className="truncate" style={{ maxWidth: 400 }}>
                    {r.referrer === 'direct' ? 'Direct / None' : r.referrer}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Empty state */}
      {(!o || o.totalClicks === 0) && !overviewErr && (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <p className="text-muted">No click data yet. Share your short link to start collecting analytics.</p>
        </div>
      )}
    </div>
  );
}
