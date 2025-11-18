import React from 'react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  showLogout?: boolean;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  title,
  showBackButton = false,
  showLogout = false,
  onLogout,
}) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBackButton && (
            <Link
              to="/modules"
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back
            </Link>
          )}
          {title && <h1 className="text-xl font-semibold">{title}</h1>}
        </div>
        {showLogout && (
          <button
            onClick={onLogout}
            className="text-gray-600 hover:text-gray-900"
          >
            Logout
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;

