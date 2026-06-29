import { Bell, User as UserIcon, ShieldAlert, Search, Mic, Sun, Moon } from 'lucide-react';
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
  
  searchSuggestions?: string[];
  currentExamType?: string;
  onVoiceSearchClick?: () => void;
  onLogoClick?: () => void;
  
  // Theme toggle
  themeMode: 'light' | 'dark';
  onToggleTheme: () => void;
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
  showFilters,
  onToggleFilters,
  isFilterSupported,
  onFocus,
  searchSuggestions = [],
  currentExamType = 'NEET',
  onVoiceSearchClick,
  onLogoClick,
  themeMode,
  onToggleTheme
}: HeaderProps) {
  const { user, isGuest } = useAuth();
  const [isFocused, setIsFocused] = useState(false);
  const hasUnread = notifications.some(n => !n.read);

  const shouldRedirectToSearch = currentView !== 'explore' || !activeExploreTab || activeExploreTab === 'home';

  const getPlaceholder = () => {
    if (currentView !== 'explore') return "Search lessons, badges & educators...";
    switch (activeExploreTab) {
      case 'tests':
        return "Search Mock Tests (Allen, Aakash, MathonGo...)";
      case 'teachers':
        return "Search Registered Educators (HC Verma, NV Sir...)";
      case 'playlists':
        return "Search YouTube Playlists...";
      case 'batches':
        return "Search Course Batches...";
      case 'lecture':
        return "Search Video Chapters...";
      case 'institutes':
        return "Search Academies...";
      default:
        return "Search lessons, badges & educators...";
    }
  };

  const getCuratedFallback = () => {
    const exam = currentExamType || 'NEET';
    if (exam === 'JEE') {
      return [
        'JEE mains physics full one shot',
        'jee coordinate geometry lectures',
        'maths mock test mathongo',
        'jee advanced calculus pyqs',
        'physics hc verma solution review'
      ];
    } else {
      return [
        'NEET inorganic chemistry one shot',
        'biology complete mock test series',
        'neet organic chemistry revision',
        'physics mechanics questions',
        'aakash minor cheat sheets biology'
      ];
    }
  };

  const refinedSuggestions = searchSuggestions.filter(item => {
    const stream = currentExamType || 'NEET';
    const lowerItem = item.toLowerCase();
    if (stream === 'NEET') {
      if (lowerItem.includes('math') || lowerItem.includes('mathematics') || lowerItem.includes('jee')) return false;
    }
    if (stream === 'JEE') {
      if (lowerItem.includes('bio') || lowerItem.includes('biology') || lowerItem.includes('neet')) return false;
    }
    return true;
  });

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-[#000000] border-b border-[#1A1A1A] px-4 sm:px-6 md:px-8 flex items-center justify-between shrink-0 font-sans">
      {/* Brand logo */}
      <div className="flex items-center">
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
          <span className="font-bold tracking-tight text-xl text-[#FFFFFF] font-sans select-none">
            Biovised
          </span>
        </button>
      </div>

      {/* Global & Section-Scoped Search box in Header */}
      <div className="flex-grow max-w-sm sm:max-w-md mx-3 sm:mx-6 flex items-center">
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
          className="relative flex-grow"
        >
          <div className="relative flex items-center bg-[#0D0D0C] border border-[#1A1A1A] rounded-full overflow-hidden focus-within:border-zinc-700 transition-all w-full px-3.5 py-1">
            <Search className="w-4 h-4 text-zinc-500 mr-2.5 shrink-0" />
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
                onSearchChange(''); // Clear sticky values
                onViewDashboard('search');
              }}
              onBlur={() => setTimeout(() => setIsFocused(false), 240)}
              placeholder={getPlaceholder()}
              className="w-full h-8 bg-transparent text-xs font-sans text-[#FFFFFF] placeholder-zinc-500 outline-none border-none focus:ring-0 focus:outline-none transition-all pr-8 pl-1"
            />
            <button
              type="button"
              onClick={onVoiceSearchClick}
              className="absolute right-3.5 text-zinc-500 hover:text-[#FFFFFF] transition-colors bg-transparent border-none cursor-pointer p-0.5 flex items-center"
              title="Search with voice"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Utilities: Notifications, Profile, and Console */}
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
        {user && !isGuest ? (
          <>
            {/* Notification alert container */}
            <button
              onClick={() => onViewDashboard('notifications')}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors cursor-pointer relative border-none ${
                currentView === 'notifications'
                  ? 'bg-[#0D0D0C] text-[#FFFFFF]'
                  : 'text-zinc-400 hover:text-[#FFFFFF] hover:bg-[#0D0D0C]'
              }`}
            >
              <div className="relative">
                <Bell className="w-5 h-5" strokeWidth={1.8} />
                {hasUnread && (
                  <span className="bg-red-500 absolute w-2.5 h-2.5 rounded-full -top-0.5 -right-0.5" />
                )}
              </div>
            </button>

            {/* Profile triggering button */}
            <button
              onClick={() => onViewDashboard('profile')}
              className={`w-10 h-10 flex items-center justify-center rounded-full border-none bg-[#0D0D0C] transition-all cursor-pointer ${
                currentView === 'profile'
                  ? 'text-[#FFFFFF] ring-1 ring-[#FFFFFF]'
                  : 'text-zinc-400 hover:text-[#FFFFFF]'
              }`}
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="w-5 h-5" />
              )}
            </button>
            
            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              className="theme-icon-btn w-10 h-10 flex items-center justify-center rounded-full border-none bg-[#0D0D0C] text-zinc-400 hover:text-[#FFFFFF] transition-all cursor-pointer"
              title={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} theme`}
            >
              {themeMode === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
          </>
        ) : (
          <>
            {/* Guest / Not logged */}
            <button
              onClick={() => {
                onViewDashboard('notifications');
              }}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors cursor-pointer relative border-none ${
                currentView === 'notifications'
                  ? 'bg-[#0D0D0C] text-[#FFFFFF]'
                  : 'text-zinc-400 hover:text-[#FFFFFF] hover:bg-[#0D0D0C]'
              }`}
              title="Notifications Center"
            >
              <div className="relative">
                <Bell className="w-5 h-5" strokeWidth={1.8} />
                <span className="bg-red-500 absolute w-2.5 h-2.5 rounded-full -top-0.5 -right-0.5" />
              </div>
            </button>

            {/* Profile search trigger */}
            <button
              onClick={onOpenAuth}
              className="w-10 h-10 flex items-center justify-center rounded-full border-none bg-[#0D0D0C] text-zinc-400 hover:text-[#FFFFFF] transition-all cursor-pointer"
              title="Sign in to your space"
            >
              <UserIcon className="w-5 h-5" />
            </button>
            
            {/* Theme Toggle Button (Guest) */}
            <button
              onClick={onToggleTheme}
              className="theme-icon-btn w-10 h-10 flex items-center justify-center rounded-full border-none bg-[#0D0D0C] text-zinc-400 hover:text-[#FFFFFF] transition-all cursor-pointer"
              title={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} theme`}
            >
              {themeMode === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            {/* Sign in extra CTA button */}
            <button
              onClick={onOpenAuth}
              className="hidden sm:inline bg-[#FFFFFF] hover:bg-zinc-200 text-[#000000] text-xs font-semibold py-1.5 px-4 rounded-full transition-all cursor-pointer"
            >
              Sign in
            </button>
          </>
        )}
      </div>
    </header>
  );
}
