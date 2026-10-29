import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Check, CircleAlert, Info, Minus, X } from 'lucide-react';
import type { CriterionResult, Fit, Tier } from '../lib/matching';
import { TIER_LABEL } from '../lib/matching';
import { skillKey, skillLabel } from '../lib/skills';

/* ---------- Avatar (initials only, no photos of people) ---------- */
const GRADIENTS = [
  ['#6d8bff', '#b28dff'],
  ['#38bdf8', '#6d8bff'],
  ['#34d399', '#38bdf8'],
  ['#f59e0b', '#f472b6'],
  ['#a78bfa', '#f472b6'],
  ['#22d3ee', '#a3e635'],
  ['#fb7185', '#f59e0b'],
];
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const [a, b] = GRADIENTS[hash(name) % GRADIENTS.length];
  size = Math.round(size * 0.8);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(135deg, ${a}, ${b})` }}
      aria-hidden
    >
      {initials || '?'}
    </span>
  );
}

/* ---------- Scores ---------- */
const tierColor = (score: number, eligible = true) =>
  !eligible ? 'var(--muted-2)' : score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--blue)' : 'var(--amber)';

export function ScoreRing({ score, size = 22, eligible = true, color }: { score: number; size?: number; eligible?: boolean; color?: string }) {
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  const col = color ?? tierColor(score, eligible);
  return (
    <span className="score-ring" style={{ color: col }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--line)" strokeWidth="3" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <b>{score}%</b>
    </span>
  );
}

export function ScoreBar({ score, eligible = true }: { score: number; eligible?: boolean }) {
  return (
    <div className="score-bar" role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${score}%`, background: tierColor(score, eligible) }} />
    </div>
  );
}

export function TierBadge({ tier }: { tier: Tier }) {
  return <span className={`badge tier-${tier}`}>{TIER_LABEL[tier]}</span>;
}

/* ---------- Skills ---------- */
export function SkillChips({ skills, matched = [], missing = [] }: { skills: string[]; matched?: string[]; missing?: string[] }) {
  const m = new Set(matched.map(skillKey));
  const x = new Set(missing.map(skillKey));
  return (
    <div className="chips">
      {skills.map((s) => {
        const k = skillKey(s);
        const cls = m.has(k) ? 'chip chip-yes' : x.has(k) ? 'chip chip-no' : 'chip';
        return (
          <span key={k} className={cls}>
            {m.has(k) && <Check size={12} />}
            {skillLabel(s)}
          </span>
        );
      })}
    </div>
  );
}

/* ---------- Plain-language explanation ---------- */
export function FitIcon({ fit }: { fit: Fit }) {
  if (fit === 'yes') return <span className="fit fit-yes" title="Fits"><Check size={13} strokeWidth={3} /></span>;
  if (fit === 'partial') return <span className="fit fit-partial" title="Partly fits"><Minus size={13} strokeWidth={3} /></span>;
  return <span className="fit fit-no" title="Does not fit"><X size={13} strokeWidth={3} /></span>;
}

export function Explanation({ criteria, forCandidate = false }: { criteria: CriterionResult[]; forCandidate?: boolean }) {
  return (
    <ul className="explain">
      {criteria.map((c) => (
        <li key={c.key}>
          <FitIcon fit={c.fit} />
          <div>
            <span className="explain-label">
              {c.label} <em>{Math.round(c.points)}/{c.weight} pts</em>
            </span>
            <p>{forCandidate ? c.textForCandidate : c.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`disclaimer ${compact ? 'compact' : ''}`}>
      <Info size={15} />
      <span>
        Match scores are simple, rule-based guides to <b>support human review</b>, not a guarantee that someone is
        suitable. Always read the full profile before deciding.
      </span>
    </div>
  );
}

/* ---------- Form fields ---------- */
export function Field({ label, error, hint, children, required }: { label: string; error?: string; hint?: string; children: ReactNode; required?: boolean }) {
  return (
    <label className={`field ${error ? 'has-error' : ''}`}>
      <span className="field-label">
        {label}
        {required && <span className="req" aria-label="required">*</span>}
      </span>
      {children}
      {error ? (
        <span className="field-error" role="alert">
          <CircleAlert size={13} /> {error}
        </span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </label>
  );
}

/** Tag-style skill input: type and press Enter or comma. */
export function SkillInput({ value, onChange, suggestions, placeholder, invalid }: { value: string[]; onChange(v: string[]): void; suggestions: string[]; placeholder?: string; invalid?: boolean }) {
  const [text, setText] = useState('');
  const add = (raw: string) => {
    const parts = raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const p of parts) if (!next.some((v) => skillKey(v) === skillKey(p))) next.push(p);
    onChange(next);
    setText('');
  };
  const remaining = suggestions.filter((s) => !value.some((v) => skillKey(v) === skillKey(s)));
  const filtered = text ? remaining.filter((s) => s.toLowerCase().includes(text.toLowerCase())).slice(0, 8) : remaining.slice(0, 10);
  return (
    <div className={`skill-input ${invalid ? 'invalid' : ''}`}>
      <div className="skill-input-box">
        {value.map((s) => (
          <span className="chip chip-dark" key={skillKey(s)}>
            {skillLabel(s)}
            <button type="button" aria-label={`Remove ${s}`} onClick={() => onChange(value.filter((v) => v !== s))}>
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          value={text}
          placeholder={value.length ? 'Add another…' : placeholder}
          onChange={(e) => {
            const v = e.target.value;
            if (/[,;]$/.test(v)) add(v);
            else setText(v);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(text);
            } else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => text && add(text)}
        />
      </div>
      {filtered.length > 0 && (
        <div className="skill-suggest">
          {filtered.map((s) => (
            <button type="button" key={s} className="chip chip-ghost" onClick={() => add(s)}>
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      {icon && <div className="empty-icon">{icon}</div>}
      <h3>{title}</h3>
      {children && <div className="empty-body">{children}</div>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

export function IconTile({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="tile">
      <span className="tile-icon">{icon}</span>
      <div>
        <div className="tile-label">{label}</div>
        <div className="tile-value">{value}</div>
      </div>
    </div>
  );
}

/* ---------- Toasts ---------- */
interface Toast { id: number; text: string; tone: 'ok' | 'err' }
const ToastCtx = createContext<(text: string, tone?: 'ok' | 'err') => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-1), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            {t.tone === 'ok' ? <Check size={15} /> : <CircleAlert size={15} />} {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

export function timeAgo(ts: number) {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
