import React, { useState, useEffect, useRef } from 'react';
import { useStore, useActiveAlerts, useUnreadAlertCount, useDemoNow } from '../core/store';
import type { Alert } from '../types/alert';
import { formatRelativeTime } from '../utils/ids';

interface AlertDrawerProps {
  open: boolean;
  onClose: () => void;
  onNavigateToPond?: (pondId: string) => void;
}

type AlertFilter = 'ALL' | 'CRITICAL' | 'FEEDING' | 'WATER' | 'INVENTORY' | 'GROWTH';

export function AlertDrawer({ open, onClose, onNavigateToPond }: AlertDrawerProps) {
  const alerts = useActiveAlerts();
  const allAlerts = useStore(s => s.alerts);
  const markAlertRead = useStore(s => s.markAlertRead);
  const markAllAlertsRead = useStore(s => s.markAllAlertsRead);
  const resolveAlert = useStore(s => s.resolveAlert);
  const dismissAlert = useStore(s => s.dismissAlert);
  const demoNow = useDemoNow();
  const unreadCount = useUnreadAlertCount();

  const [filter, setFilter] = useState<AlertFilter>('ALL');
  const [showHistory, setShowHistory] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Focus trap
  useEffect(() => {
    if (open) {
      drawerRef.current?.focus();
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const filteredAlerts = (showHistory ? allAlerts : alerts).filter(a => {
    if (!showHistory && a.status !== 'ACTIVE') return false;
    if (filter === 'ALL') return true;
    if (filter === 'CRITICAL') return a.severity === 'CRITICAL';
    return a.category === filter;
  });

  // Sort by severity then time
  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    const sev = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    const sevDiff = (sev[a.severity] ?? 3) - (sev[b.severity] ?? 3);
    if (sevDiff !== 0) return sevDiff;
    return new Date(b.demoCreatedAt).getTime() - new Date(a.demoCreatedAt).getTime();
  });

  // Group by pond
  const grouped: Record<string, Alert[]> = {};
  for (const alert of sortedAlerts) {
    const key = alert.pondId ?? 'FARM';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(alert);
  }

  function getSeverityClass(severity: string) {
    if (severity === 'CRITICAL') return 'alert-row-critical';
    if (severity === 'WARNING') return 'alert-row-warning';
    return 'alert-row-info';
  }

  function getSeverityIcon(severity: string) {
    if (severity === 'CRITICAL') return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--color-critical)" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12" stroke="white" strokeWidth="2.5"/>
        <circle cx="12" cy="16" r="1" fill="white"/>
      </svg>
    );
    if (severity === 'WARNING') return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--color-amber)" aria-hidden="true">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13" stroke="white" strokeWidth="2.5"/>
        <circle cx="12" cy="17" r="1" fill="white"/>
      </svg>
    );
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--color-info)" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="16" x2="12" y2="12" stroke="white" strokeWidth="2.5"/>
        <circle cx="12" cy="8" r="1" fill="white"/>
      </svg>
    );
  }

  return (
    <>
      <div
        className="drawer-backdrop"
        onClick={onClose}
        role="presentation"
        aria-hidden="true"
      />
      <div
        ref={drawerRef}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        tabIndex={-1}
      >
        <div className="drawer-header">
          <div>
            <h2 className="drawer-title">Notifications</h2>
            {unreadCount > 0 && (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
                {unreadCount} unread
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            {unreadCount > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={markAllAlertsRead}
                id="btn-mark-all-read"
              >
                Mark all read
              </button>
            )}
            <button
              className="btn btn-ghost btn-icon"
              onClick={onClose}
              aria-label="Close notifications"
              id="btn-close-alerts"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Demo note */}
        <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--color-amber-bg)', borderBottom: '1px solid var(--color-border)', fontSize: 'var(--text-xs)', color: 'var(--color-amber-dark)' }}>
          📊 Demo data active. All alerts are derived from simulated conditions.
        </div>

        {/* Filters */}
        <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
          <div className="filter-chips">
            {(['ALL', 'CRITICAL', 'FEEDING', 'WATER', 'INVENTORY', 'GROWTH'] as AlertFilter[]).map(f => (
              <button
                key={f}
                className={`filter-chip${filter === f ? ' active' : ''}`}
                onClick={() => setFilter(f)}
                id={`alert-filter-${f.toLowerCase()}`}
              >
                {f}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 'var(--space-2)' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowHistory(!showHistory)}
              style={{ fontSize: 'var(--text-xs)', padding: '4px 8px' }}
            >
              {showHistory ? 'Hide resolved' : 'Show history'}
            </button>
          </div>
        </div>

        {/* Alerts list */}
        <div className="drawer-body">
          {sortedAlerts.length === 0 && (
            <div className="empty-state">
              <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <div className="empty-state-title">No alerts</div>
              <div className="empty-state-desc">All systems are running normally.</div>
            </div>
          )}

          {Object.entries(grouped).map(([group, groupAlerts]) => (
            <div key={group} style={{ marginBottom: 'var(--space-5)' }}>
              <div style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-bold)',
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: 'var(--space-2) 0',
                marginBottom: 'var(--space-2)',
                borderBottom: '1px solid var(--color-border)',
              }}>
                {group === 'FARM' ? 'Farm Level' : `Pond ${group}`}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {groupAlerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`alert-row ${getSeverityClass(alert.severity)} ${alert.readState === 'UNREAD' ? 'unread' : ''}`}
                    onClick={() => {
                      markAlertRead(alert.id);
                      if (alert.pondId && onNavigateToPond) {
                        onNavigateToPond(alert.pondId);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && markAlertRead(alert.id)}
                    aria-label={alert.title}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                      {getSeverityIcon(alert.severity)}
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: 'var(--text-sm)',
                          fontWeight: alert.readState === 'UNREAD' ? 'var(--font-semibold)' : 'var(--font-medium)',
                          color: 'var(--color-text-primary)',
                        }}>
                          {alert.title}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 2, lineHeight: 1.4 }}>
                          {alert.description}
                        </div>
                        {alert.observation && (
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2, fontStyle: 'italic' }}>
                            {alert.observation}
                          </div>
                        )}
                      </div>
                      {alert.readState === 'UNREAD' && (
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-teal)', flexShrink: 0, marginTop: 4 }} aria-hidden="true" />
                      )}
                    </div>

                    {alert.recommendedAction && (
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-teal)', fontWeight: 'var(--font-medium)', marginBottom: 'var(--space-2)' }}>
                        → {alert.recommendedAction}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        {formatRelativeTime(alert.demoCreatedAt, demoNow)}
                      </span>
                      <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                        {alert.status === 'ACTIVE' && (
                          <>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={e => { e.stopPropagation(); dismissAlert(alert.id); }}
                              style={{ fontSize: 'var(--text-xs)', padding: '2px 8px' }}
                              title="Dismiss alert"
                              id={`btn-dismiss-${alert.id}`}
                            >
                              Dismiss
                            </button>
                          </>
                        )}
                        {alert.status !== 'ACTIVE' && (
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                            {alert.status === 'RESOLVED' ? 'Resolved' : 'Dismissed'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
