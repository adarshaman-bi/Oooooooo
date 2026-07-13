import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play, Pause, ChevronLeft, ChevronRight as ChevronRightIcon, Lock, Unlock, Settings,
  RotateCcw, RotateCw, Volume, Volume1, Volume2, VolumeX, Sun, Check, Expand, Shrink,
  Rows3, AlertTriangle, Flag, SkipBack, SkipForward, Moon
} from "lucide-react";

import { supabase } from "../utils/supabaseClient";

/**
 * BiovisedPlayer — the only video player component in this codebase.
 *
 * Device behavior is intentionally split, not shared:
 * - Mobile (coarse pointer): double-tap seek only, no visible ±10s buttons,
 *   vertical edge-swipe for brightness/volume works in BOTH inline and
 *   fullscreen (that was the bug — it used to only work in fullscreen).
 *   Portrait shows a stacked "video on top, info below" layout like the
 *   YouTube app; rotating to landscape (or tapping expand) goes video-only.
 * - Desktop (fine pointer): visible ±10s buttons, a YouTube-style hover
 *   volume slider next to a speaker icon (no edge-swipe, no brightness —
 *   there's no OS brightness hook available from a mouse anyway), full
 *   keyboard shortcut set.
 */

const PROGRESS_FILL = "#ffffff"; // played bar + thumb — white, the only "highlight" colour anywhere, matching real YouTube
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
// YouTube's IFrame API frequently never reports real quality levels (a known,
// long-standing deprecation on their end) — without a fallback, the Quality
// submenu is stuck on "Detecting available resolutions…" forever. This list
// is shown after a short grace period if the API hasn't given us anything.
const FALLBACK_QUALITIES = ["hd1080", "hd720", "large", "medium"];

export interface Lecture {
  id: string;
  title?: string;
  videoUrl?: string;
  youtubeVideoId?: string;
  teacherName?: string;
  subject?: string;
  examType?: string;
  description?: string;
  playlistId?: string;
}

interface BiovisedPlayerProps {
  lecture: Lecture;
  onClose: () => void;
  playlistLectures?: Lecture[];
  onSelectLecture?: (lecture: Lecture) => void;
}

const DEMO_LECTURE: Lecture = {
  id: "demo",
  title: "Periodic Table and Chemistry Periodicity One-Shot",
  videoUrl: "https://youtu.be/_G00r4phw-Y?si=3o5Jt3HmWjMyNc91",
  teacherName: "Demo Teacher",
  subject: "Chemistry",
  examType: "JEE",
  description: "A complete walkthrough of periodic trends, lanthanide and actinide series, and periodicity patterns relevant for JEE.",
};

const YT_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

function extractVideoId(lecture: Lecture): string | null {
  // 1. Explicit field wins
  if (lecture.youtubeVideoId) return lecture.youtubeVideoId;

  // 2. Parse videoUrl through all known YouTube URL formats
  if (lecture.videoUrl) {
    try {
      const u = new URL(lecture.videoUrl);
      // youtu.be/ID
      if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("?")[0];
      // youtube.com/watch?v=ID
      const v = u.searchParams.get("v");
      if (v) return v;
      // youtube.com/embed/ID  or  /shorts/ID  or  /v/ID
      const parts = u.pathname.split("/").filter(Boolean);
      const embedIdx = parts.findIndex(p => ["embed", "shorts", "v"].includes(p));
      if (embedIdx !== -1 && parts[embedIdx + 1]) return parts[embedIdx + 1];
      // Last path segment — if it looks like a YouTube ID, use it
      const last = parts[parts.length - 1];
      if (last && YT_ID_RE.test(last)) return last;
    } catch {
      // videoUrl is not a URL — check if it's a bare ID
      if (YT_ID_RE.test(lecture.videoUrl)) return lecture.videoUrl;
    }
  }

  // 3. Last resort: lecture.id itself is sometimes the YouTube video ID
  //    (LecturesGrid sets id = video.id which is the YouTube ID)
  if (lecture.id && YT_ID_RE.test(lecture.id)) return lecture.id;

  return null;
}

function VolumeIcon({ muted, volume, size, className }: { muted: boolean; volume: number; size: number; className: string }) {
  if (muted || volume === 0) return <VolumeX size={size} className={className} strokeWidth={2.25} />;
  if (volume < 50) return <Volume1 size={size} className={className} strokeWidth={2.25} />;
  return <Volume2 size={size} className={className} strokeWidth={2.25} />;
}

function qualityLabel(q: string) {
  const map: Record<string, string> = {
    auto: "Auto", hd2160: "2160p 4K", hd1440: "1440p", hd1080: "1080p",
    hd720: "720p", large: "480p", medium: "360p", small: "240p", tiny: "144p",
  };
  return map[q] || q;
}

function fmt(t: number) {
  if (!isFinite(t) || t < 0) return "0:00";
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  const mm = h ? String(m).padStart(2, "0") : m;
  return h ? `${h}:${mm}:${String(s).padStart(2, "0")}` : `${mm}:${String(s).padStart(2, "0")}`;
}

const PREFS_KEY = "biovised:player:prefs";
function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) throw new Error("no prefs yet");
    const p = JSON.parse(raw);
    return {
      volume: typeof p.volume === "number" ? p.volume : 100,
      muted: !!p.muted,
      speed: typeof p.speed === "number" ? p.speed : 1,
      captionsOn: !!p.captionsOn,
      quality: typeof p.quality === "string" ? p.quality : "auto",
    };
  } catch {
    return { volume: 100, muted: false, speed: 1, captionsOn: false, quality: "auto" };
  }
}
function savePrefs(p: { volume: number; muted: boolean; speed: number; captionsOn: boolean; quality: string }) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* storage unavailable */ }
}

let ytApiPromise: Promise<any> | null = null;
function loadYouTubeApi(): Promise<any> {
  if ((window as any).YT?.Player) return Promise.resolve((window as any).YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prevCb = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      prevCb?.();
      resolve((window as any).YT);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

function preconnectYouTube() {
  const hosts = ["https://www.youtube.com", "https://i.ytimg.com", "https://www.google.com"];
  for (const href of hosts) {
    if (document.head.querySelector(`link[rel="preconnect"][href="${href}"]`)) continue;
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = href;
    link.crossOrigin = "";
    document.head.appendChild(link);
  }
}

if (typeof window !== "undefined") {
  preconnectYouTube();
  loadYouTubeApi();
}

function useTouchDevice() {
  const [isTouch, setIsTouch] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const onChange = () => setIsTouch(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isTouch;
}

function useLandscape() {
  const [isLandscape, setIsLandscape] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(orientation: landscape)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(orientation: landscape)");
    const onChange = () => setIsLandscape(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isLandscape;
}

export default function BiovisedPlayer({
  lecture = DEMO_LECTURE,
  onClose = () => {},
  playlistLectures = [],
  onSelectLecture,
}: Partial<BiovisedPlayerProps>) {
  const videoId = extractVideoId(lecture);
  const isTouchDevice = useTouchDevice();
  const isLandscape = useLandscape();

  const currentIndex = playlistLectures.findIndex((l) => l.id === lecture.id);
  const prevLecture = currentIndex > 0 ? playlistLectures[currentIndex - 1] : null;
  const nextLecture = currentIndex >= 0 && currentIndex < playlistLectures.length - 1 ? playlistLectures[currentIndex + 1] : null;

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeHostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const lastTap = useRef({ side: null as string | null, time: 0 });
  const dragInfo = useRef({ active: false, side: null as string | null, startY: 0, startVal: 0, moved: false });
  const barRef = useRef<HTMLDivElement>(null);
  const scrubRef = useRef({ active: false, startY: 0, baseVal: 0 });
  const volHoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [playerReady, setPlayerReady] = useState(false);
  const [embedBlocked, setEmbedBlocked] = useState(false);
  const [errorReason, setErrorReason] = useState<"embed_disabled" | "not_found" | "invalid" | "playback" | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [hasStartedOnce, setHasStartedOnce] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [quality, setQuality] = useState("auto");
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [qualityDetectTimedOut, setQualityDetectTimedOut] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [locked, setLocked] = useState(false);
  const [showSettings, setShowSettings] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [volume, setVolume] = useState(100);
  const [brightness, setBrightness] = useState(1);
  const [muted, setMuted] = useState(false);
  const [seekFlash, setSeekFlash] = useState<{ side: string; key: number; amount: number } | null>(null);
  const [sliderShown, setSliderShown] = useState<string | null>(null);
  const [volHovered, setVolHovered] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const [precisionMode, setPrecisionMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pseudoFullscreen, setPseudoFullscreen] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  const videoOnly = isFullscreen || pseudoFullscreen || (isTouchDevice && isLandscape);

  // ---- mount YouTube player ----
  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !iframeHostRef.current) return;
      playerRef.current = new YT.Player(iframeHostRef.current, {
        videoId,
        playerVars: { controls: 0, disablekb: 1, modestbranding: 1, rel: 0, fs: 0, playsinline: 1, iv_load_policy: 3 },
        events: {
          onReady: (e: any) => {
            if (cancelled) return;
            setPlayerReady(true);
            setDuration(e.target.getDuration());
            // Restore saved preferences (volume/speed/captions/quality) before first play.
            const saved = loadPrefs();
            e.target.setVolume(saved.volume);
            if (saved.muted) e.target.mute();
            e.target.setPlaybackRate(saved.speed);
            setVolume(saved.volume);
            setMuted(saved.muted);
            setSpeed(saved.speed);
            if (saved.captionsOn) {
              try { e.target.setOption("captions", "track", { languageCode: "en" }); setCaptionsOn(true); } catch { /* no captions on this video */ }
            }
            try {
              const levels = e.target.getAvailableQualityLevels?.() || [];
              if (levels.length) setAvailableQualities(levels);
              if (saved.quality && saved.quality !== "auto" && levels.includes(saved.quality)) {
                e.target.setPlaybackQuality(saved.quality);
                setQuality(saved.quality);
              }
            } catch { /* quality API not available for this embed */ }
            // Autoplay immediately once ready
            try {
              e.target.playVideo();
            } catch (err) {
              /* autoplay blocked or player not ready yet */
            }
          },
          onStateChange: (e: any) => {
            if (cancelled) return;
            const isPlaying = e.data === YT.PlayerState.PLAYING;
            setPlaying(isPlaying);
            setBuffering(e.data === YT.PlayerState.BUFFERING);
            if (isPlaying) {
              setHasStartedOnce(true);
              setNetworkError(false);
              try {
                const levels = e.target.getAvailableQualityLevels?.() || [];
                if (levels.length) setAvailableQualities(levels);
              } catch { /* ignore */ }
            }
            const d = e.target.getDuration();
            if (d) setDuration(d);
          },
          onError: (e: any) => {
            if (cancelled) return;
            const code = e?.data;
            if (code === 101 || code === 150) setErrorReason("embed_disabled");
            else if (code === 100) setErrorReason("not_found");
            else if (code === 2) setErrorReason("invalid");
            else setErrorReason("playback");
            setEmbedBlocked(true);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      clearInterval(pollRef.current);
      if (playerRef.current?.destroy) playerRef.current.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, reloadKey]);

  useEffect(() => {
    if (!playerReady) return;
    setQualityDetectTimedOut(false);
    const t = setTimeout(() => setQualityDetectTimedOut(true), 5000);
    return () => clearTimeout(t);
  }, [playerReady]);

  useEffect(() => {
    pollRef.current = setInterval(() => {
      const p = playerRef.current;
      if (p?.getCurrentTime) {
        setCurrent(p.getCurrentTime());
        const d = p.getDuration();
        if (d) setDuration(d);
      }
    }, 250);
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    if (!playerReady) return;
    savePrefs({ volume, muted, speed, captionsOn, quality });
  }, [playerReady, volume, muted, speed, captionsOn, quality]);

  useEffect(() => {
    const onOffline = () => { setNetworkError(true); playerRef.current?.pauseVideo?.(); };
    const onOnline = () => setNetworkError(false);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const wakeControls = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    if (playing && !showSettings) hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, [playing, showSettings]);

  useEffect(() => {
    wakeControls();
    return () => clearTimeout(hideTimer.current);
  }, [playing, wakeControls]);

  const closeSettings = () => setShowSettings(null);

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    playing ? p.pauseVideo() : p.playVideo();
    wakeControls();
  }, [playing, wakeControls]);

  const seekBy = useCallback(
    (delta: number, side: string) => {
      const p = playerRef.current;
      if (!p) return;
      const currentVal = p.getCurrentTime();
      const next = Math.min(Math.max(0, currentVal + delta), duration || Infinity);
      p.seekTo(next, true);
      setCurrent(next);
      setSeekFlash({ side, key: Date.now(), amount: Math.abs(delta) });
      wakeControls();

      // Trigger heatmap segment engagement on rewind (delta < 0)
      if (delta < 0 && lecture?.id) {
        (async () => {
          try {
            await supabase.rpc('increment_segment_replay', {
              p_video_id: lecture.id,
              p_segment_index: Math.floor(currentVal / 15),
            });
          } catch (err) {
            console.error("Failed to track heatmap segment:", err);
          }
        })();
      }
    },
    [duration, wakeControls, lecture?.id]
  );

  const changeSpeed = (s: number) => {
    setSpeed(s);
    playerRef.current?.setPlaybackRate(s);
    closeSettings();
  };

  const changeQuality = (q: string) => {
    setQuality(q);
    try {
      playerRef.current?.setPlaybackQuality(q);
    } catch {
      /* YouTube's iframe API treats quality as a hint, not a guarantee — it may
         still pick a different level based on the viewer's actual bandwidth. */
    }
    closeSettings();
  };

  const cycleSpeed = () => {
    const cycle = [1, 1.25, 1.5, 1.75, 2, 0.5];
    const currentIndex = cycle.indexOf(speed);
    const nextSpeed = cycle[(currentIndex + 1) % cycle.length];
    setSpeed(nextSpeed);
    playerRef.current?.setPlaybackRate(nextSpeed);
  };

  const retryPlayback = () => {
    setEmbedBlocked(false);
    setErrorReason(null);
    setPlayerReady(false);
    setReloadKey((k) => k + 1);
  };

  const setVolumeClamped = useCallback((vol: number) => {
    const v = Math.round(Math.min(100, Math.max(0, vol)));
    setVolume(v);
    setMuted(v === 0);
    playerRef.current?.setVolume(v);
    v === 0 ? playerRef.current?.mute() : playerRef.current?.unMute();
  }, []);

  const toggleMute = useCallback(() => {
    if (muted) {
      setMuted(false);
      playerRef.current?.unMute();
      if (volume === 0) setVolumeClamped(50);
    } else {
      setMuted(true);
      playerRef.current?.mute();
    }
  }, [muted, volume, setVolumeClamped]);

  const toggleCaptions = (on: boolean) => {
    setCaptionsOn(on);
    const p = playerRef.current;
    if (!p?.setOption) return;
    try { p.setOption("captions", "track", on ? { languageCode: "en" } : {}); } catch { /* no tracks */ }
  };

  const submitReport = () => {
    setReportSent(true);
    setTimeout(() => setReportSent(false), 2500);
  };

  // ---- real fullscreen ----
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const enterVideoOnly = useCallback(async () => {
    const el = containerRef.current;
    try {
      if (el?.requestFullscreen) await el.requestFullscreen();
      else throw new Error("unsupported");
      if (isTouchDevice && (screen as any).orientation?.lock) {
        const tryLock = () => (screen as any).orientation.lock("landscape").catch(() => {});
        await tryLock();
        setTimeout(tryLock, 350);
      }
    } catch {
      setPseudoFullscreen(true);
    }
    if (!isTouchDevice) setTheaterMode(true);
    wakeControls();
  }, [isTouchDevice, wakeControls]);

  const exitVideoOnly = useCallback(async () => {
    if (pseudoFullscreen) setPseudoFullscreen(false);
    else if (document.exitFullscreen) await document.exitFullscreen();
    if ((screen as any).orientation?.unlock) {
      try { (screen as any).orientation.unlock(); } catch { /* no-op */ }
    }
    wakeControls();
  }, [pseudoFullscreen, wakeControls]);

  const toggleFullscreen = useCallback(() => {
    videoOnly ? exitVideoOnly() : enterVideoOnly();
  }, [videoOnly, enterVideoOnly, exitVideoOnly]);

  const toggleTheater = () => {
    if (videoOnly) return;
    setTheaterMode((t) => !t);
    wakeControls();
  };

  useEffect(() => {
    if (!isTouchDevice || !hasStartedOnce) return;
    if (isLandscape && !isFullscreen && !pseudoFullscreen) enterVideoOnly();
    if (!isLandscape && (isFullscreen || pseudoFullscreen)) exitVideoOnly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLandscape, isTouchDevice, hasStartedOnce]);

  // ---- desktop keyboard shortcuts ----
  useEffect(() => {
    if (isTouchDevice) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      switch (e.key.toLowerCase()) {
        case " ": case "k": e.preventDefault(); togglePlay(); break;
        case "arrowleft": e.preventDefault(); seekBy(-5, "left"); break;
        case "arrowright": e.preventDefault(); seekBy(5, "right"); break;
        case "j": e.preventDefault(); seekBy(-10, "left"); break;
        case "l": e.preventDefault(); seekBy(10, "right"); break;
        case "arrowup": e.preventDefault(); setVolumeClamped(volume + 5); break;
        case "arrowdown": e.preventDefault(); setVolumeClamped(volume - 5); break;
        case "m": e.preventDefault(); toggleMute(); break;
        case "f": e.preventDefault(); toggleFullscreen(); break;
        case "t": e.preventDefault(); toggleTheater(); break;
        case "c": e.preventDefault(); toggleCaptions(!captionsOn); break;
        case "escape": if (videoOnly) exitVideoOnly(); break;
        case ",": e.preventDefault(); changeSpeed(SPEEDS[Math.max(0, SPEEDS.indexOf(speed) - 1)]); break;
        case ".": e.preventDefault(); changeSpeed(SPEEDS[Math.min(SPEEDS.length - 1, SPEEDS.indexOf(speed) + 1)]); break;
        default:
          if (/^[0-9]$/.test(e.key) && duration) {
            e.preventDefault();
            playerRef.current?.seekTo(duration * (Number(e.key) / 10), true);
          }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTouchDevice, playing, duration, volume, speed, captionsOn, videoOnly]);

  // ---- tap zones ----
  const handleZoneClick = (side: "left" | "center" | "right") => () => {
    if (locked) {
      wakeControls();
      return;
    }
    if (dragInfo.current.moved) return; // a brightness/volume drag just ended here, not a tap
    const now = Date.now();
    if (side !== "center" && lastTap.current.side === side && now - lastTap.current.time < 300) {
      seekBy(side === "left" ? -10 : 10, side);
      lastTap.current = { side: null, time: 0 };
    } else {
      lastTap.current = { side, time: now };
      if (side === "center") {
        if (!showControls) {
          wakeControls();
        } else {
          setTimeout(() => {
            if (Date.now() - lastTap.current.time >= 280) togglePlay();
          }, 300);
        }
      } else if (showControls) {
        // Controls already visible — this tap means "hide them", so cancel
        // any pending auto-hide timer and hide immediately instead of letting
        // both this and wakeControls() fight over the state.
        clearTimeout(hideTimer.current);
        setShowControls(false);
      } else {
        wakeControls();
      }
    }
  };

  // ---- mobile vertical drag ----
  const onPointerDown = (side: "left" | "right") => (e: React.PointerEvent) => {
    if (locked || !isTouchDevice) return;
    dragInfo.current = { active: true, side, startY: e.clientY, startVal: side === "left" ? brightness : volume / 100, moved: false };
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragInfo.current.active) return;
      const { side, startY, startVal } = dragInfo.current;
      const dy = startY - e.clientY;
      if (!dragInfo.current.moved && Math.abs(dy) < 6) return;
      if (!dragInfo.current.moved) {
        dragInfo.current.moved = true;
        setSliderShown(side === "left" ? "brightness" : "volume");
      }
      const next = Math.min(1, Math.max(0, startVal + dy / 140));
      if (side === "left") setBrightness(next);
      else setVolumeClamped(next * 100);
    };
    const onUp = () => {
      if (dragInfo.current.active) {
        dragInfo.current.active = false;
        setTimeout(() => setSliderShown(null), 700);
        setTimeout(() => { dragInfo.current.moved = false; }, 50);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [setVolumeClamped]);

  // ---- progress bar: gentle, precision-aware scrubbing ----
  const pctFromEvent = (clientX: number) => {
    const rect = barRef.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };
  const onBarDown = (e: React.PointerEvent) => {
    if (locked) return;
    barRef.current?.setPointerCapture?.(e.pointerId);
    scrubRef.current = { active: true, startY: e.clientY, baseVal: pctFromEvent(e.clientX) };
    setScrubbing(true);
    setDragTime(pctFromEvent(e.clientX) * duration);
  };
  const dragTimeRef = useRef<number | null>(null);
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!scrubRef.current.active) return;
      // YouTube-style scrub: the thumb tracks the finger 1:1 along the bar,
      // no vertical-distance damping — that was making the bar feel like it
      // "stuck" after a small drag whenever the finger drifted vertically.
      const rawPct = pctFromEvent(e.clientX);
      const t = rawPct * duration;
      dragTimeRef.current = t;
      setDragTime(t);
    };
    const onUp = (e: PointerEvent) => {
      if (scrubRef.current.active) {
        try {
          barRef.current?.releasePointerCapture?.(e.pointerId);
        } catch {}
        if (playerRef.current && dragTimeRef.current != null) {
          playerRef.current.seekTo(dragTimeRef.current, true);
        }
        scrubRef.current.active = false;
        setScrubbing(false);
        setPrecisionMode(false);
        setDragTime(null);
        dragTimeRef.current = null;
        wakeControls();
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [duration, wakeControls]);

  const displayTime = scrubbing && dragTime != null ? dragTime : current;
  const progressPct = duration ? (displayTime / duration) * 100 : 0;
  const iconCls = "text-white/95 drop-shadow-sm";

  if (!videoId) {
    return (
      <div className="w-full max-w-[720px] aspect-video rounded-2xl bg-black flex items-center justify-center text-white/60 text-sm p-6 text-center">
        This lecture has no valid video source.
      </div>
    );
  }
  if (embedBlocked) {
    const messages: Record<string, string> = {
      embed_disabled: "This video's owner disabled embedding.",
      not_found: "This video has been removed or made private.",
      invalid: "This video source looks invalid.",
      playback: "Playback hit an error.",
    };
    const canRetry = errorReason === "playback" || errorReason === null;
    return (
      <div className="w-full max-w-[720px] aspect-video rounded-2xl bg-black flex flex-col items-center justify-center gap-3 text-white/70 text-sm p-6 text-center">
        <AlertTriangle size={22} />
        <p>{messages[errorReason || "playback"]}</p>
        <div className="flex items-center gap-4">
          {canRetry && <button onClick={retryPlayback} className="underline text-white">Try again</button>}
          <button onClick={onClose} className="underline text-white">Go back</button>
        </div>
      </div>
    );
  }

  // ---- video surface ----
  const VideoSurface = (
    <div
      ref={containerRef}
      tabIndex={0}
      className={
        videoOnly
          ? "fixed inset-0 z-50 bg-black overflow-hidden select-none outline-none"
          : `relative w-full ${theaterMode && !isTouchDevice ? "max-w-[960px]" : "max-w-[720px]"} aspect-video bg-black overflow-hidden select-none shadow-2xl outline-none transition-[max-width] duration-300 ${isTouchDevice ? "" : "rounded-2xl"}`
      }
      onPointerMove={isTouchDevice ? undefined : wakeControls}
    >
      {/* iframe — brightness filter applied here so the black cover below sits outside it */}
      <div className="absolute inset-0 z-0 pointer-events-none" style={{ filter: `brightness(${0.35 + brightness * 0.9})` }}>
        <div ref={iframeHostRef} key={reloadKey} className="w-full h-full" />
      </div>

      {/* Black cover: blocks YouTube's native thumbnail/title/play button until
          the user's own play button triggers PLAYING for the first time.
          hasStartedOnce never resets — removed permanently after first playback. */}
      {!hasStartedOnce && (
        <div className="absolute inset-0 z-20 bg-black flex items-center justify-center pointer-events-none">
          {!playerReady && <span className="text-white/40 text-xs">Loading video…</span>}
        </div>
      )}

      {hasStartedOnce && buffering && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 rounded-full border-2 border-white/25 border-t-white animate-spin" />
        </div>
      )}

      {networkError && (
        <div className="absolute top-0 left-0 right-0 z-40 bg-black text-white text-[12px] text-center py-1.5">
          You're offline — playback paused. Resume once you're back online.
        </div>
      )}

      {!locked && (
        <div className="absolute inset-0 grid grid-cols-3 z-10">
          <div className="h-full cursor-pointer" style={isTouchDevice ? { touchAction: "none" } : undefined} onPointerDown={onPointerDown("left")} onClick={handleZoneClick("left")} />
          <div className="h-full cursor-pointer" onClick={handleZoneClick("center")} />
          <div className="h-full cursor-pointer" style={isTouchDevice ? { touchAction: "none" } : undefined} onPointerDown={onPointerDown("right")} onClick={handleZoneClick("right")} />
        </div>
      )}
      {locked && (
        <div
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={() => {
            if (showControls) {
              clearTimeout(hideTimer.current);
              setShowControls(false);
            } else {
              wakeControls();
            }
          }}
        />
      )}

      {isTouchDevice && sliderShown === "brightness" && (
        <VerticalSlider
          side="left"
          value={brightness}
          icon={brightness < 0.5 
            ? <Moon size={20} className={iconCls} strokeWidth={2.25} />
            : <Sun size={20} className={iconCls} strokeWidth={2.25} />
          }
        />
      )}
      {isTouchDevice && sliderShown === "volume" && (
        <VerticalSlider side="right" value={volume / 100} icon={<VolumeIcon muted={muted} volume={volume} size={20} className={iconCls} />} />
      )}

      {(showControls || !playing) && !locked && (
        <button
          onClick={togglePlay}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing
            ? <Pause size={28} className={iconCls} fill="currentColor" />
            : <Play size={28} className={`${iconCls} ml-1`} fill="currentColor" />
          }
        </button>
      )}

      {/* ±10s buttons: DESKTOP ONLY */}
      {!isTouchDevice && showControls && !locked && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); seekBy(-10, "left"); }}
            className="absolute top-1/2 left-[30%] -translate-x-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center cursor-pointer"
            aria-label="Rewind 10 seconds"
          >
            <RotateCcw size={18} className={iconCls} strokeWidth={2.25} />
            <span className="absolute text-[8px] font-bold text-white">10</span>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); seekBy(10, "right"); }}
            className="absolute top-1/2 left-[70%] -translate-x-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center cursor-pointer"
            aria-label="Forward 10 seconds"
          >
            <RotateCw size={18} className={iconCls} strokeWidth={2.25} />
            <span className="absolute text-[8px] font-bold text-white">10</span>
          </button>
        </>
      )}

      {/* top bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 flex items-start justify-between p-3 bg-gradient-to-b from-black/25 to-transparent transition-opacity duration-200 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        style={videoOnly
          ? {
              paddingTop: isTouchDevice ? "max(1rem, env(safe-area-inset-top))" : "max(3.25rem, env(safe-area-inset-top))",
              paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
              paddingRight: "max(0.75rem, env(safe-area-inset-right))"
            }
          : { paddingTop: isTouchDevice ? "1rem" : "3.25rem" }
        }
      >
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onClose} className="shrink-0" aria-label="Back">
            <ChevronLeft size={22} className={iconCls} strokeWidth={2.25} />
          </button>
        </div>
        {!locked && (
          <button onClick={() => { setLocked(true); wakeControls(); }} className="shrink-0 pl-3" aria-label="Lock controls">
            <Lock size={18} className={iconCls} strokeWidth={2.25} />
          </button>
        )}
      </div>

      {locked && (
        <button
          onClick={() => { setLocked(false); wakeControls(); }}
          className={`absolute z-30 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center transition-opacity duration-200 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          style={videoOnly ? { top: "max(1rem, env(safe-area-inset-top))", right: "max(0.75rem, env(safe-area-inset-right))" } : { top: "1rem", right: "0.75rem" }}
          aria-label="Unlock controls"
        >
          <Unlock size={16} className={iconCls} strokeWidth={2.25} />
        </button>
      )}

      {showSettings && (
        <>
          <div className="absolute inset-0 z-30" onClick={closeSettings} />
          <div className="absolute top-12 right-3 bottom-3 z-40 w-56 max-h-[calc(100%-3.75rem)] rounded-xl bg-[#1c1c1e]/95 backdrop-blur-md border border-white/10 overflow-y-auto overscroll-contain [webkit-overflow-scrolling:touch] [will-change:transform] text-white text-[13px] shadow-xl">
            {showSettings === "root" && (
              <>
                <SettingsRow label="Speed" value={`${speed}x`} onClick={() => setShowSettings("speed")} />
                <SettingsRow label="Quality" value={qualityLabel(quality)} onClick={() => setShowSettings("quality")} />
                <SettingsRow label="Captions" value={captionsOn ? "On" : "Off"} onClick={() => setShowSettings("captions")} />
                {!isTouchDevice && <SettingsRow label="Keyboard shortcuts" value="" onClick={() => setShowSettings("shortcuts")} />}
                <button
                  onClick={() => { submitReport(); closeSettings(); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-white/10 border-t border-white/10 text-left"
                >
                  <Flag size={14} />
                  <span>{reportSent ? "Report sent — thank you" : "Report a problem"}</span>
                </button>
              </>
            )}
            {showSettings === "speed" && (
              <SubMenu title="Speed" onBack={() => setShowSettings("root")}>
                {[...SPEEDS].reverse().map((s) => <OptionRow key={s} label={`${s}x`} active={s === speed} onClick={() => changeSpeed(s)} />)}
              </SubMenu>
            )}
            {showSettings === "quality" && (
              <SubMenu title="Quality" onBack={() => setShowSettings("root")}>
                <OptionRow label="Auto" active={quality === "auto"} onClick={() => changeQuality("auto")} />
                {availableQualities.length === 0 && !qualityDetectTimedOut && (
                  <div className="px-3 py-2.5 text-white/40 text-[12px] italic">Detecting available resolutions…</div>
                )}
                {availableQualities.length === 0 && qualityDetectTimedOut &&
                  FALLBACK_QUALITIES.map((q) => <OptionRow key={q} label={qualityLabel(q)} active={quality === q} onClick={() => changeQuality(q)} />)}
                {availableQualities.length > 0 &&
                  availableQualities
                    .filter((q) => q !== "auto")
                    .map((q) => <OptionRow key={q} label={qualityLabel(q)} active={quality === q} onClick={() => changeQuality(q)} />)}
              </SubMenu>
            )}
            {showSettings === "captions" && (
              <SubMenu title="Captions" onBack={() => setShowSettings("root")}>
                <OptionRow label="Off" active={!captionsOn} onClick={() => toggleCaptions(false)} />
                <OptionRow label="English" active={captionsOn} onClick={() => toggleCaptions(true)} />
              </SubMenu>
            )}
            {showSettings === "shortcuts" && (
              <SubMenu title="Keyboard shortcuts" onBack={() => setShowSettings("root")}>
                <ShortcutRow keys="Space / K" action="Play / Pause" />
                <ShortcutRow keys="← / →" action="Seek 5s" />
                <ShortcutRow keys="J / L" action="Seek 10s" />
                <ShortcutRow keys="↑ / ↓" action="Volume" />
                <ShortcutRow keys="M" action="Mute" />
                <ShortcutRow keys="F" action="Fullscreen" />
                <ShortcutRow keys="T" action="Half screen" />
                <ShortcutRow keys="C" action="Captions" />
                <ShortcutRow keys=", / ." action="Speed down/up" />
                <ShortcutRow keys="0–9" action="Jump to %" />
                <ShortcutRow keys="Esc" action="Exit fullscreen" />
              </SubMenu>
            )}
          </div>
        </>
      )}

      {/* bottom bar */}
      {!locked && (
        <div className={`absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/85 to-transparent pt-8 pb-3 px-3 transition-opacity duration-200 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-white text-[11px] tabular-nums w-10">{fmt(displayTime)}</span>
            <div ref={barRef} onPointerDown={onBarDown} className="relative flex-1 h-5 flex items-center cursor-pointer group">
              <div className={`relative w-full rounded-full bg-white/25 overflow-hidden transition-all ${scrubbing ? "h-[5px]" : "h-[3px] group-hover:h-[5px]"}`}>
                <div
                  className={scrubbing ? "" : "transition-[width] duration-100 ease-out"}
                  style={{ position: "absolute", inset: 0, width: `${progressPct}%`, background: PROGRESS_FILL }}
                />
              </div>
              <div
                className={`absolute w-3.5 h-3.5 rounded-full -translate-x-1/2 shadow ${scrubbing ? "" : "transition-[left] duration-100 ease-out"}`}
                style={{ left: `${progressPct}%`, background: PROGRESS_FILL }}
              />
              {precisionMode && (
                <div className="absolute -top-6 -translate-x-1/2 text-[10px] text-white bg-black/80 px-1.5 py-0.5 rounded" style={{ left: `${progressPct}%` }}>
                  {fmt(displayTime)}
                </div>
              )}
            </div>
            <span className="text-white text-[11px] tabular-nums w-10 text-right">{fmt(duration)}</span>
          </div>

          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-4">
              {/* Previous button */}
              {onSelectLecture && (
                <button
                  disabled={!prevLecture}
                  onClick={() => prevLecture && onSelectLecture(prevLecture)}
                  className="disabled:opacity-30 cursor-pointer"
                  aria-label="Previous lecture"
                >
                  <SkipBack size={16} className={iconCls} strokeWidth={2.25} fill="currentColor" />
                </button>
              )}

              <button onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
                {playing
                  ? <Pause size={18} className={iconCls} strokeWidth={2.25} fill="currentColor" />
                  : <Play size={18} className={iconCls} strokeWidth={2.25} fill="currentColor" />
                }
              </button>

              {/* Next button */}
              {onSelectLecture && (
                <button
                  disabled={!nextLecture}
                  onClick={() => nextLecture && onSelectLecture(nextLecture)}
                  className="disabled:opacity-30 cursor-pointer"
                  aria-label="Next lecture"
                >
                  <SkipForward size={16} className={iconCls} strokeWidth={2.25} fill="currentColor" />
                </button>
              )}

              {!isTouchDevice && (
                <>
                  <button onClick={() => seekBy(-10, "left")} aria-label="Back 10 seconds">
                    <RotateCcw size={17} className={iconCls} strokeWidth={2.25} />
                  </button>
                  <button onClick={() => seekBy(10, "right")} aria-label="Forward 10 seconds">
                    <RotateCw size={17} className={iconCls} strokeWidth={2.25} />
                  </button>

                  {/* YouTube-style desktop volume */}
                  <div
                    className="flex items-center gap-2"
                    onMouseEnter={() => { clearTimeout(volHoverTimer.current); setVolHovered(true); }}
                    onMouseLeave={() => { volHoverTimer.current = setTimeout(() => setVolHovered(false), 400); }}
                  >
                    <button onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
                      <VolumeIcon muted={muted} volume={volume} size={17} className={iconCls} />
                    </button>
                    <div className={`overflow-hidden transition-all duration-200 ${volHovered ? "w-20 opacity-100" : "w-0 opacity-0"}`}>
                      <input
                        type="range" min={0} max={100} value={muted ? 0 : volume}
                        onChange={(e) => setVolumeClamped(Number(e.target.value))}
                        className="w-20 h-1 accent-white cursor-pointer"
                        aria-label="Volume"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={cycleSpeed}
                className="text-[11px] font-bold px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors"
                style={{ color: "rgba(255,255,255,0.95)", opacity: speed !== 1 ? 1 : 0.85 }}
                aria-label="Cycle speed"
              >
                {speed}x
              </button>
              <button onClick={() => setShowSettings(showSettings ? null : "root")} aria-label="Settings" className={showSettings ? "rounded-full bg-white/15 p-1 -m-1" : ""}>
                <Settings size={18} className={iconCls} strokeWidth={2.25} />
              </button>
              {!isTouchDevice && (
                <button
                  onClick={toggleTheater}
                  aria-label={theaterMode ? "Exit half screen" : "Half screen"}
                  title="Half screen (T)"
                  className={theaterMode ? "rounded-full bg-white/15 p-1 -m-1" : ""}
                >
                  <Rows3 size={17} className={iconCls} strokeWidth={2.25} />
                </button>
              )}
              <button onClick={toggleFullscreen} aria-label={videoOnly ? "Exit full screen" : "Full screen"} title="Full screen (F)">
                {videoOnly
                  ? <Shrink size={17} className={iconCls} strokeWidth={2.25} />
                  : <Expand size={17} className={iconCls} strokeWidth={2.25} />
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (videoOnly) {
    return <div className="w-full flex items-center justify-center bg-neutral-950">{VideoSurface}</div>;
  }

  if (!isTouchDevice) {
    return <div className="w-full flex items-center justify-center bg-neutral-950 p-4">{VideoSurface}</div>;
  }

  // Mobile portrait: video surface on top, layout handled by parent scroll container
  return <div className="w-full flex items-center justify-center bg-neutral-950">{VideoSurface}</div>;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SettingsRow({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/10 border-t border-white/10 first:border-t-0">
      <span>{label}</span>
      <span className="flex items-center gap-1 text-white/50">
        {value}
        <ChevronRightIcon size={13} />
      </span>
    </button>
  );
}

function SubMenu({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <button onClick={onBack} className="w-full flex items-center gap-2 px-3 py-2.5 border-b border-white/10 text-white/80 hover:bg-white/10 shrink-0">
        <ChevronLeft size={14} />
        <span className="font-medium">{title}</span>
      </button>
      <div>{children}</div>
    </div>
  );
}

function OptionRow({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/10">
      <span className={active ? "text-white font-semibold" : "text-white/80"}>{label}</span>
      {active && <Check size={14} className="text-white" />}
    </button>
  );
}

function ShortcutRow({ keys, action }: { keys: string; action: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 text-[12px] border-b border-white/5 last:border-b-0">
      <span className="text-white/60">{action}</span>
      <span className="font-mono text-[11px] bg-white/10 px-1.5 py-0.5 rounded">{keys}</span>
    </div>
  );
}

function VerticalSlider({ side, value, icon }: { side: string; value: number; icon: React.ReactNode }) {
  return (
    <div className={`absolute top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1.5 pointer-events-none ${side === "left" ? "left-4" : "right-4"}`}>
      <div className="w-2 h-28 rounded-full bg-white/25 overflow-hidden relative">
        {/* fill from bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-white transition-none" style={{ height: `${Math.round(value * 100)}%` }} />
      </div>
      <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center border border-white/5">
        {icon}
      </div>
    </div>
  );
}

// Double-tap visual indicators removed per UX guidelines to keep interface lightweight
