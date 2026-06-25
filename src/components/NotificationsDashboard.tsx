import { useAuth } from '../context/AuthContext';
import { AppNotification } from '../types';
import { Bell, ArrowLeft, Clock, Trash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationsDashboardProps {
  onViewDashboard: (view: 'explore' | 'profile' | 'moderator' | 'notifications' | 'search') => void;
  onOpenAuth?: () => void;
  notifications: AppNotification[];
  onDismiss: (id: string) => void;
  onNotificationClick: (n: AppNotification) => void;
  onMarkAllAsRead?: () => void;
}

export default function NotificationsDashboard({
  onViewDashboard,
  onOpenAuth,
  notifications,
  onDismiss,
  onNotificationClick,
  onMarkAllAsRead
}: NotificationsDashboardProps) {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center space-y-6">
        {/* Simple Return Link */}
        <button
          onClick={() => onViewDashboard('explore')}
          className="flex items-center gap-2 text-xs font-mono text-zinc-500 hover:text-white uppercase tracking-wider cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back Home
        </button>

        <div className="w-16 h-16 rounded-full bg-zinc-90 w-fit p-4 bg-zinc-900 flex items-center justify-center mx-auto text-zinc-400">
          <Bell className="w-8 h-8" />
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">Sign In Required</h2>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto font-sans">
              Please sign in to your student workspace to view educational notifications, batch rollouts, and portal updates.
            </p>
          </div>
          {onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="bg-white hover:bg-zinc-200 text-black text-xs font-bold py-2 px-6 rounded-full transition-all cursor-pointer shadow-lg"
            >
              Sign In Now
            </button>
          )}
        </div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return null;
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="w-full text-zinc-100 flex flex-col justify-start items-center relative py-6 px-4 md:px-8 select-none">
      
      <div className="w-full max-w-2xl mx-auto space-y-8 pt-2">
        
        {/* Dynamic header summary statistics inside the dashboard itself */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div>
            <h1 className="text-lg font-bold font-sans tracking-tight text-white flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Notifications Board
            </h1>
            <p className="text-xs text-zinc-500 font-mono mt-1">
              Active student stream: {notifications.length} logged alerts {unreadCount > 0 && `(${unreadCount} unread)`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && onMarkAllAsRead && (
              <button
                onClick={onMarkAllAsRead}
                className="text-[10px] text-zinc-300 hover:text-white uppercase tracking-wider font-bold font-mono py-1.5 px-3.5 bg-[#0F0F10] hover:bg-zinc-900 rounded-full cursor-pointer transition-all"
              >
                Mark All Read
              </button>
            )}
          </div>
        </div>

        {/* Notifications list frame */}
        <div className="space-y-4 overflow-visible">
          <p className="text-[10px] text-zinc-650 font-mono uppercase tracking-widest text-center">
            ← Swipe any notification left or right to dismiss →
          </p>

          <div className="space-y-3 overflow-visible">
            <AnimatePresence initial={false} mode="popLayout">
              {notifications.map((n) => (
                <div key={n.id} className="relative overflow-visible rounded-xl">
                  
                  {/* tactually-satisfying underlay for swipe-to-dismiss states */}
                  <div className="absolute inset-0 bg-rose-950/20 rounded-xl flex items-center justify-between px-6 text-rose-500/70 select-none pointer-events-none">
                    <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider">
                      <Trash className="w-4 h-4 animate-bounce" /> Dismissing
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider">
                      Dismissing <Trash className="w-4 h-4 animate-bounce" />
                    </div>
                  </div>

                  {/* Draggable container item */}
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.98, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ 
                      opacity: 0, 
                      scale: 0.95,
                      x: 250, 
                      height: 0, 
                      marginTop: 0, 
                      marginBottom: 0, 
                      paddingTop: 0, 
                      paddingBottom: 0, 
                      overflow: 'hidden' 
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={{ left: 0.8, right: 0.8 }}
                    onDragEnd={(event, info) => {
                      if (Math.abs(info.offset.x) > 130) {
                        onDismiss(n.id);
                      }
                    }}
                    onClick={() => onNotificationClick(n)}
                    className={`p-4 rounded-xl transition-all text-left relative flex gap-4 cursor-pointer active:cursor-grabbing select-none ${
                      n.read
                        ? 'bg-[#070708] text-zinc-550 hover:bg-[#0c0c0e]'
                        : 'bg-[#0D0D10] text-white hover:bg-[#111115] shadow-[0_4px_24px_rgba(255,255,255,0.015)]'
                    }`}
                  >
                    {/* Left category indicator */}
                    <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      n.read ? 'bg-zinc-905 text-zinc-650' : 'bg-white text-black font-extrabold'
                    }`}>
                      <Bell className="w-4 h-4" />
                    </div>

                    {/* Content column */}
                    <div className="space-y-1.5 min-w-0 flex-grow">
                      <div className="flex items-center justify-between gap-3">
                        <span className={`text-[8px] font-mono uppercase tracking-widest px-2 py-0.5 rounded font-extrabold ${
                          n.read ? 'bg-zinc-900 text-zinc-550' : 'bg-zinc-800 text-zinc-300'
                        }`}>
                          {n.type}
                        </span>

                        {n.createdAt && (
                          <span className="text-[9px] text-zinc-650 font-mono flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3" />
                            {new Date(n.createdAt).toLocaleDateString(undefined, { 
                              month: 'short', 
                              day: 'numeric', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold uppercase tracking-tight text-white/90 truncate">
                          {n.title}
                        </h4>
                        <p className="text-[11px] text-zinc-400 leading-relaxed font-sans mt-0.5">
                          {n.message}
                        </p>
                      </div>
                    </div>
                  </motion.div>

                </div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
