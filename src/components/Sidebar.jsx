import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import './Sidebar.css';

const primaryNavItems = [
  {
    id: 'home',
    label: 'Home',
    path: '/',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/>
        <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      </svg>
    ),
  },
  {
    id: 'play',
    label: 'Play',
    path: '/game',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 2h6l-2 5h4l-7 9 2-6H8z"/>
      </svg>
    ),
  },
  {
    id: 'leaderboard',
    label: 'Leaders',
    path: '/leaderboard',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
        <path d="M4 22h16"/>
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Profile',
    path: '/profile',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="5"/>
        <path d="M20 21a8 8 0 1 0-16 0"/>
      </svg>
    ),
  },
];

const moreNavItems = [
  {
    id: 'opening-explorer',
    label: 'Opening Explorer',
    path: '/opening-explorer',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
      </svg>
    ),
  },
  {
    id: 'tablebase',
    label: 'Endgame Tablebase',
    path: '/tablebase',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18"/>
        <rect x="7" y="13" width="3" height="6"/>
        <rect x="12" y="9" width="3" height="10"/>
        <rect x="17" y="5" width="3" height="14"/>
      </svg>
    ),
  },
  {
    id: 'player-lookup',
    label: 'Player Lookup',
    path: '/lichess-player',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.35-4.35"/>
      </svg>
    ),
  },
  {
    id: 'game-viewer',
    label: 'Game Viewer',
    path: '/game-viewer',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
    ),
  },
  {
    id: 'rules',
    label: 'Rules',
    path: '/rules',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"/>
        <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/>
      </svg>
    ),
  },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleNavigate = (path) => {
    navigate(path);
    setMoreOpen(false);
  };

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="sidebar-desktop">
        {/* Logo */}
        <div className="sidebar-logo" onClick={() => navigate('/')}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
            <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>
          </svg>
        </div>

        {/* Primary Nav */}
        <nav className="sidebar-nav">
          {primaryNavItems.map((item) => {
            const active = isActive(item.path);
            const hovered = hoveredItem === item.id;
            return (
              <button
                key={item.id}
                className={`sidebar-btn ${active ? 'sidebar-btn--active' : ''} ${hovered ? 'sidebar-btn--hovered' : ''}`}
                onClick={() => handleNavigate(item.path)}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                title={item.label}
              >
                {item.icon}
              </button>
            );
          })}

          {/* Divider */}
          <div className="sidebar-divider" />

          {/* More items on desktop */}
          {moreNavItems.map((item) => {
            const active = isActive(item.path);
            const hovered = hoveredItem === item.id;
            return (
              <button
                key={item.id}
                className={`sidebar-btn ${active ? 'sidebar-btn--active' : ''} ${hovered ? 'sidebar-btn--hovered' : ''}`}
                onClick={() => handleNavigate(item.path)}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                title={item.label}
              >
                {item.icon}
              </button>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />
      </aside>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="bottomnav">
        {primaryNavItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              className={`bottomnav-btn ${active ? 'bottomnav-btn--active' : ''}`}
              onClick={() => handleNavigate(item.path)}
            >
              {item.icon}
              <span className="bottomnav-label">{item.label}</span>
            </button>
          );
        })}

        {/* More button */}
        <button
          className={`bottomnav-btn ${moreOpen ? 'bottomnav-btn--active' : ''}`}
          onClick={() => setMoreOpen(!moreOpen)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1"/>
            <circle cx="12" cy="5" r="1"/>
            <circle cx="12" cy="19" r="1"/>
          </svg>
          <span className="bottomnav-label">More</span>
        </button>

        {/* More Menu Overlay */}
        {moreOpen && (
          <>
            <div className="bottomnav-overlay" onClick={() => setMoreOpen(false)} />
            <div className="bottomnav-more-menu">
              {moreNavItems.map((item) => (
                <button
                  key={item.id}
                  className={`bottomnav-more-item ${isActive(item.path) ? 'bottomnav-more-item--active' : ''}`}
                  onClick={() => handleNavigate(item.path)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </nav>
    </>
  );
};

export default Sidebar;
