import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  LogOut, 
  Sun, 
  Moon,
  Menu,
  X,
  Package
} from 'lucide-react';

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
    <>
      {/* Mobile Header */}
      <div className="mobile-header" style={{ display: 'none' /* handled by media query in css ideally, but let's do inline for specific mobile overrides if needed */ }}>
        {/* We can use CSS to show this only on mobile, but let's keep it simple with standard classes */}
      </div>

      <aside className="sidebar">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="sidebar-logo">
            <Package size={28} color="var(--primary)" />
            Inventory Pro
          </div>
          <button 
            className="mobile-menu-btn"
            style={{ display: 'none', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <nav className="sidebar-nav" style={{ display: isMobileMenuOpen ? 'flex' : '' }} id="nav-menu">
          <Link 
            to="/" 
            className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <LayoutDashboard />
            Dashboard
          </Link>
          <Link 
            to="/inward" 
            className={`nav-item ${location.pathname === '/inward' ? 'active' : ''}`}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <ArrowDownToLine />
            Inward Entry
          </Link>
          <Link 
            to="/outward" 
            className={`nav-item ${location.pathname === '/outward' ? 'active' : ''}`}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <ArrowUpFromLine />
            Outward Entry
          </Link>
        </nav>
        
        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button 
            onClick={toggleTheme} 
            className="nav-item" 
            style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--text-muted)' }}
          >
            {theme === 'dark' ? <><Sun /> Light Mode</> : <><Moon /> Dark Mode</>}
          </button>
          
          <button 
            onClick={() => supabase.auth.signOut()} 
            className="nav-item" 
            style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--danger)' }}
          >
            <LogOut />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
