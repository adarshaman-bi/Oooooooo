import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { Sparkles, GraduationCap, Calendar, ChevronRight } from 'lucide-react';

export default function OnboardingWizard() {
  const { user, updatePreferences } = useAuth();
  const [examType, setExamType] = useState<'JEE' | 'NEET' | 'Both'>('NEET');
  const [appearingYear, setAppearingYear] = useState<'2026' | '2027' | '2028'>('2026');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await updatePreferences({
        examType,
        appearingYear,
        onboardingCompleted: true
      });
    } catch (e) {
      console.error('Failed to complete onboarding preference setup:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#000000] flex items-center justify-center p-4 select-none font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02),transparent_70%)] pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-[#0D0D0C] border border-zinc-900 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Formula backdrop canvas */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none font-mono text-[8px] leading-tight p-4">
          <pre>
{`E = mc²
Hψ = Eψ
PV = nRT
F = G(m₁m₂)/r²
Δx·Δp ≥ ℏ/2
C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O
∫ xⁿ dx = xⁿ⁺¹/(n+1) + C
sin²θ + cos²θ = 1
∇ × B = μ₀J + μ₀ε₀(∂E/∂t)`}
          </pre>
        </div>
        {/* Decorative corner glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.01] rounded-full filter blur-2xl pointer-events-none" />

        <div className="flex flex-col items-center text-center space-y-6">
          {/* Header Icon */}
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-white uppercase font-sans">
              Configure Workspace
            </h2>
            <p className="text-xs text-zinc-500 leading-relaxed font-sans max-w-xs">
              Establish your targets to tailor your curriculum discovery feed.
            </p>
          </div>

          <div className="w-full space-y-5 text-left pt-2">
            {/* Exam Selection */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                <GraduationCap className="w-3.5 h-3.5 text-zinc-400" />
                Select Exam Target
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['NEET', 'JEE', 'Both'] as const).map((type) => {
                  const isActive = examType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setExamType(type)}
                      className={`py-3.5 px-2 rounded-xl text-[10px] font-bold tracking-wide transition-all uppercase cursor-pointer text-center outline-none ${
                        isActive
                          ? 'bg-white/10 text-white border border-white/20'
                          : 'bg-zinc-900/40 text-zinc-450 border border-transparent hover:bg-zinc-900/70 hover:text-zinc-200'
                      }`}
                    >
                      {type === 'Both' ? 'Both Paths' : type}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Year Selection */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                Select Target Year
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['2026', '2027', '2028'] as const).map((year) => {
                  const isActive = appearingYear === year;
                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() => setAppearingYear(year)}
                      className={`py-3.5 px-3 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer text-center outline-none ${
                        isActive
                          ? 'bg-white/10 text-white font-bold'
                          : 'bg-zinc-900/40 text-zinc-450 hover:bg-zinc-900/70 hover:text-zinc-200'
                      }`}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action button */}
          <button
            onClick={handleComplete}
            disabled={isSubmitting}
            className="w-full mt-4 bg-white hover:bg-zinc-200 text-black py-3 px-6 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Configuring...' : 'Complete Setup'}</span>
            {!isSubmitting && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
