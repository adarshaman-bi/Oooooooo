import { Check, X } from 'lucide-react';

interface PasswordChecklistProps {
  password: string;
  visible: boolean;
}

export default function PasswordChecklist({ password, visible }: PasswordChecklistProps) {
  if (!visible) return null;

  const checks = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'One uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', pass: /[a-z]/.test(password) },
    { label: 'One number', pass: /[0-9]/.test(password) },
    { label: 'One special character', pass: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const passed = checks.filter(c => c.pass).length;

  return (
    <div className="mt-2 p-3 bg-zinc-950 border border-zinc-900 rounded-lg" role="list" aria-label="Password requirements">
      <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full transition-all duration-500 ${
            passed <= 2 ? 'bg-red-500' : passed <= 4 ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${(passed / checks.length) * 100}%` }}
        />
      </div>
      {checks.map((check, i) => (
        <div
          key={i}
          role="listitem"
          className={`flex items-center gap-1.5 text-[10px] font-mono mt-1 ${
            check.pass ? 'text-emerald-400' : 'text-zinc-500'
          }`}
        >
          {check.pass ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
          {check.label}
        </div>
      ))}
    </div>
  );
}
