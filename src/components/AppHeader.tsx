import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useStore, useUnreadAlertCount } from '../core/store';
import { formatDemoDateTime } from '../utils/ids';
import '../styles/layout.css';

interface AppHeaderProps {
  onAlertClick: () => void;
}

const primaryNavigation = [
  { label: 'Home', to: '/', end: true },
  { label: 'Our Technology', to: '/#technology' },
  { label: 'How It Works', to: '/#how-it-works' },
  { label: 'Ponds', to: '/ponds' },
  { label: 'Insights', to: '/telemetry' },
];

const utilityNavigation = [
  { label: 'Inventory', to: '/inventory' },
  { label: 'Feed forecast', to: '/forecast' },
  { label: 'Growth & biomass', to: '/growth' },
  { label: 'Feed calculator', to: '/calculator' },
];

export function AppHeader({ onAlertClick }: AppHeaderProps) {
  const farmName = useStore(state => state.farmName);
  const demoClock = useStore(state => state.demoClock);
  const unreadCount = useUnreadAlertCount();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="app-header" role="banner">
      <Link to="/" className="header-brand" aria-label="AquaFeed AI home" onClick={() => setMobileMenuOpen(false)}>
        <span className="header-logo" aria-hidden="true">
          <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="19" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 25c4-4 8-4 12 0s8 4 12 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M11 29c3-2.5 6-2.5 9 0s6 2.5 9 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".7" />
            <path d="M14 15c3.5-4.5 9.5-4.5 13 0-3.5 4.5-9.5 4.5-13 0Z" fill="currentColor" />
            <circle cx="23" cy="14.5" r="1" fill="#0B3D2E" />
          </svg>
        </span>
        <span className="header-brand-copy">
          <span className="header-product-name">AquaFeed <span>AI</span></span>
          <span className="header-tagline">Pond intelligence, in balance</span>
        </span>
      </Link>

      <button
        type="button"
        className="mobile-menu-toggle"
        aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={mobileMenuOpen}
        aria-controls="primary-navigation"
        onClick={() => setMobileMenuOpen(open => !open)}
      >
        <span />
        <span />
        <span />
      </button>

      <nav id="primary-navigation" className={`app-nav${mobileMenuOpen ? ' app-nav-open' : ''}`} aria-label="Main navigation">
        {primaryNavigation.map(item => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            {item.label}
          </NavLink>
        ))}
        <details className="nav-tools">
          <summary>Farm tools</summary>
          <div className="nav-tools-menu">
            {utilityNavigation.map(item => (
              <NavLink key={item.to} to={item.to} className="nav-tools-link" onClick={() => setMobileMenuOpen(false)}>
                {item.label}
              </NavLink>
            ))}
          </div>
        </details>
      </nav>

      <div className="header-right">
        <div className="header-farm-info">
          <span className="header-farm-name">{farmName}</span>
          <span className="header-demo-time">{formatDemoDateTime(demoClock)}</span>
        </div>
        <span className="demo-badge" title="Application data is simulated for this demonstration">
          <span className="header-demo-dot" aria-hidden="true" />
          DEMO ACTIVE
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-icon bell-wrapper"
          onClick={onAlertClick}
          aria-label={`Notifications - ${unreadCount} unread`}
          id="btn-notifications"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 && <span className="bell-badge" aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </button>
        <Link to="/ponds" className="header-dashboard-link">Farmer dashboard <span aria-hidden="true">↗</span></Link>
      </div>
    </header>
  );
}
