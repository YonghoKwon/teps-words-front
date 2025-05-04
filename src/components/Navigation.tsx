// src/components/Navigation.tsx
import { Link, useLocation } from 'react-router-dom';
import '../styles/Navigation.css';

export const Navigation = () => {
  const location = useLocation();

  return (
    <nav className="nav-container">
      <ul className="nav-list">
        <li className={location.pathname === '/' ? 'active' : ''}>
          <Link to="/">랜덤 단어</Link>
        </li>
        <li className={location.pathname === '/words' ? 'active' : ''}>
          <Link to="/words">단어 목록</Link>
        </li>
      </ul>
    </nav>
  );
};