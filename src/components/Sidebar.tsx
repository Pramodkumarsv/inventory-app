import { Link, useLocation } from 'react-router-dom';

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        Inventory Pro
      </div>
      <nav className="sidebar-nav">
        <Link 
          to="/" 
          className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
        >
          Dashboard / Reports
        </Link>
        <Link 
          to="/inward" 
          className={`nav-item ${location.pathname === '/inward' ? 'active' : ''}`}
        >
          Inward Entry
        </Link>
        <Link 
          to="/outward" 
          className={`nav-item ${location.pathname === '/outward' ? 'active' : ''}`}
        >
          Outward Entry
        </Link>
      </nav>
    </aside>
  );
}
