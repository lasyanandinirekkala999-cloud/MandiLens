import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 h-14">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#"
          className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
        >
          MandiLens
        </a>

        {/* Zone 2: 4 clean single-line text navigation links */}
        <nav
          aria-label="Primary"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
        >
          <a
            href="#mandi-rates"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            Mandi Rates
          </a>
          <a
            href="#calculator"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            Freight Calculator
          </a>
          <a
            href="#supply-chain"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            Supply Chain
          </a>
          <a
            href="#case-studies"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            Case Studies
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="#alerts"
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-green-800 rounded-lg hover:bg-green-900 transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-800"
          >
            Get Price Alerts
          </a>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
            className="md:hidden inline-flex items-center justify-center w-10 h-10 text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors duration-150"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-6 py-4 space-y-3">
          <nav className="flex flex-col space-y-2.5 text-sm font-medium text-slate-700">
            <a
              href="#mandi-rates"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-slate-900 whitespace-nowrap"
            >
              Mandi Rates
            </a>
            <a
              href="#calculator"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-slate-900 whitespace-nowrap"
            >
              Freight Calculator
            </a>
            <a
              href="#supply-chain"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-slate-900 whitespace-nowrap"
            >
              Supply Chain
            </a>
            <a
              href="#case-studies"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1.5 hover:text-slate-900 whitespace-nowrap"
            >
              Case Studies
            </a>
          </nav>
          <div className="pt-2 border-t border-slate-100">
            <a
              href="#alerts"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex w-full items-center justify-center px-4 py-2.5 text-xs font-semibold text-white bg-green-800 rounded-lg hover:bg-green-900 transition-colors whitespace-nowrap"
            >
              Get Price Alerts
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
