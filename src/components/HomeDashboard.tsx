import { Search } from 'lucide-react';

interface HomeDashboardProps {
  onFocusSearch: () => void;
}

export default function HomeDashboard({ onFocusSearch }: HomeDashboardProps) {
  return (
    <div className="w-full min-h-[70vh] flex flex-col items-center justify-center px-4 font-sans select-none text-left bg-black text-white">
      {/* Decorative premium radial gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.015),transparent_60%)] pointer-events-none" />

      <div className="w-full max-w-xl flex flex-col items-center text-center space-y-8 z-10">
        {/* Branding header */}
        <div className="space-y-2">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white uppercase font-sans">
            BioVised
          </h1>
          <p className="text-[10px] sm:text-xs font-mono text-zinc-550 uppercase tracking-widest">
            Curriculum Discovery Workspace
          </p>
        </div>

        {/* Minimalist Centered Search Input Box */}
        <div className="w-full relative">
          <div 
            onClick={onFocusSearch}
            className="w-full flex items-center bg-[#09090b]/80 border border-zinc-900 hover:border-zinc-800 rounded-2xl py-3.5 px-5 cursor-pointer transition-all duration-300 hover:shadow-[0_0_24px_rgba(255,255,255,0.02)]"
          >
            <Search className="w-4 h-4 text-zinc-550 mr-3 shrink-0" />
            <input
              type="text"
              readOnly
              placeholder="Search playlists, lessons, tests, or teachers..."
              className="w-full bg-transparent text-sm text-white placeholder-zinc-600 focus:outline-none cursor-pointer font-sans"
            />
          </div>
        </div>

        {/* Muted strategic search hints */}
        <div className="flex flex-wrap gap-2 justify-center pt-2">
          <span className="text-[9px] font-mono text-zinc-650 uppercase tracking-wider bg-zinc-950 px-2 py-1 rounded border border-zinc-900">
            JEE & NEET High-Yield Ecosystem
          </span>
          <span className="text-[9px] font-mono text-zinc-650 uppercase tracking-wider bg-zinc-950 px-2 py-1 rounded border border-zinc-900">
            Verified Kota Catalogs
          </span>
        </div>
      </div>
    </div>
  );
}
