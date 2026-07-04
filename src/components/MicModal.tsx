import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, X, MicOff } from 'lucide-react';

interface MicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscript: (text: string) => void;
}

// Extend Window for vendor-prefixed SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

const BAR_COUNT = 48;
const PEACH = '#FBB093';
const PEACH_GLOW = 'rgba(251, 176, 147, 0.6)';

function getSpeechRecognition(): any {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export default function MicModal({ isOpen, onClose, onTranscript }: MicModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [barHeights, setBarHeights] = useState<number[]>(new Array(BAR_COUNT).fill(4));
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  // Check browser support
  useEffect(() => {
    if (!getSpeechRecognition()) {
      setIsSupported(false);
    }
  }, []);

  // Cleanup everything on unmount or close
  const cleanup = useCallback(() => {
    // Stop recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_) { /* ignore */ }
      recognitionRef.current = null;
    }

    // Stop animation
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }

    // Stop audio stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (_) { /* ignore */ }
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    dataArrayRef.current = null;
    setIsListening(false);
    setBarHeights(new Array(BAR_COUNT).fill(4));
  }, []);

  // Handle modal close
  useEffect(() => {
    if (!isOpen) {
      cleanup();
      setTranscript('');
      setInterimText('');
      setError(null);
    }
  }, [isOpen, cleanup]);

  // Unmount cleanup
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // Audio visualization loop
  const animateVisualizer = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    const data = dataArrayRef.current;
    const step = Math.floor(data.length / BAR_COUNT);

    const newHeights: number[] = [];
    for (let i = 0; i < BAR_COUNT; i++) {
      // Sample frequency data across the spectrum
      const idx = Math.min(i * step, data.length - 1);
      const value = data[idx];
      // Map 0-255 to 4-80 (min height to max height)
      const height = Math.max(4, (value / 255) * 80);
      newHeights.push(height);
    }

    setBarHeights(newHeights);
    animFrameRef.current = requestAnimationFrame(animateVisualizer);
  }, []);

  // Start listening
  const startListening = useCallback(async () => {
    setError(null);

    const SpeechRecognitionClass = getSpeechRecognition();
    if (!SpeechRecognitionClass) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    try {
      // Get audio stream for visualization
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up Web Audio API for visualization
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);

      // Start visualization loop
      animateVisualizer();

      // Set up Speech Recognition
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interim = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(prev => {
            const updated = prev ? prev + ' ' + finalTranscript : finalTranscript;
            return updated;
          });
        }
        setInterimText(interim);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone access was denied.');
        } else if (event.error !== 'aborted') {
          setError(`Error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        // Auto-restart if still supposed to be listening
        // (recognition can end prematurely)
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start listening:', err);
      setError('Could not access microphone. Please check permissions.');
    }
  }, [animateVisualizer]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) { /* ignore */ }
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (_) { /* ignore */ }
      audioContextRef.current = null;
    }

    setIsListening(false);
    setBarHeights(new Array(BAR_COUNT).fill(4));
  }, []);

  // Submit transcript
  const handleSubmit = useCallback(() => {
    const fullText = (transcript + (interimText ? ' ' + interimText : '')).trim();
    if (fullText) {
      onTranscript(fullText);
    }
    cleanup();
    onClose();
  }, [transcript, interimText, onTranscript, cleanup, onClose]);

  // Detect light theme
  const isLightTheme = typeof document !== 'undefined' &&
    document.documentElement.classList.contains('light-theme');

  const displayText = transcript + (interimText ? ' ' + interimText : '');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => { stopListening(); onClose(); }}
            className="fixed inset-0 z-[9998]"
            style={{
              backgroundColor: isLightTheme
                ? 'var(--overlay-dark, rgba(12, 15, 19, 0.6))'
                : 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(8px)',
            }}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={`fixed bottom-0 left-0 right-0 z-[9999] rounded-t-[28px] overflow-hidden ${
              isLightTheme
                ? 'bg-[var(--bg-paper)]'
                : 'bg-zinc-900'
            }`}
            style={{
              boxShadow: isLightTheme
                ? 'var(--shadow-lg, 0 12px 32px rgba(47, 35, 39, 0.12))'
                : '0 -8px 40px rgba(0, 0, 0, 0.5)',
              maxHeight: '80vh',
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div
                className={`w-10 h-1 rounded-full ${
                  isLightTheme ? 'bg-[var(--border-subtle)]' : 'bg-zinc-700'
                }`}
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3">
              <h3
                className={`text-sm font-semibold tracking-wide ${
                  isLightTheme ? 'text-[var(--text-primary)]' : 'text-white'
                }`}
              >
                Voice Input
              </h3>
              <button
                onClick={() => { stopListening(); onClose(); }}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer border-none ${
                  isLightTheme
                    ? 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                }`}
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 pb-8 flex flex-col items-center gap-6">
              {/* Error State */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`text-xs text-center px-4 py-2 rounded-xl ${
                    isLightTheme
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : 'bg-red-950/30 text-red-400 border border-red-900/40'
                  }`}
                >
                  <MicOff size={14} className="inline mr-1.5 -mt-0.5" />
                  {error}
                </motion.div>
              )}

              {/* Not Supported State */}
              {!isSupported && (
                <div
                  className={`text-xs text-center px-4 py-3 rounded-xl ${
                    isLightTheme
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-amber-950/30 text-amber-400 border border-amber-900/40'
                  }`}
                >
                  <MicOff size={14} className="inline mr-1.5 -mt-0.5" />
                  Speech recognition is not supported in this browser. Try Chrome or Edge.
                </div>
              )}

              {/* Visualizer / Mic Button Area */}
              <div className="relative w-full flex flex-col items-center justify-center" style={{ minHeight: '180px' }}>
                {!isListening ? (
                  /* Idle State: Pulsing Mic Button */
                  <motion.div className="relative flex items-center justify-center">
                    {/* Pulse rings */}
                    {isSupported && (
                      <>
                        <motion.div
                          className="absolute rounded-full"
                          style={{
                            width: 120,
                            height: 120,
                            border: `2px solid ${PEACH}`,
                            opacity: 0.15,
                          }}
                          animate={{ scale: [1, 1.6], opacity: [0.15, 0] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                        />
                        <motion.div
                          className="absolute rounded-full"
                          style={{
                            width: 120,
                            height: 120,
                            border: `2px solid ${PEACH}`,
                            opacity: 0.1,
                          }}
                          animate={{ scale: [1, 1.4], opacity: [0.1, 0] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
                        />
                      </>
                    )}

                    {/* Mic Button */}
                    <motion.button
                      onClick={isSupported ? startListening : undefined}
                      disabled={!isSupported}
                      whileHover={isSupported ? { scale: 1.05 } : undefined}
                      whileTap={isSupported ? { scale: 0.95 } : undefined}
                      className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center cursor-pointer border-none transition-shadow"
                      style={{
                        background: isSupported
                          ? `linear-gradient(135deg, ${PEACH}, #E69A7F)`
                          : isLightTheme ? '#E5E5E5' : '#3f3f46',
                        boxShadow: isSupported
                          ? `0 4px 20px ${PEACH_GLOW}, 0 0 40px rgba(251, 176, 147, 0.2)`
                          : 'none',
                      }}
                    >
                      {isSupported ? (
                        <Mic size={28} className="text-white" />
                      ) : (
                        <MicOff size={28} className={isLightTheme ? 'text-zinc-400' : 'text-zinc-500'} />
                      )}
                    </motion.button>
                  </motion.div>
                ) : (
                  /* Listening State: Audio Visualizer */
                  <div className="flex flex-col items-center gap-4 w-full">
                    {/* Status label */}
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2"
                    >
                      <motion.div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: PEACH }}
                        animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      />
                      <span
                        className={`text-xs font-medium tracking-wide ${
                          isLightTheme ? 'text-[var(--text-secondary)]' : 'text-zinc-400'
                        }`}
                      >
                        Listening...
                      </span>
                    </motion.div>

                    {/* Semicircular Bar Visualizer */}
                    <div
                      className="relative flex items-end justify-center gap-[2px]"
                      style={{ height: '100px', width: '100%', maxWidth: '320px' }}
                    >
                      {barHeights.map((height, i) => {
                        // Create a semicircular spread
                        const normalizedIndex = i / (BAR_COUNT - 1); // 0 to 1
                        const angle = normalizedIndex * Math.PI; // 0 to PI
                        const scale = Math.sin(angle); // Creates the arc shape
                        const adjustedHeight = Math.max(4, height * (0.4 + 0.6 * scale));

                        return (
                          <div
                            key={i}
                            className="rounded-full flex-1 transition-[height] duration-75"
                            style={{
                              height: `${adjustedHeight}px`,
                              minWidth: '3px',
                              maxWidth: '6px',
                              background: `linear-gradient(to top, ${PEACH}, rgba(251, 176, 147, 0.6))`,
                              boxShadow: height > 30
                                ? `0 0 ${Math.floor(height / 5)}px ${PEACH_GLOW}`
                                : 'none',
                              opacity: 0.6 + (height / 255) * 0.4,
                            }}
                          />
                        );
                      })}
                    </div>

                    {/* Stop button */}
                    <motion.button
                      onClick={stopListening}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-14 h-14 rounded-full flex items-center justify-center cursor-pointer border-none"
                      style={{
                        background: `linear-gradient(135deg, ${PEACH}, #E69A7F)`,
                        boxShadow: `0 4px 20px ${PEACH_GLOW}`,
                      }}
                    >
                      <div className="w-5 h-5 rounded-sm bg-white" />
                    </motion.button>
                  </div>
                )}
              </div>

              {/* Live Transcript */}
              {displayText.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`w-full rounded-2xl p-4 text-sm leading-relaxed max-h-32 overflow-y-auto ${
                    isLightTheme
                      ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                      : 'bg-zinc-800/60 text-zinc-200 border border-zinc-700/50'
                  }`}
                >
                  <span>{transcript}</span>
                  {interimText && (
                    <span
                      className={isLightTheme ? 'text-[var(--text-tertiary)]' : 'text-zinc-500'}
                    >
                      {interimText}
                    </span>
                  )}
                </motion.div>
              )}

              {/* Submit Button (only when we have text) */}
              {displayText.trim() && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={handleSubmit}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 rounded-2xl text-sm font-semibold text-white cursor-pointer border-none tracking-wide"
                  style={{
                    background: `linear-gradient(135deg, ${PEACH}, #E69A7F)`,
                    boxShadow: `0 4px 16px ${PEACH_GLOW}`,
                  }}
                >
                  Use this text
                </motion.button>
              )}

              {/* Hint Text */}
              {!isListening && !displayText.trim() && isSupported && (
                <p
                  className={`text-[11px] text-center ${
                    isLightTheme ? 'text-[var(--text-tertiary)]' : 'text-zinc-500'
                  }`}
                >
                  Tap the microphone to start speaking
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
