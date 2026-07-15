import { Home, Users, PlaySquare, ClipboardCheck, GraduationCap, Video, Building2 } from 'lucide-react';

interface FooterProps {
  currentView: string;
  activeExploreTab: string;
  onTabSelect: (tabId: 'home' | 'teachers' | 'playlists' | 'tests' | 'batches' | 'lecture' | 'institutes') => void;
}

export default function Footer({
  currentView,
  activeExploreTab,
  onTabSelect
}: FooterProps) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'teachers', label: 'Teachers', icon: Users },
    { id: 'playlists', label: 'Playlist', icon: PlaySquare },
    { id: 'tests', label: 'Tests', icon: ClipboardCheck },
    { id: 'batches', label: 'Batches', icon: GraduationCap },
    { id: 'lecture', label: 'Lecture', icon: Video },
    { id: 'institutes', label: 'Institutes', icon: Building2 }
  ] as const;


  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0D0D0C]/98 border-t border-[#1A1A1A] shadow-2xl h-[64px] xs:h-[76px] px-1 xs:px-4 md:px-8 flex justify-around items-center backdrop-blur-md select-none font-sans">
      <div className="flex justify-around items-center w-full max-w-5xl mx-auto h-full gap-0.5 xs:gap-1.5 flex-nowrap overflow-hidden">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = currentView === 'explore' && activeExploreTab === t.id;
          
          return (
            <button
              key={t.id}
              onClick={() => onTabSelect(t.id)}
              className="flex-1 min-w-0 h-full flex flex-col items-center justify-center cursor-pointer relative py-0.5 focus:outline-none transition-all duration-200"
            >
              <div 
                className={`flex flex-col items-center justify-center transition-all duration-300 w-full max-w-[50px] xs:max-w-[76px] sm:max-w-[96px] min-w-0 ${
                  isActive 
                    ? 'text-white' 
                    : 'text-zinc-500 hover:text-white opacity-65 hover:opacity-100'
                }`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <Icon className="w-[18px] h-[18px] xs:w-[21px] xs:h-[21px] sm:w-[24px] sm:h-[24px] mb-0.5 transition-colors" strokeWidth={1.8} />
                <span className={`text-[8px] xs:text-[10px] sm:text-[11px] tracking-tight text-center leading-normal truncate w-full px-0.5 ${
                  isActive ? 'font-semibold' : 'font-normal'
                }`}>
                  {t.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

