import React from 'react';
import { Facebook, Instagram, Twitter, Youtube } from 'lucide-react';

const SiteFooter: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-neutral-900 bg-gradient-to-t from-black via-neutral-950/95 to-transparent">
      <div className="max-w-6xl mx-auto px-5 pt-10 pb-8 space-y-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight">Cinepass</span>
            </div>
            <p className="mt-2 text-xs text-neutral-400 max-w-sm">
              Book movie tickets, discover new releases, and keep all your cinema plans in one place.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs uppercase tracking-[0.18em] text-neutral-500">
              Follow
            </span>
            <div className="flex items-center gap-3">
              {[Facebook, Instagram, Twitter, Youtube].map((Icon, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white hover:border-amber-500/70 hover:bg-neutral-800 transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs">
          <div className="space-y-3">
            <p className="font-semibold text-neutral-300 uppercase tracking-[0.18em] text-[11px]">
              Movies
            </p>
            <div className="space-y-1.5 text-neutral-400">
              <button className="block hover:text-white transition-colors">Now Showing</button>
              <button className="block hover:text-white transition-colors">Coming Soon</button>
              <button className="block hover:text-white transition-colors">Top Rated</button>
              <button className="block hover:text-white transition-colors">Trailers</button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-neutral-300 uppercase tracking-[0.18em] text-[11px]">
              Cinemas
            </p>
            <div className="space-y-1.5 text-neutral-400">
              <button className="block hover:text-white transition-colors">Browse Theaters</button>
              <button className="block hover:text-white transition-colors">Experiences</button>
              <button className="block hover:text-white transition-colors">Offers</button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-neutral-300 uppercase tracking-[0.18em] text-[11px]">
              Help & Support
            </p>
            <div className="space-y-1.5 text-neutral-400">
              <button className="block hover:text-white transition-colors">Your Bookings</button>
              <button className="block hover:text-white transition-colors">Refunds</button>
              <button className="block hover:text-white transition-colors">FAQ</button>
              <button className="block hover:text-white transition-colors">Contact Us</button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-neutral-300 uppercase tracking-[0.18em] text-[11px]">
              Cinepass
            </p>
            <div className="space-y-1.5 text-neutral-400">
              <button className="block hover:text-white transition-colors">About</button>
              <button className="block hover:text-white transition-colors">Careers</button>
              <button className="block hover:text-white transition-colors">Partner with us</button>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-900 pt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-[11px] text-neutral-500">
            © {year} Cinepass. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-neutral-500">
            <button className="hover:text-white transition-colors">Terms & Conditions</button>
            <span className="w-1 h-1 rounded-full bg-neutral-700" />
            <button className="hover:text-white transition-colors">Privacy Policy</button>
            <span className="w-1 h-1 rounded-full bg-neutral-700" />
            <button className="hover:text-white transition-colors">Cookie Policy</button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;

