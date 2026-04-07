import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';

const navItems = [
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
  {
    id: 'rules',
    label: 'Rules',
    path: '/rules',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logoWrap} onClick={() => navigate('/')}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
          <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>
        </svg>
      </div>

      {/* Nav Items */}
      <nav style={styles.nav}>
        {navItems.map((item) => {
          const active = isActive(item.path);
          const hovered = hoveredItem === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                ...styles.navBtn,
                color: active ? 'var(--primary)' : hovered ? 'var(--on-surface)' : 'var(--outline)',
                background: active
                  ? 'rgba(59, 130, 246, 0.12)'
                  : hovered
                    ? 'rgba(255,255,255,0.04)'
                    : 'transparent',
              }}
              title={item.label}
            >
              {item.icon}
            </button>
          );
        })}
      </nav>

      {/* Bottom spacer */}
      <div style={{ flex: 1 }} />
    </aside>
  );
};

const styles = {
  sidebar: {
    width: '64px',
    minWidth: '64px',
    height: '100vh',
    background: 'var(--surface-container-lowest)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: '1.25rem',
    gap: '0.5rem',
    position: 'sticky',
    top: 0,
    left: 0,
    zIndex: 100,
  },
  logoWrap: {
    width: '42px',
    height: '42px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1.5rem',
    cursor: 'pointer',
    borderRadius: 'var(--radius-lg)',
    transition: 'background 0.2s',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    alignItems: 'center',
  },
  navBtn: {
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    borderRadius: 'var(--radius-lg)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    padding: 0,
  },
};

export default Sidebar;
