import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavigationProps {
  items: Array<{
    path: string;
    label: string;
  }>;
}

const Navigation: React.FC<NavigationProps> = ({ items }) => {
  const location = useLocation();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <ul className="flex gap-6">
          {items.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`block py-4 px-2 border-b-2 transition-colors ${
                  location.pathname === item.path
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default Navigation;

