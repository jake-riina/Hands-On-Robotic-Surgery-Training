import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

interface ProfileDropdownProps {
  size?: 'sm' | 'md';
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ size = 'sm' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/?signedOut=true');
    } catch (error) {
      console.error('Error signing out:', error);
      // Still navigate even if there's an error
      navigate('/?signedOut=true');
    }
  };

  const handleViewProfile = () => {
    setIsOpen(false);
    navigate('/settings');
  };

  const svgSize = size === 'md' ? '40' : '36';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-none p-0"
        aria-label="Profile menu"
        style={{ background: 'transparent' }}
      >
        <svg 
          width={svgSize} 
          height={svgSize} 
          viewBox="0 0 28 28" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="14" cy="14" r="14" fill="#9CA3AF" />
          <circle cx="14" cy="10" r="4" fill="#4B5563" />
          <path d="M 6 22 Q 6 18 10 18 L 18 18 Q 22 18 22 22 L 22 28 L 6 28 Z" fill="#4B5563" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 rounded-lg shadow-lg z-50"
          style={{
            backgroundColor: '#1E2733',
            border: '1px solid #374151',
            width: '100px',
            minWidth: '100px',
            transform: 'translateX(-45%)',
          }}
        >
          <div className="py-1">
            <button
              onClick={handleViewProfile}
              className="block w-full text-left px-4 py-2 text-sm whitespace-nowrap hover:bg-gray-700 transition-colors"
              style={{ color: '#1E2733' }}
            >
              View Profile
            </button>
            <button
              onClick={handleSignOut}
              className="block w-full text-left px-4 py-2 text-sm whitespace-nowrap hover:bg-gray-700 transition-colors"
              style={{ color: '#1E2733' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
