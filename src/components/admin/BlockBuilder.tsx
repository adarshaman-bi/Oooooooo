import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import {
  Sparkles,
  MoveUp,
  MoveDown,
  Trash2,
  Copy,
  Plus,
  Eye,
  EyeOff,
  Sliders,
  Bell,
  Volume2,
  Tv,
  Settings,
  RefreshCw,
  Layout,
  Tag,
  CheckCircle,
  HelpCircle,
  FolderMinus,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// SECTION 1.2: Strict Schema Matrix interfaces
export interface AnnouncementBarConfig {
  id: string;
  text: string;
  backgroundColor: string; // e.g. '#4f46e5' or bg-indigo-600
  textColor: string;
  isActive: boolean;
  linkUrl: string | null;
  displayUntil: string | null;
}

export interface HeroBannerSlide {
  id: string;
  title: string;
  subtitle: string | null;
  backgroundImagePath: string; // url resolving through SafeImage
  ctaLink: string;
  ctaText: string;
  sortOrder: number;
  gradientOverlay: string; // e.g. 'from-slate-950/90 to-transparent'
}

export interface GlobalNotificationBroadcast {
  id: string;
  title: string;
  body: string;
  targetExam: 'NEET' | 'JEE' | 'CUET' | 'ALL';
  tierVisibility: 'FREE' | 'PRO' | 'MAX' | 'ALL';
  actionUrl: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface LayoutSectionBlock {
  id: string;
  type: 'HERO_CAROUSEL' | 'TRENDING_TEACHERS' | 'FEATURED_INSTITUTES' | 'SPONSORED_TESTS' | 'CUSTOM_BANNER_AD';
  title: string;
  isVisible: boolean;
  sortOrder: number;
  queryLimit: number;
  displayStyle: 'GRID' | 'CAROUSEL' | 'MINI_LIST';
  customStyles: {
    paddingY: string; // e.g. 'py-6', 'py-12'
    themeBackground: string; // e.g. 'bg-black', 'bg-zinc-950', etc.
  };
}

export interface GlobalLayoutConfig {
  announcementBar: AnnouncementBarConfig;
  heroSlides: HeroBannerSlide[];
  layoutBlocks: LayoutSectionBlock[];
  notificationBroadcasts: GlobalNotificationBroadcast[];
}

const DEFAULT_LAYOUT_CONFIG: GlobalLayoutConfig = {
  announcementBar: {
    id: 'annbar_default',
    text: '⚡ Biovised Premium Live Test Series is Open for JEE/NEET 2026! Flat 15% Early bird code: KOTA15',
    backgroundColor: '#3b82f6',
    textColor: '#ffffff',
    isActive: true,
    linkUrl: 'https://biovised.in/tests',
    displayUntil: '2026-07-01'
  },
  heroSlides: [
    {
      id: 'slide_1',
      title: 'Kota Masterclasses on Demand',
      subtitle: 'Complete Organic Chemistry & Modern Physics by elite educators',
      backgroundImagePath: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
      ctaLink: 'https://biovised.in/playlists',
      ctaText: 'Explore Playlists',
      sortOrder: 0,
      gradientOverlay: 'from-[#030712]/95 via-[#030712]/75 to-transparent'
    },
    {
      id: 'slide_2',
      title: 'Verify Your Educator Profile',
      subtitle: 'Get verified badges via official Knowledge Graph Search matching matrices',
      backgroundImagePath: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80',
      ctaLink: 'https://biovised.in/moderator',
      ctaText: 'Claim Profile',
      sortOrder: 1,
      gradientOverlay: 'from-[#030712]/90 via-[#030712]/60 to-transparent'
    }
  ],
  layoutBlocks: [
    {
      id: 'block_hero',
      type: 'HERO_CAROUSEL',
      title: 'Curated Master Classes',
      isVisible: true,
      sortOrder: 0,
      queryLimit: 1,
      displayStyle: 'CAROUSEL',
      customStyles: { paddingY: 'py-4', themeBackground: 'bg-transparent' }
    },
    {
      id: 'block_teachers',
      type: 'TRENDING_TEACHERS',
      title: 'Trending Registered Educators',
      isVisible: true,
      sortOrder: 1,
      queryLimit: 6,
      displayStyle: 'GRID',
      customStyles: { paddingY: 'py-6', themeBackground: 'bg-transparent' }
    },
    {
      id: 'block_institutes',
      type: 'FEATURED_INSTITUTES',
      title: 'Official Partner Academies',
      isVisible: true,
      sortOrder: 2,
      queryLimit: 4,
      displayStyle: 'CAROUSEL',
      customStyles: { paddingY: 'py-8', themeBackground: 'bg-zinc-950' }
    },
    {
      id: 'block_tests',
      type: 'SPONSORED_TESTS',
      title: 'Featured Mock Test Papers',
      isVisible: true,
      sortOrder: 3,
      queryLimit: 3,
      displayStyle: 'GRID',
      customStyles: { paddingY: 'py-6', themeBackground: 'bg-transparent' }
    }
  ],
  notificationBroadcasts: [
    {
      id: 'broadcast_1',
      title: 'NTA Exam Pattern Amendment 2026',
      body: 'Verified updates to MCQ section timings and marking schemes for NEET Physics.',
      targetExam: 'NEET',
      tierVisibility: 'ALL',
      actionUrl: '/notifications',
      createdAt: '2026-06-19T02:00:00Z',
      expiresAt: '2026-06-30T00:00:00Z'
    },
    {
      id: 'broadcast_2',
      title: 'IIT Physics Mechanics Cheat Sheet',
      body: 'Kota premium equations review sheet published by HC Verma certified profiles.',
      targetExam: 'JEE',
      tierVisibility: 'PRO',
      actionUrl: '/material',
      createdAt: '2026-06-18T10:00:00Z',
      expiresAt: '2026-06-25T00:00:00Z'
    }
  ]
};

export default function BlockBuilder() {
  const { user } = useAuth();
  const [config, setConfig] = useState<GlobalLayoutConfig>(DEFAULT_LAYOUT_CONFIG);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>('annbar_default');
  const [selectedBlockType, setSelectedBlockType] = useState<'ANNOUNCEMENT' | 'SLIDE' | 'LAYOUT' | 'BROADCAST' | null>('ANNOUNCEMENT');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Load layout configurations from supabase layout_blocks table
  useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('layout_blocks')
          .select('*')
          .eq('id', 'global_layout_config')
          .single();

        if (error) {
          // If PGRST116 (JSON/single object not found), insert the default
          if (error.code === 'PGRST116') {
            const { error: insertError } = await supabase.from('layout_blocks').insert({
              id: 'global_layout_config',
              type: 'global_layout_config',
              title: 'Global Layout Configuration',
              sort_order: 0,
              is_active: true,
              config: DEFAULT_LAYOUT_CONFIG
            });
            if (insertError) throw insertError;
            setConfig(DEFAULT_LAYOUT_CONFIG);
          } else {
            throw error;
          }
        } else if (data && data.config) {
          const fetched = data.config as GlobalLayoutConfig;
          
          // Make sure properties exist to prevent older partial seed failures
          const completeConfig: GlobalLayoutConfig = {
            announcementBar: fetched.announcementBar || DEFAULT_LAYOUT_CONFIG.announcementBar,
            heroSlides: fetched.heroSlides || DEFAULT_LAYOUT_CONFIG.heroSlides,
            layoutBlocks: Array.isArray(fetched.layoutBlocks) ? fetched.layoutBlocks.sort((a,b) => a.sortOrder - b.sortOrder) : DEFAULT_LAYOUT_CONFIG.layoutBlocks,
            notificationBroadcasts: fetched.notificationBroadcasts || DEFAULT_LAYOUT_CONFIG.notificationBroadcasts,
          };
          setConfig(completeConfig);
        }
      } catch (err) {
        console.error('Failed to load global layout configuration:', err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  // Save layout configurations to supabase
  const handleSaveToProduction = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      const { error } = await supabase.from('layout_blocks').upsert({
        id: 'global_layout_config',
        type: 'global_layout_config',
        title: 'Global Layout Configuration',
        sort_order: 0,
        is_active: true,
        config: {
          ...config,
          updatedAt: new Date().toISOString()
        }
      });
      if (error) throw error;
      setSaveStatus('SUCCESS: Global layout config successfully synced with Production Supabase.');
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err) {
      console.error('Failed to save layout block builder configurations:', err);
      setSaveStatus('ERROR: ' + (err instanceof Error ? err.message : 'Permission Denied'));
    } finally {
      setSaving(false);
    }
  };

  // Move operations for Page blocks
  const handleMoveBlock = (index: number, direction: 'UP' | 'DOWN') => {
    const blocksCopy = [...config.layoutBlocks];
    if (direction === 'UP' && index > 0) {
      const temp = blocksCopy[index];
      blocksCopy[index] = blocksCopy[index - 1];
      blocksCopy[index - 1] = temp;
    } else if (direction === 'DOWN' && index < blocksCopy.length - 1) {
      const temp = blocksCopy[index];
      blocksCopy[index] = blocksCopy[index + 1];
      blocksCopy[index + 1] = temp;
    }
    
    // update sortOrder key
    const reordered = blocksCopy.map((blk, idx) => ({
      ...blk,
      sortOrder: idx
    }));
    setConfig({ ...config, layoutBlocks: reordered });
  };

  // Delete layout blocks
  const handleDeleteBlock = (id: string) => {
    const filtered = config.layoutBlocks.filter(b => b.id !== id).map((b, idx) => ({ ...b, sortOrder: idx }));
    setConfig({ ...config, layoutBlocks: filtered });
    if (selectedBlockId === id) {
      setSelectedBlockId('annbar_default');
      setSelectedBlockType('ANNOUNCEMENT');
    }
  };

  // Clone layout blocks
  const handleCloneBlock = (block: LayoutSectionBlock) => {
    const newId = `block_${Date.now()}`;
    const cloned: LayoutSectionBlock = {
      ...block,
      id: newId,
      title: `${block.title} (Copy)`,
      sortOrder: config.layoutBlocks.length
    };
    setConfig({
      ...config,
      layoutBlocks: [...config.layoutBlocks, cloned]
    });
  };

  // Add new block to page stack
  const handleAddNewBlock = (type: LayoutSectionBlock['type']) => {
    const newId = `block_${Date.now()}`;
    const newBlock: LayoutSectionBlock = {
      id: newId,
      type,
      title: `Custom ${type.replace('_', ' ')} Section`,
      isVisible: true,
      sortOrder: config.layoutBlocks.length,
      queryLimit: 4,
      displayStyle: 'GRID',
      customStyles: {
        paddingY: 'py-6',
        themeBackground: 'bg-transparent'
      }
    };
    setConfig({
      ...config,
      layoutBlocks: [...config.layoutBlocks, newBlock]
    });
    setSelectedBlockId(newId);
    setSelectedBlockType('LAYOUT');
    setSelectedIndex(config.layoutBlocks.length);
  };

  // Clone Slide item
  const handleCloneSlide = (index: number) => {
    const slides = [...config.heroSlides];
    const original = slides[index];
    const cloned: HeroBannerSlide = {
      ...original,
      id: `slide_${Date.now()}`,
      title: `${original.title} (Copy)`,
      sortOrder: slides.length
    };
    setConfig({
      ...config,
      heroSlides: [...slides, cloned]
    });
  };

  // Delete Slide item
  const handleDeleteSlide = (index: number) => {
    const remaining = config.heroSlides.filter((_, idx) => idx !== index).map((s, idx) => ({ ...s, sortOrder: idx }));
    setConfig({ ...config, heroSlides: remaining });
    if (selectedBlockType === 'SLIDE') {
      setSelectedBlockId('annbar_default');
      setSelectedBlockType('ANNOUNCEMENT');
    }
  };

  // Add new Slide item
  const handleAddNewSlide = () => {
    const newSlide: HeroBannerSlide = {
      id: `slide_${Date.now()}`,
      title: 'Exclusive Educator Seminar',
      subtitle: 'Premium masterclasses led by kota verified veteran authors',
      backgroundImagePath: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80',
      ctaLink: '/teachers',
      ctaText: 'View Educators',
      sortOrder: config.heroSlides.length,
      gradientOverlay: 'from-[#030712]/92 via-[#030712]/70 to-transparent'
    };
    setConfig({
      ...config,
      heroSlides: [...config.heroSlides, newSlide]
    });
  };

  // Clone Notification
  const handleCloneBroadcast = (index: number) => {
    const items = [...config.notificationBroadcasts];
    const original = items[index];
    const cloned: GlobalNotificationBroadcast = {
      ...original,
      id: `broadcast_${Date.now()}`,
      title: `${original.title} [CLONED]`,
      createdAt: new Date().toISOString()
    };
    setConfig({
      ...config,
      notificationBroadcasts: [...items, cloned]
    });
  };

  // Delete Notification
  const handleDeleteBroadcast = (index: number) => {
    const remaining = config.notificationBroadcasts.filter((_, idx) => idx !== index);
    setConfig({ ...config, notificationBroadcasts: remaining });
    if (selectedBlockType === 'BROADCAST') {
      setSelectedBlockId('annbar_default');
      setSelectedBlockType('ANNOUNCEMENT');
    }
  };

  // Add Notification
  const handleAddNewBroadcast = () => {
    const newBroadcast: GlobalNotificationBroadcast = {
      id: `broadcast_${Date.now()}`,
      title: 'Admissions and Seat Matrix Release 2026',
      body: 'Verified allocation seats guidelines published by official counselors.',
      targetExam: 'ALL',
      tierVisibility: 'ALL',
      actionUrl: '/notifs',
      createdAt: new Date().toISOString(),
      expiresAt: '2026-07-31T23:59:59Z'
    };
    setConfig({
      ...config,
      notificationBroadcasts: [...config.notificationBroadcasts, newBroadcast]
    });
  };

  if(!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return (
      <div className="p-8 m-4 rounded-xl bg-red-950/20 border border-red-500/20 space-y-3 max-w-xl mx-auto text-center font-mono">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-rose-400">ADMINISTRATIVE CLEARANCE FAILURE</h3>
        <p className="text-xs text-zinc-400">
          This system is strictly isolated. You must enter representing an authorized staff console profile in order to override theme configurations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none animate-fade-in text-white font-sans max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8">
      {/* Header and status bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div className="space-y-1 text-left">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-indigo-505/20 text-indigo-400">
              <Layout className="w-6 h-6" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white uppercase font-display select-none">
              Shopify-Style Custom Block Customizer
            </h2>
          </div>
          <p className="text-xs text-zinc-400 font-mono">
            Directly configure landing matrices, hero lists, banner hierarchies, and exam alerts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveStatus && (
            <div className={`text-[11px] font-mono p-2.5 rounded-lg border ${
              saveStatus.startsWith('SUCCESS') 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
              {saveStatus}
            </div>
          )}

          <button
            onClick={handleSaveToProduction}
            disabled={saving || loading}
            type="button"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold px-5 py-3 rounded-lg flex items-center gap-2 shadow-lg hover:shadow-indigo-500/20 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Publish Layout Draft
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-indigo-400 flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <p>Initialising Visual Block Customisation Engines...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Page stack configuration lists (Shopify Sidebar) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#0B0B0C] border border-[#1E1E22] rounded-xl p-4 space-y-4">
              <h3 className="text-xs font-bold text-zinc-400 tracking-wider font-mono uppercase pb-2 border-b border-zinc-800">
                LAYOUT STACK MANAGER
              </h3>

              {/* BAR CUSTOMIZER BUTTON */}
              <button
                type="button"
                onClick={() => {
                  setSelectedBlockId('annbar_default');
                  setSelectedBlockType('ANNOUNCEMENT');
                }}
                className={`w-full text-left p-3 rounded-lg border transition-all text-xs flex items-center justify-between group ${
                  selectedBlockType === 'ANNOUNCEMENT'
                    ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-300'
                    : 'bg-zinc-900/30 border-zinc-800/80 hover:border-zinc-700/80 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="font-semibold font-mono">Announcement Bar</span>
                </div>
                <Settings className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
              </button>

              {/* SLIDERS STACK SECTION */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-bold">Hero Slides Carousel</span>
                  <button
                    onClick={handleAddNewSlide}
                    type="button"
                    className="p-1 rounded hover:bg-zinc-800 text-indigo-400 hover:text-indigo-350 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {config.heroSlides.map((slide, idx) => (
                    <div
                      key={slide.id}
                      onClick={() => {
                        setSelectedBlockId(slide.id);
                        setSelectedBlockType('SLIDE');
                        setSelectedIndex(idx);
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                        selectedBlockType === 'SLIDE' && selectedIndex === idx
                          ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-300'
                          : 'bg-[#121214] border-zinc-900 hover:border-zinc-800 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-[10px] font-mono text-zinc-500">#{idx+1}</span>
                        <p className="truncate font-medium">{slide.title}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCloneSlide(idx); }}
                          type="button"
                          className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white"
                          title="Clone Slide"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteSlide(idx); }}
                          type="button"
                          className="p-1 rounded hover:bg-zinc-700 text-rose-400 hover:text-rose-300"
                          title="Delete Slide"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* DYNAMIC LAYOUT BLOCKS STACK */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-bold">Homepage Blocks Stack</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleAddNewBlock('CUSTOM_BANNER_AD')}
                      type="button"
                      className="text-[9px] font-mono bg-zinc-900 border border-zinc-800 hover:border-indigo-500/30 text-indigo-350 px-2 py-0.5 rounded cursor-pointer transition-all"
                    >
                      + Custom Banner
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {config.layoutBlocks.map((block, idx) => (
                    <div
                      key={block.id}
                      onClick={() => {
                        setSelectedBlockId(block.id);
                        setSelectedBlockType('LAYOUT');
                        setSelectedIndex(idx);
                      }}
                      className={`group/item flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                        selectedBlockType === 'LAYOUT' && selectedIndex === idx
                          ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-300'
                          : 'bg-[#121214] border-zinc-900 hover:border-zinc-800 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="flex flex-col text-[8px] text-zinc-500 font-mono">
                          <button
                            disabled={idx === 0}
                            onClick={(e) => { e.stopPropagation(); handleMoveBlock(idx, 'UP'); }}
                            type="button"
                            className="hover:text-indigo-400 disabled:opacity-20 cursor-pointer"
                          >
                            ▲
                          </button>
                          <button
                            disabled={idx === config.layoutBlocks.length - 1}
                            onClick={(e) => { e.stopPropagation(); handleMoveBlock(idx, 'DOWN'); }}
                            type="button"
                            className="hover:text-indigo-400 disabled:opacity-20 cursor-pointer"
                          >
                            ▼
                          </button>
                        </div>
                        <div className="truncate text-left">
                          <p className="font-medium truncate leading-tight">{block.title}</p>
                          <span className="text-[9px] font-mono text-zinc-500">{block.type}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const blocks = [...config.layoutBlocks];
                            blocks[idx].isVisible = !blocks[idx].isVisible;
                            setConfig({ ...config, layoutBlocks: blocks });
                          }}
                          type="button"
                          className="p-1 rounded hover:bg-zinc-700 text-zinc-400"
                          title={block.isVisible ? "Hide Block" : "Show Block"}
                        >
                          {block.isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-zinc-650" />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCloneBlock(block); }}
                          type="button"
                          className="p-1 rounded hover:bg-zinc-700 text-zinc-400"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteBlock(block.id); }}
                          type="button"
                          className="p-1 rounded hover:bg-zinc-700 text-rose-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GLOBAL NOTIFICATION BROADCASTS */}
              <div className="space-y-2 pt-2 border-t border-zinc-900">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-bold">Push Broadcast Alerts</span>
                  <button
                    onClick={handleAddNewBroadcast}
                    type="button"
                    className="p-1 rounded hover:bg-zinc-800 text-indigo-400 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {config.notificationBroadcasts.map((notif, idx) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        setSelectedBlockId(notif.id);
                        setSelectedBlockType('BROADCAST');
                        setSelectedIndex(idx);
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                        selectedBlockType === 'BROADCAST' && selectedIndex === idx
                          ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-300'
                          : 'bg-[#121214] border-zinc-900 hover:border-zinc-800 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Bell className="w-3.5 h-3.5 text-indigo-400" />
                        <div className="truncate text-left">
                          <p className="font-medium truncate">{notif.title}</p>
                          <span className="text-[8px] font-mono px-1 rounded bg-indigo-950 text-indigo-400">
                            {notif.targetExam} • {notif.tierVisibility}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCloneBroadcast(idx); }}
                          type="button"
                          className="p-1 rounded hover:bg-zinc-700 text-zinc-300"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteBroadcast(idx); }}
                          type="button"
                          className="p-1 rounded hover:bg-zinc-700 text-rose-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* CENTRE COLUMN: Contextual Property Inspector Form (Right Panel) */}
          <div className="lg:col-span-4 max-h-[80vh] overflow-y-auto">
            <div className="bg-[#0B0B0C] border border-[#1E1E22] rounded-xl p-5 space-y-5">
              <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-3">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold tracking-wider font-mono text-zinc-300 uppercase">
                  PROPERTY INSPECTOR FORM
                </h3>
              </div>

              {!selectedBlockType ? (
                <div className="p-8 text-center text-xs text-zinc-550 font-mono">
                  Select a card or collection item from the left panel stack to load customized parameters.
                </div>
              ) : (
                <div className="space-y-4 text-left">
                  
                  {/* ANNOUNCEMENT TYPE */}
                  {selectedBlockType === 'ANNOUNCEMENT' && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold font-mono text-zinc-400 uppercase">Notification Text</label>
                        <span className="text-[9px] text-zinc-500 float-right font-mono">150 Max</span>
                        <textarea
                          value={config.announcementBar.text}
                          onChange={(e) => {
                            setConfig({
                              ...config,
                              announcementBar: { ...config.announcementBar, text: e.target.value }
                            });
                          }}
                          maxLength={150}
                          rows={3}
                          className="w-full bg-[#131316] border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-white placeholder-zinc-700 font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold font-mono text-zinc-400 uppercase">Bg Color Code</label>
                          <input
                            type="color"
                            value={config.announcementBar.backgroundColor}
                            onChange={(e) => {
                              setConfig({
                                ...config,
                                announcementBar: { ...config.announcementBar, backgroundColor: e.target.value }
                              });
                            }}
                            className="w-full h-8 bg-transparent rounded cursor-pointer"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold font-mono text-zinc-400 uppercase">Text Color Code</label>
                          <input
                            type="color"
                            value={config.announcementBar.textColor}
                            onChange={(e) => {
                              setConfig({
                                ...config,
                                announcementBar: { ...config.announcementBar, textColor: e.target.value }
                              });
                            }}
                            className="w-full h-8 bg-transparent rounded cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold font-mono text-zinc-400 uppercase">Redirect URL / Link path</label>
                        <input
                          type="text"
                          value={config.announcementBar.linkUrl || ''}
                          onChange={(e) => {
                            setConfig({
                              ...config,
                              announcementBar: { ...config.announcementBar, linkUrl: e.target.value || null }
                            });
                          }}
                          placeholder="e.g. /tests or https://..."
                          className="w-full bg-[#131316] border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-white placeholder-zinc-750 font-mono focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg border border-zinc-850">
                        <span className="text-xs font-medium text-zinc-300 font-mono">Show Banner Live</span>
                        <input
                          type="checkbox"
                          checked={config.announcementBar.isActive}
                          onChange={(e) => {
                            setConfig({
                              ...config,
                              announcementBar: { ...config.announcementBar, isActive: e.target.checked }
                            });
                          }}
                          className="w-4 h-4 text-indigo-600 rounded bg-[#131316] border-zinc-800 cursor-pointer focus:ring-0 focus:ring-offset-0"
                        />
                      </div>
                    </div>
                  )}

                  {/* SLIDE TYPE */}
                  {selectedBlockType === 'SLIDE' && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold font-mono text-zinc-400 uppercase">Slide Banner Title</label>
                        <input
                          type="text"
                          value={config.heroSlides[selectedIndex]?.title || ''}
                          onChange={(e) => {
                            const slides = [...config.heroSlides];
                            slides[selectedIndex] = { ...slides[selectedIndex], title: e.target.value };
                            setConfig({ ...config, heroSlides: slides });
                          }}
                          className="w-full bg-[#131316] border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-white placeholder-zinc-750 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold font-mono text-zinc-400 uppercase">Subtitle / Subtext String</label>
                        <input
                          type="text"
                          value={config.heroSlides[selectedIndex]?.subtitle || ''}
                          onChange={(e) => {
                            const slides = [...config.heroSlides];
                            slides[selectedIndex] = { ...slides[selectedIndex], subtitle: e.target.value || null };
                            setConfig({ ...config, heroSlides: slides });
                          }}
                          className="w-full bg-[#131316] border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-white placeholder-zinc-750 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold font-mono text-zinc-400 uppercase">Backdrop Image URL (Aspect-Video)</label>
                        <input
                          type="text"
                          value={config.heroSlides[selectedIndex]?.backgroundImagePath || ''}
                          onChange={(e) => {
                            const slides = [...config.heroSlides];
                            slides[selectedIndex] = { ...slides[selectedIndex], backgroundImagePath: e.target.value };
                            setConfig({ ...config, heroSlides: slides });
                          }}
                          className="w-full bg-[#131316] border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-white placeholder-zinc-750 font-mono focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold font-mono text-zinc-400 uppercase">Button CTA Link</label>
                          <input
                            type="text"
                            value={config.heroSlides[selectedIndex]?.ctaLink || ''}
                            onChange={(e) => {
                              const slides = [...config.heroSlides];
                              slides[selectedIndex] = { ...slides[selectedIndex], ctaLink: e.target.value };
                              setConfig({ ...config, heroSlides: slides });
                            }}
                            className="w-full bg-[#131316] border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-white placeholder-zinc-750 font-mono focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold font-mono text-zinc-400 uppercase">Button CTA Text</label>
                          <input
                            type="text"
                            value={config.heroSlides[selectedIndex]?.ctaText || ''}
                            onChange={(e) => {
                              const slides = [...config.heroSlides];
                              slides[selectedIndex] = { ...slides[selectedIndex], ctaText: e.target.value };
                              setConfig({ ...config, heroSlides: slides });
                            }}
                            className="w-full bg-[#131316] border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-white placeholder-zinc-750 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold font-mono text-zinc-400 uppercase">Tailwind Overlay Preset</label>
                        <select
                          value={config.heroSlides[selectedIndex]?.gradientOverlay || 'from-[#030712]/90 via-[#030712]/60 to-transparent'}
                          onChange={(e) => {
                            const slides = [...config.heroSlides];
                            slides[selectedIndex] = { ...slides[selectedIndex], gradientOverlay: e.target.value };
                            setConfig({ ...config, heroSlides: slides });
                          }}
                          className="w-full bg-[#131316] border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                        >
                          <option value="from-slate-950/80 to-transparent">Classic Slate-950 Overlay</option>
                          <option value="from-[#030712]/95 via-[#030712]/75 to-transparent">Deep Obsidian Overlay</option>
                          <option value="from-indigo-950/70 via-black/85 to-transparent">Subtle Blue Overlay</option>
                          <option value="from-transparent to-transparent">No overlay</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* LAYOUT BLOCK TYPE */}
                  {selectedBlockType === 'LAYOUT' && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold font-mono text-zinc-400 uppercase">Block Section Header Title</label>
                        <input
                          type="text"
                          value={config.layoutBlocks[selectedIndex]?.title || ''}
                          onChange={(e) => {
                            const blocks = [...config.layoutBlocks];
                            blocks[selectedIndex] = { ...blocks[selectedIndex], title: e.target.value };
                            setConfig({ ...config, layoutBlocks: blocks });
                          }}
                          className="w-full bg-[#131316] border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-white placeholder-zinc-750 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold font-mono text-zinc-400 uppercase">Display Mode Style</label>
                          <select
                            value={config.layoutBlocks[selectedIndex]?.displayStyle || 'GRID'}
                            onChange={(e) => {
                              const blocks = [...config.layoutBlocks];
                              blocks[selectedIndex] = { ...blocks[selectedIndex], displayStyle: e.target.value as any };
                              setConfig({ ...config, layoutBlocks: blocks });
                            }}
                            className="w-full bg-[#131316] border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                          >
                            <option value="GRID">Standard Bento Grid</option>
                            <option value="CAROUSEL">Horizontal Swipe Carousel</option>
                            <option value="MINI_LIST">Compact Mini List</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold font-mono text-zinc-400 uppercase">Record Query Limit</label>
                          <input
                            type="number"
                            min={1}
                            max={12}
                            value={config.layoutBlocks[selectedIndex]?.queryLimit || 4}
                            onChange={(e) => {
                              const blocks = [...config.layoutBlocks];
                              blocks[selectedIndex] = { ...blocks[selectedIndex], queryLimit: Number(e.target.value) };
                              setConfig({ ...config, layoutBlocks: blocks });
                            }}
                            className="w-full bg-[#131316] border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-white placeholder-zinc-750 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold font-mono text-zinc-400 uppercase">Vertical Padding</label>
                          <select
                            value={config.layoutBlocks[selectedIndex]?.customStyles.paddingY || 'py-6'}
                            onChange={(e) => {
                              const blocks = [...config.layoutBlocks];
                              blocks[selectedIndex] = {
                                ...blocks[selectedIndex],
                                customStyles: { ...blocks[selectedIndex].customStyles, paddingY: e.target.value }
                              };
                              setConfig({ ...config, layoutBlocks: blocks });
                            }}
                            className="w-full bg-[#131316] border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                          >
                            <option value="py-2">py-2 (Sleek)</option>
                            <option value="py-4">py-4 (Standard)</option>
                            <option value="py-6">py-6 (Spacious)</option>
                            <option value="py-12">py-12 (Gala Banner)</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold font-mono text-zinc-400 uppercase">Workspace Canvas Bg</label>
                          <select
                            value={config.layoutBlocks[selectedIndex]?.customStyles.themeBackground || 'bg-transparent'}
                            onChange={(e) => {
                              const blocks = [...config.layoutBlocks];
                              blocks[selectedIndex] = {
                                ...blocks[selectedIndex],
                                customStyles: { ...blocks[selectedIndex].customStyles, themeBackground: e.target.value }
                              };
                              setConfig({ ...config, layoutBlocks: blocks });
                            }}
                            className="w-full bg-[#131316] border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                          >
                            <option value="bg-transparent">bg-transparent</option>
                            <option value="bg-[#0e0e11]">bg-black-slate</option>
                            <option value="bg-zinc-950">bg-obsidian-950</option>
                            <option value="bg-indigo-950/20">bg-deep-indigo-haze</option>
                          </select>
                        </div>
                      </div>

                      <div className="p-3 bg-zinc-900/30 rounded-lg border border-zinc-850 space-y-1 text-xs text-zinc-400">
                        <span className="font-bold text-[10px] font-mono uppercase text-indigo-400 block">BLOCK SYSTEM INTEGRITY</span>
                        <p>ID: <span className="font-mono text-[10px] text-zinc-200">{config.layoutBlocks[selectedIndex]?.id}</span></p>
                        <p>Structural Role: <span className="font-mono text-[10px] text-zinc-200">{config.layoutBlocks[selectedIndex]?.type}</span></p>
                      </div>
                    </div>
                  )}

                  {/* BROADCAST BLOCKS TYPE */}
                  {selectedBlockType === 'BROADCAST' && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold font-mono text-zinc-400 uppercase">Alert Title Header</label>
                        <input
                          type="text"
                          value={config.notificationBroadcasts[selectedIndex]?.title || ''}
                          onChange={(e) => {
                            const items = [...config.notificationBroadcasts];
                            items[selectedIndex] = { ...items[selectedIndex], title: e.target.value };
                            setConfig({ ...config, notificationBroadcasts: items });
                          }}
                          className="w-full bg-[#131316] border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-white placeholder-zinc-750 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold font-mono text-zinc-400 uppercase">Broadcast Subtext Content Body</label>
                        <textarea
                          value={config.notificationBroadcasts[selectedIndex]?.body || ''}
                          onChange={(e) => {
                            const items = [...config.notificationBroadcasts];
                            items[selectedIndex] = { ...items[selectedIndex], body: e.target.value };
                            setConfig({ ...config, notificationBroadcasts: items });
                          }}
                          rows={3}
                          className="w-full bg-[#131316] border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-white placeholder-zinc-750 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold font-mono text-zinc-400 uppercase">Target Exam Scoping</label>
                          <select
                            value={config.notificationBroadcasts[selectedIndex]?.targetExam || 'ALL'}
                            onChange={(e) => {
                              const items = [...config.notificationBroadcasts];
                              items[selectedIndex] = { ...items[selectedIndex], targetExam: e.target.value as any };
                              setConfig({ ...config, notificationBroadcasts: items });
                            }}
                            className="w-full bg-[#131316] border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                          >
                            <option value="ALL">ALL (JEE/NEET/CUET)</option>
                            <option value="JEE">JEE Main & Advanced</option>
                            <option value="NEET">NEET Medical</option>
                            <option value="CUET">CUET UG</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold font-mono text-zinc-400 uppercase">Account Tier Visibility</label>
                          <select
                            value={config.notificationBroadcasts[selectedIndex]?.tierVisibility || 'ALL'}
                            onChange={(e) => {
                              const items = [...config.notificationBroadcasts];
                              items[selectedIndex] = { ...items[selectedIndex], tierVisibility: e.target.value as any };
                              setConfig({ ...config, notificationBroadcasts: items });
                            }}
                            className="w-full bg-[#131316] border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                          >
                            <option value="ALL">ALL Tiers</option>
                            <option value="FREE">FREE Account Tier Only</option>
                            <option value="PRO">PRO Subscription Tier</option>
                            <option value="MAX">MAX Premium Access</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold font-mono text-zinc-400 uppercase">Target Action path URL</label>
                          <input
                            type="text"
                            value={config.notificationBroadcasts[selectedIndex]?.actionUrl || ''}
                            onChange={(e) => {
                              const items = [...config.notificationBroadcasts];
                              items[selectedIndex] = { ...items[selectedIndex], actionUrl: e.target.value || null };
                              setConfig({ ...config, notificationBroadcasts: items });
                            }}
                            className="w-full bg-[#131316] border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold font-mono text-zinc-400 uppercase">Expiry Date Preset</label>
                          <input
                            type="date"
                            value={config.notificationBroadcasts[selectedIndex]?.expiresAt?.substring(0, 10) || ''}
                            onChange={(e) => {
                              const items = [...config.notificationBroadcasts];
                              items[selectedIndex] = {
                                ...items[selectedIndex],
                                expiresAt: e.target.value ? `${e.target.value}T23:59:59Z` : '2026-12-31T23:59:59Z'
                              };
                              setConfig({ ...config, notificationBroadcasts: items });
                            }}
                            className="w-full bg-[#131316] border border-zinc-800 focus:border-indigo-500 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>

          {/* MAIN PREVIEW AREA: Component shadow rendering for high-fidelity real-time feedback */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#0B0B0C] border border-[#1E1E22] rounded-xl p-4 flex flex-col h-[80vh]">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2 mb-4 shrink-0">
                <span className="text-[10px] font-mono tracking-widest font-extrabold uppercase text-indigo-400 flex items-center gap-1">
                  <Tv className="w-3.5 h-3.5" /> LIVE RE-RENDER ENGINE
                </span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-mono uppercase bg-neutral-900 border border-neutral-800 text-neutral-520">
                  SHADOW PREVIEW
                </span>
              </div>

              {/* Dynamic canvas simulator */}
              <div className="flex-grow bg-[#050505] rounded-lg border border-zinc-900 overflow-y-auto style-scrollbar relative text-left">
                
                {/* ANNOUNCEMENT BAR */}
                {config.announcementBar.isActive && (
                  <div
                    style={{
                      backgroundColor: config.announcementBar.backgroundColor,
                      color: config.announcementBar.textColor
                    }}
                    className="py-1.5 px-3 text-center text-[9px] font-mono tracking-tight font-medium select-none truncate h-6 relative z-10 block"
                  >
                    {config.announcementBar.text || 'Simulated Official announcement details...'}
                  </div>
                )}

                {/* SIMULATED CLIENT NAVIGATION HEADER */}
                <div className="bg-[#09090A] border-b border-neutral-850 px-3 py-2 flex items-center justify-between text-[10px] font-mono text-zinc-400 select-none h-10 sticky top-0">
                  <div className="flex items-center gap-1.5 z-20">
                    <span className="text-white text-xs font-bold tracking-tight uppercase">Biovised</span>
                    <span className="text-[8px] bg-indigo-950 text-indigo-400 border border-indigo-900 px-1 rounded-sm uppercase">PREVIEW</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="hover:text-white transition-colors cursor-pointer select-none">Explore</span>
                    <span className="hover:text-white transition-colors cursor-pointer select-none text-zinc-600">Tests</span>
                    <span className="hover:text-white transition-colors cursor-pointer select-none text-zinc-650">Educators</span>
                  </div>
                </div>

                {/* PREVIEW CONTAINER */}
                <div className="relative">
                  
                  {/* Dynamic Custom Layout Banners */}
                  {config.layoutBlocks.filter(b => b.isVisible).map((blk, idx) => {
                    if (blk.type === 'HERO_CAROUSEL') {
                      return (
                        <div key={blk.id} className="relative aspect-video w-full select-none overflow-hidden bg-black border-b border-zinc-900">
                          {config.heroSlides.length > 0 ? (
                            <div className="w-full h-full relative">
                              <img
                                referrerPolicy="no-referrer"
                                src={config.heroSlides[0]?.backgroundImagePath}
                                alt="Slide preview banner"
                                className="w-full h-full object-cover pr-0 bg-[#070708] aspect-video animate-fade-in"
                              />
                              {/* Overlay */}
                              <div className="absolute inset-0 bg-gradient-to-tr from-[#030712]/95 via-[#030712]/60 to-transparent" />
                              <div className="absolute bottom-3 left-3 space-y-1 max-w-[85%] z-10 text-left">
                                <span className="text-[8px] uppercase tracking-wider font-mono font-bold bg-indigo-600 px-1.5 py-0.5 rounded">
                                  {blk.title}
                                </span>
                                <h4 className="text-sm font-bold font-display text-white tracking-tight leading-snug">
                                  {config.heroSlides[0]?.title}
                                </h4>
                                <p className="text-[9px] text-zinc-400 font-sans leading-relaxed line-clamp-2">
                                  {config.heroSlides[0]?.subtitle}
                                </p>
                                <button
                                  type="button"
                                  className="mt-1 bg-white hover:bg-neutral-100 text-black text-[9px] font-mono px-2 py-1 rounded transition-colors text-left font-bold"
                                >
                                  {config.heroSlides[0]?.ctaText || 'Inspect'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="p-8 text-center text-[10px] text-zinc-600 font-mono">No Active Slide Media</div>
                          )}
                        </div>
                      );
                    }

                    if (blk.type === 'TRENDING_TEACHERS') {
                      return (
                        <div key={blk.id} className={`${blk.customStyles.paddingY} ${blk.customStyles.themeBackground} px-3 border-b border-zinc-900/40 space-y-2 text-left`}>
                          <div className="flex justify-between items-center text-xs">
                            <h4 className="font-bold text-white tracking-tight">{blk.title}</h4>
                            <span className="text-[8px] font-mono text-zinc-500">Limits: {blk.queryLimit}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            {Array.from({ length: Math.min(4, blk.queryLimit) }).map((_, i) => (
                              <div key={i} className="bg-zinc-900 p-2 rounded-lg border border-zinc-855 flex items-center gap-1.5 select-none hover:border-zinc-700 transition-all">
                                <div className="w-6 h-6 rounded-full bg-[#EEEEEE] border border-white/10 shrink-0 flex items-center justify-center font-bold text-[9px] text-black">
                                  T{i+1}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[9px] font-semibold text-white truncate text-left">Kota Educator {i+1}</p>
                                  <span className="text-[8px] font-mono text-ratings font-bold">★ 4.9</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    if (blk.type === 'FEATURED_INSTITUTES') {
                      return (
                        <div key={blk.id} className={`${blk.customStyles.paddingY} ${blk.customStyles.themeBackground} px-3 border-b border-zinc-900/40 space-y-2 text-left`}>
                          <h4 className="font-bold text-xs text-white">{blk.title}</h4>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {Array.from({ length: 3 }).map((_, i) => (
                              <div key={i} className="bg-[#0e0e11] border border-zinc-900 p-2 rounded-lg text-left select-none shrink-0 w-24 space-y-1">
                                <div className="w-5 h-5 bg-zinc-800 rounded-md"></div>
                                <p className="text-[8px] font-semibold text-zinc-300 truncate">Academy Core {i+1}</p>
                                <span className="text-[8px] font-mono text-indigo-400">JEE • NEET</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    if (blk.type === 'CUSTOM_BANNER_AD') {
                      return (
                        <div key={blk.id} className="p-3 bg-indigo-950/25 border-y border-indigo-900/50 my-1 flex items-center justify-between text-left select-none">
                          <div className="space-y-0.5">
                            <span className="text-[8px] font-bold font-mono text-indigo-400 uppercase tracking-widest block">SPECIAL SPONSORED PROMO</span>
                            <h5 className="text-[10px] font-bold text-white">{blk.title}</h5>
                            <span className="text-[8px] text-zinc-400 block font-sans">Learn key Organic Chemistry tips before Exam date</span>
                          </div>
                          <button className="bg-indigo-600 text-white font-mono text-[8px] font-bold px-2 py-1 rounded">
                            Register
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div key={blk.id} className="p-3 border-b border-zinc-900/60 text-xs text-zinc-400 text-left font-mono">
                        {blk.title} <span className="text-[8px] text-zinc-650 font-sans">({blk.type})</span>
                      </div>
                    );
                  })}
                  
                </div>

                {/* SIMULATED PUSH NOTIFICATION BOTTOM POPOUT */}
                {config.notificationBroadcasts.length > 0 && (
                  <div className="sticky bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black to-black/80 border-t border-indigo-900/30 z-30 space-y-1 block">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-mono text-indigo-400 uppercase tracking-wide font-extrabold flex items-center gap-1">
                        <Bell className="w-2.5 h-2.5 animate-bounce" /> Live Academic Alert
                      </span>
                    </div>
                    <div className="bg-[#0B0B0C] border border-[#1E1E22] p-1.5 rounded text-[9px] text-left">
                      <p className="font-semibold text-white leading-tight">{config.notificationBroadcasts[0]?.title}</p>
                      <p className="text-zinc-500 font-sans leading-normal text-[8px] line-clamp-1">{config.notificationBroadcasts[0]?.body}</p>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
