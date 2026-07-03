import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function Sidebar() {
  const location = useLocation();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <aside className="sidebar">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="sidebar-logo" style={{ marginBottom: 0 }}>
          Inventory Pro
        </div>
        <button 
          className="mobile-menu-btn btn"
          style={{ display: 'none', background: 'transparent', color: 'var(--text-main)', fontSize: '1.5rem', padding: '0.5rem' }}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          ☰
        </button>
      </div>

      <nav className="sidebar-nav" style={{ display: isMobileMenuOpen ? 'flex' : '' }} id="nav-menu">
        <Link 
          to="/" 
          className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          Dashboard / Reports
        </Link>
        <Link 
          to="/inward" 
          className={`nav-item ${location.pathname === '/inward' ? 'active' : ''}`}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          Inward Entry
        </Link>
        <Link 
          to="/outward" 
          className={`nav-item ${location.pathname === '/outward' ? 'active' : ''}`}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          Outward Entry
        </Link>
      </nav>
      
      <div style={{ marginTop: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }} className="sidebar-footer">
        <button 
          onClick={toggleTheme} 
          className="btn btn-secondary" 
          style={{ width: '100%', padding: '0.75rem', fontSize: '0.875rem', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', border: '1px solid var(--border)' }}
        >
          {theme === 'dark' ? '☀️ Switch to Light' : '🌙 Switch to Dark'}
        </button>
        <button onClick={() => supabase.auth.signOut()} className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', fontSize: '0.875rem', backgroundColor: 'var(--danger)' }}>Logout</button>
      </div>
    </aside>
  );
}
