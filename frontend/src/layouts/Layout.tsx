import { Outlet, Link } from 'react-router-dom';
import { BrandMark, BrandName } from '../components/Brand';

export default function Layout() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <BrandMark />
          <BrandName />
        </div>
        <nav>
          <Link to="/admin" className="admin-link">
            Admin
          </Link>
        </nav>
      </header>

      <main className="content">
        <Outlet />
      </main>

      <footer className="foot">
        <span>Need help? Ask the attendant on site.</span>
        <a href="/admin" className="admin-link">
          Admin
        </a>
      </footer>
    </div>
  );
}
