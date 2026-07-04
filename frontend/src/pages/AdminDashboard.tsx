import { useEffect, useState, useCallback } from 'react';
import { BrandMark } from '../components/Brand';
import { api } from '../api/client';
import type { AdminStats, Package, Transaction } from '../types';

function money(n: number) {
  return `KSh ${n.toLocaleString()}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  });
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);

  const refresh = useCallback(() => {
    api.get<AdminStats>('/api/admin/stats').then(setStats).catch(() => {});
    api.get<Transaction[]>('/api/admin/transactions').then(setTransactions).catch(() => {});
    api.get<Package[]>('/api/packages/all').then(setPackages).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10000);
    return () => clearInterval(id);
  }, [refresh]);

  async function togglePackage(pkg: Package) {
    await api.patch(`/api/packages/${pkg._id}`, { isActive: !pkg.isActive });
    refresh();
  }

  async function addPackage() {
    const name = prompt('Package name (e.g. "2 Hour Browse"):');
    if (!name) return;
    const durationMins = Number(prompt('Duration in minutes (e.g. 120 for 2 hours):'));
    const price = Number(prompt('Price in whole shillings (e.g. 12):'));
    if (!durationMins || !price) {
      alert('Duration and price are required.');
      return;
    }
    try {
      await api.post('/api/packages', { name, durationMins, price });
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not create package');
    }
  }

  return (
    <div className="admin-app">
      <div className="admin-header">
        <div className="admin-title">
          <BrandMark size={26} />
          IVYNEX WIFI <span className="muted" style={{ fontWeight: 400, fontSize: '0.9rem' }}>· Admin</span>
        </div>
        <a href="/" className="admin-link">
          ← Back to portal
        </a>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Revenue today</div>
          <div className="stat-value gold">{money(stats?.today.revenue ?? 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Sales today</div>
          <div className="stat-value">{stats?.today.count ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">All-time revenue</div>
          <div className="stat-value gold">{money(stats?.allTime.revenue ?? 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Users online now</div>
          <div className="stat-value teal">{stats?.activeNow ?? 0}</div>
        </div>
      </div>

      <div className="admin-section">
        <h2>Packages</h2>
        <div className="admin-card">
          {packages.map((pkg) => (
            <div className="pkg-manage-row" key={pkg._id}>
              <span className="pmr-name">
                {pkg.name}
                {!pkg.isActive && <span className="muted"> (hidden)</span>}
              </span>
              <span className="pmr-meta">
                {pkg.durationMins}min · KSh {pkg.price}
              </span>
              <button className="btn ghost small" onClick={() => togglePackage(pkg)}>
                {pkg.isActive ? 'Hide' : 'Show'}
              </button>
            </div>
          ))}
        </div>
        <button className="btn primary" style={{ marginTop: 12 }} onClick={addPackage}>
          + Add package
        </button>
      </div>

      <div className="admin-section">
        <h2>Revenue by package</h2>
        <div className="admin-card">
          <table>
            <thead>
              <tr>
                <th>Package</th>
                <th className="num">Sales</th>
                <th className="num">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {stats?.byPackage.length ? (
                stats.byPackage.map((p) => (
                  <tr key={p.name}>
                    <td>{p.name}</td>
                    <td className="num mono">{p.sales}</td>
                    <td className="num mono">{money(p.revenue)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="muted">
                    No sales yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-section">
        <h2>Recent transactions</h2>
        <div className="admin-card">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Phone</th>
                <th>Package</th>
                <th className="num">Amount</th>
                <th>Status</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length ? (
                transactions.map((t) => (
                  <tr key={t._id}>
                    <td className="mono">{formatTime(t.createdAt)}</td>
                    <td className="mono">{t.phone}</td>
                    <td>{typeof t.package === 'object' ? t.package.name : t.package}</td>
                    <td className="num mono">{money(t.amount)}</td>
                    <td>
                      <span className={`tag ${t.status}`}>{t.status}</span>
                    </td>
                    <td className="mono">{t.mpesaReceipt || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="muted">
                    No transactions yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
