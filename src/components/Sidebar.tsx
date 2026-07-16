import React, { useState } from 'react';
import { Menu, Home, Users, PlaySquare, ClipboardCheck, GraduationCap, Video, Building2 } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  activeExploreTab: string;
  onTabSelect: (tabId: 'home' | 'teachers' | 'playlists' | 'tests' | 'batches' | 'lecture' | 'institutes') => void;
}

export default function Sidebar({
  currentView,
  activeExploreTab,
  onTabSelect,
}: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(() => {
    // Default to collapsed for screen layout cleanliness
    try {
      const saved = localStorage.getItem('biovised_sidebar_expanded');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('biovised_sidebar_expanded', String(next));
      } catch (e) {
        console.warn(e);
      }
      return next;
    });
  };

  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'teachers', label: 'Teachers', icon: Users },
    { id: 'playlists', label: 'Playlist', icon: PlaySquare },
    { id: 'tests', label: 'Tests', icon: ClipboardCheck },
    { id: 'batches', label: 'Batches', icon: GraduationCap },
    { id: 'lecture', label: 'Lecture', icon: Video },
    { id: 'institutes', label: 'Institutes', icon: Building2 },
  ] as const;

  return (
    <aside
      className={`hidden md:flex flex-col bg-[#0D0D0C] border-r border-[#1A1A1A]/80 shrink-0 h-[calc(100vh-4rem)] sticky top-16 z-30 transition-all duration-300 ease-in-out select-none ${
        isExpanded ? 'w-60' : 'w-16'
      }`}
    >
      {/* Sidebar header containing the 'three lines' menu toggle button */}
      <div className="h-14 flex items-center px-4 border-b border-[#1A1A1A]/40 justify-start gap-4">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900/60 transition-all cursor-pointer focus:outline-none"
          title={isExpanded ? 'Collapse Menu' : 'Expand Menu'}
        >
          <Menu className="w-5 h-5" />
        </button>
        {isExpanded && (
          <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase select-none">
            Menu Navigation
          </span>
        )}
      </div>

      {/* Tabs navigation list */}
      <nav className="flex-1 py-4 space-y-1.5 px-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = currentView === 'explore' && activeExploreTab === t.id;

          return (
            <button
              key={t.id}
              onClick={() => onTabSelect(t.id)}
              className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer focus:outline-none ${
                isActive
                  ? 'bg-white/5 border border-white/10 text-white font-bold'
                  : 'border border-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/40'
              }`}
              title={!isExpanded ? t.label : undefined}
            >
              <Icon
                className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                  isActive ? 'text-white' : 'text-zinc-450 group-hover:text-white'
                }`}
                strokeWidth={1.8}
              />
              {isExpanded && (
                <span className="text-[11px] font-semibold tracking-wide uppercase truncate">
                  {t.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar footer hint */}
      {isExpanded && (
        <div className="p-4 border-t border-[#1A1A1A]/40 text-center">
          <p className="text-[9px] font-mono text-zinc-650 uppercase tracking-widest leading-normal">
            Biovised Verse v1.2
          </p>
        </div>
      )}
    </aside>
  );
}
