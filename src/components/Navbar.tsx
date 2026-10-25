import React, { useState } from 'react';
import { Menu, User, UserCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, profile, authReady } = useAuth();

  const shortName = (
    profile?.displayName ||
    user?.displayName ||
    user?.email?.split('@')[0] ||
    'Farmer'
  )
    .split(' ')[0]
    .slice(0, 14);

  const navItems = [
    { href: '#dashboard', label: 'Dashboard' },
    { href: '#markets', label: 'Markets' },
    { href: '#price-intelligence', label: 'Price Intelligence' },
    { href: '#ai-advisor', label: 'AI Advisor' },
    { href: '#reports', label: 'Reports' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#F7F7F2]/95 backdrop-blur-sm border-b border-[#E2E4DD] no-print">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 h-14">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#"
          className="font-display text-xl font-bold tracking-tight text-[#0F2F1E] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16A34A]"
        >
          Mand<span className="text-[#16A34A]">I</span>Lens
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label="Primary"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#4A524D]"
        >
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="hover:text-[#0F2F1E] hover:underline underline-offset-4 transition-colors duration-150 whitespace-nowrap shrink-0"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: 1 primary action (Profile) */}
        <div className="flex items-center gap-3 shrink-0">
          {!authReady ? (
            <button
              type="button"
              disabled
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-[#4A524D] bg-[#EFEFE8] rounded-lg whitespace-nowrap shrink-0"
            >
              Profile
            </button>
          ) : user ? (
            <button
              type="button"
              onClick={onOpenAuth}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F2F1E] rounded-lg hover:bg-[#16422B] transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F1E]"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#4ADE80]" />
              <span>Profile · {shortName}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F2F1E] rounded-lg hover:bg-[#16422B] transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2F1E]"
            >
              <User className="w-3.5 h-3.5" />
              <span>Profile</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
            className="md:hidden inline-flex items-center justify-center w-10 h-10 text-[#161A18] hover:bg-[#EFEFE8] rounded-lg transition-colors duration-150"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E2E4DD] bg-[#F7F7F2] px-6 py-4 space-y-3">
          <nav className="flex flex-col space-y-2 text-sm font-medium text-[#161A18]">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#15803D] whitespace-nowrap"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="pt-2 border-t border-[#E2E4DD]">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth();
              }}
              className="inline-flex w-full items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#0F2F1E] rounded-lg hover:bg-[#16422B] transition-colors whitespace-nowrap"
            >
              {user ? (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-[#4ADE80]" />
                  <span>Profile · {shortName}</span>
                </>
              ) : (
                <>
                  <User className="w-3.5 h-3.5" />
                  <span>Profile · Sign In</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
