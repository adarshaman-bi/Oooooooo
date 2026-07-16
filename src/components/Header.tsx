import { Bell, User as UserIcon, Search, Mic } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AppNotification } from '../types';
import { useState } from 'react';

interface HeaderProps {
  onSearchChange: (query: string) => void;
  onSearchSubmit?: () => void;
  onViewDashboard: (dashboard: 'explore' | 'profile' | 'moderator' | 'notifications' | 'search') => void;
  currentView: 'explore' | 'profile' | 'moderator' | 'notifications' | 'search';
  searchVal: string;
  onOpenAuth: () => void;
  activeExploreTab?: string;
  notifications: AppNotification[];
  
  // Smart search scoping details
  showFilters: boolean;
  onToggleFilters: () => void;
  isFilterSupported: boolean;
  onFocus?: () => void;
  
  searchSuggestions?: any[];
  currentExamType?: string;
  onVoiceSearchClick?: () => void;
  onLogoClick?: () => void;
  
  // Theme toggle
  themeMode: 'light' | 'dark';
  onToggleTheme: () => void;

  // Back button navigation (kept in props for compatibility)
  onBack?: () => void;
}

export default function Header({
  onSearchChange,
  onSearchSubmit,
  onViewDashboard,
  currentView,
  searchVal,
  onOpenAuth,
  activeExploreTab,
  notifications,
  onFocus,
  onVoiceSearchClick,
  onLogoClick
}: HeaderProps) {
  const { user, isGuest } = useAuth();
  const [isFocused, setIsFocused] = useState(false);

  const unreadCount = notifications ? notifications.filter(n => !n.read).length : 0;
  const shouldRedirectToSearch = currentView !== 'explore' || !activeExploreTab || activeExploreTab === 'home';

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-[#000000] border-b border-[#141416] px-4 sm:px-6 md:px-8 flex items-center justify-between shrink-0 font-sans select-none">
      {/* Brand logo wordmark */}
      <div className="flex items-center shrink-0">
        <button
          onClick={() => {
            if (onLogoClick) {
              onLogoClick();
            } else {
              onSearchChange('');
              onViewDashboard('explore');
            }
          }}
          className="flex items-center focus:outline-none cursor-pointer"
        >
          <span className="text-xl font-extrabold tracking-tight text-white font-sans select-none hover:opacity-90 transition-opacity">
            Biovised
          </span>
        </button>
      </div>

      {/* Centered search pill */}
      <div className="flex items-center flex-1 justify-center px-2 sm:px-4 max-w-lg mx-auto min-w-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (shouldRedirectToSearch) {
              onViewDashboard('search');
            }
            if (searchVal.trim() !== '') {
              onSearchSubmit?.();
            }
          }}
          className="relative w-full"
        >
          <div className="relative flex items-center bg-[#0D0D0C] border border-[#141416] rounded-full overflow-hidden focus-within:border-zinc-800 transition-all w-full px-4 h-10 shadow-inner">
            <Search className="w-4.5 h-4.5 text-zinc-500 mr-2.5 shrink-0" />
            <input
              type="text"
              value={searchVal}
              onChange={(e) => {
                onSearchChange(e.target.value);
                if (shouldRedirectToSearch) {
                  onViewDashboard('search');
                }
              }}
              onFocus={() => {
                setIsFocused(true);
                if (onFocus) onFocus();
                onViewDashboard('search');
              }}
              onBlur={() => setTimeout(() => setIsFocused(false), 240)}
              placeholder="Search lessons"
              className="w-full h-full bg-transparent text-sm font-sans text-white placeholder-zinc-500 outline-none border-none focus:ring-0 focus:outline-none transition-all pr-8 pl-1"
            />
            <button
              type="button"
              onClick={onVoiceSearchClick}
              className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center text-zinc-500 hover:text-white transition-colors bg-transparent border-none cursor-pointer p-0.5"
              title="Search with voice"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Utilities: Notifications bell and Profile icon */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => onViewDashboard('notifications')}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors cursor-pointer relative border-none bg-transparent ${
            currentView === 'notifications'
              ? 'text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
          title="Notifications"
        >
          <div className="relative p-1">
            <Bell className="w-5.5 h-5.5 text-white" strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span className="bg-[#FF0000] rounded-full w-2 h-2 absolute top-0.5 right-0.5 border border-black" />
            )}
          </div>
        </button>

        {user && !isGuest ? (
          <button
            onClick={() => onViewDashboard('profile')}
            className={`w-[38px] h-[38px] flex items-center justify-center rounded-full bg-[#0D0D0C] hover:bg-[#1A1A1A] transition-all cursor-pointer ${
              currentView === 'profile'
                ? 'ring-1 ring-white/50'
                : ''
            }`}
            title="Profile"
          >
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName} className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <UserIcon className="w-4.5 h-4.5 text-white" strokeWidth={1.8} />
            )}
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            className="w-[38px] h-[38px] flex items-center justify-center rounded-full bg-[#0D0D0C] hover:bg-[#1A1A1A] text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Sign in"
          >
            <UserIcon className="w-4.5 h-4.5 text-white" strokeWidth={1.8} />
          </button>
        )}
      </div>
    </header>
  );
}
