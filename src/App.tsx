import { useEffect, useMemo, useRef, useState } from "react";

// ---------------- Types / Save ----------------
type SaveState = {
  pelmeni: number;
  perTap: number;
  perSecond: number;
  totalTaps: number;
  createdAt: number;
};

const SAVE_KEY = "pelmeni-save-v2";

function loadState(): SaveState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveState(s: SaveState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {}
}
const fmt = (n: number) => Intl.NumberFormat().format(Math.floor(n));

// ---------------- Floaters (+N) ----------------
function useFloaters() {
  const [floaters, setFloaters] = useState<Array<{ id: number; x: number; y: number; text: string }>>([]);
  const idRef = useRef(0);
  const add = (x: number, y: number, text: string) => {
    const id = ++idRef.current;
    setFloaters((f) => [...f, { id, x, y, text }]);
    setTimeout(() => setFloaters((f) => f.filter((i) => i.id !== id)), 900);
  };
  return { floaters, add };
}

// ---------------- Particles (mini pelmeni) ----------------
type Particle = { id: number; x: number; y: number; tx: number; ty: number; rot: number };

function useParticles() {
  const [parts, setParts] = useState<Particle[]>([]);
  const idRef = useRef(0);

  const burst = (cx: number, cy: number, count = 12) => {
    const items: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const dist = 60 + Math.random() * 40;
      items.push({
        id: ++idRef.current,
        x: cx,
        y: cy,
        tx: Math.cos(ang) * dist,
        ty: Math.sin(ang) * dist * (0.6 + Math.random() * 0.7),
        rot: (Math.random() - 0.5) * 360,
      });
    }
    setParts((p) => [...p, ...items]);
    setTimeout(() => {
      const ids = new Set(items.map((i) => i.id));
      setParts((p) => p.filter((i) => !ids.has(i.id)));
    }, 750);
  };

  return { parts, burst };
}

function BigPelmeni({
  onTap,
  squish = false,
  size = 360, // можно 420 на десктопе
}: {
  onTap: (e?: React.MouseEvent) => void;
  squish?: boolean;
  size?: number;
}): JSX.Element {
  return (
    <button
      onClick={onTap}
      className={`relative mx-auto block select-none rounded-full active:scale-[.985]
                  pelmeni-idle ${squish ? "pelmeni-squish" : ""}`}
      style={{ width: size, height: size, transform: "translateZ(0)" }}
      aria-label="Tap the pelmeni"
      title="Tap!"
    >
      <svg viewBox="0 0 300 300" className="h-full w-full drop-shadow-[0_18px_30px_rgba(0,0,0,.35)]">
        <ellipse cx="150" cy="210" rx="120" ry="28" fill="#000" opacity="0.12" />
        <circle cx="150" cy="150" r="120" fill="#f7e7c6" />
        <path d="M35 150 C85 115, 215 115, 265 150" fill="none" stroke="#e1cfa6" strokeWidth="12" />
        <path d="M60 185 C115 152, 185 152, 240 185" fill="none" stroke="#e1cfa6" strokeWidth="12" />
        <circle cx="110" cy="115" r="24" fill="#fff" opacity="0.55" />
        <circle cx="120" cy="165" r="9" fill="#333" />
        <circle cx="180" cy="165" r="9" fill="#333" />
        <path d="M130 185 Q150 202 170 185" stroke="#333" strokeWidth="6" fill="none" strokeLinecap="round" />
      </svg>
      <span className="pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2
                       rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-zinc-800 shadow">
        нажми
      </span>
    </button>
  );
}


// ---------------- App ----------------
export default function App() {
  // Telegram theme (если открыто в mini app)
  useEffect(() => {
    const w = window as any;
    const wa = w?.Telegram?.WebApp;
    if (wa) {
      try {
        wa.ready();
        wa.expand();
        document.documentElement.style.setProperty("--tg-bg", wa.themeParams?.bg_color || "#0b1220");
      } catch {}
    }
  }, []);

  const initial: SaveState = useMemo(
    () =>
      loadState() || { pelmeni: 0, perTap: 1, perSecond: 0, totalTaps: 0, createdAt: Date.now() },
    []
  );
  const [state, setState] = useState<SaveState>(initial);
  const [tick, setTick] = useState(0);
  const [squish, setSquish] = useState(false);

  const boardRef = useRef<HTMLDivElement>(null);
  const { floaters, add } = useFloaters();
  const { parts, burst } = useParticles();

  // persist
  useEffect(() => saveState(state), [state]);

  // passive income
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (state.perSecond > 0) setState((s) => ({ ...s, pelmeni: s.pelmeni + s.perSecond }));
  }, [tick]);

  // tap
  const onTap = (e?: React.MouseEvent) => {
    const delta = state.perTap;
    setState((s) => ({ ...s, pelmeni: s.pelmeni + delta, totalTaps: s.totalTaps + 1 }));
    setSquish(true);
    setTimeout(() => setSquish(false), 160);

    // floaters + particles around click
    if (boardRef.current && e) {
      const rect = boardRef.current.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      add(cx, cy, `+${delta}`);
      burst(cx, cy, Math.min(14, 6 + Math.floor(delta / 2)));
    }
  };

  const shop = [
    { id: "tap+1", title: "Сильнее нажимать", desc: "+1 за тап", cost: 50, apply: (s: SaveState) => ({ ...s, perTap: s.perTap + 1 }) },
    { id: "tap+5", title: "Лопатка пельменная", desc: "+5 за тап", cost: 250, apply: (s: SaveState) => ({ ...s, perTap: s.perTap + 5 }) },
    { id: "auto+1", title: "Вареник-робот", desc: "+1/сек", cost: 200, apply: (s: SaveState) => ({ ...s, perSecond: s.perSecond + 1 }) },
    { id: "auto+5", title: "Цех лепки", desc: "+5/сек", cost: 900, apply: (s: SaveState) => ({ ...s, perSecond: s.perSecond + 5 }) },
  ];
  const buy = (it: (typeof shop)[number]) => {
    if (state.pelmeni < it.cost) return;
    setState((s) => ({ ...it.apply({ ...s, pelmeni: s.pelmeni - it.cost }) }));
  };

  const reset = () => {
    if (!confirm("Сбросить прогресс?")) return;
    const fresh: SaveState = { pelmeni: 0, perTap: 1, perSecond: 0, totalTaps: 0, createdAt: Date.now() };
    setState(fresh);
    saveState(fresh);
  };

  return (
    <div className="min-h-screen bg-[var(--tg-bg,#0b1220)] text-white">
      {/* красивый фон */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -inset-40 bg-gradient-to-br from-[#0b1220] via-[#131b39] to-[#1f2a4f] animate-grad-slow" />
        <div className="noise-mask pointer-events-none absolute inset-0 opacity-[.08]" />
        <div className="grid-glow pointer-events-none absolute inset-0" />
      </div>

      <div className="safe mx-auto max-w-4xl px-4 py-6">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">🥟 Pelmeni Tapper</h1>
          <div className="flex items-center gap-2 text-xs opacity-80">
            <button onClick={reset} className="rounded-xl bg-white/10 px-3 py-1 hover:bg-white/15">Сброс</button>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(JSON.stringify(state)); alert("Сейв скопирован"); }}
              className="rounded-xl bg-white/10 px-3 py-1 hover:bg-white/15"
            >Экспорт</a>
          </div>
        </header>

        <main className="grid gap-6 md:grid-cols-[1.15fr_0.85fr]">
          {/* поле игры */}
          <section className="relative rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            {/* счетчики */}
            <div className="mb-4 grid grid-cols-3 gap-3 text-center text-balance">
              <div className="rounded-2xl bg-white/10 p-3">
                <div className="text-[11px] uppercase tracking-wide text-white/70">Пельмени</div>
                <div className="text-3xl md:text-4xl font-extrabold tabular-nums">{fmt(state.pelmeni)}</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <div className="text-[11px] uppercase tracking-wide text-white/70">За тап</div>
                <div className="text-3xl md:text-4xl font-extrabold tabular-nums">{fmt(state.perTap)}</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <div className="text-[11px] uppercase tracking-wide text-white/70">В сек.</div>
                <div className="text-3xl md:text-4xl font-extrabold tabular-nums">{fmt(state.perSecond)}</div>
              </div>
            </div>

            {/* арена */}
            <div className="relative" ref={boardRef}>
              <div onClick={onTap} className="mx-auto w-fit">
               <BigPelmeni onTap={onTap} squish={squish} size={380} />
              </div>

              {/* +N */}
              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                {floaters.map((f) => (
                  <span key={f.id} className="absolute floater select-none text-lg font-bold text-emerald-300"
                        style={{ transform: `translate(${f.x}px, ${f.y}px)` }}>{f.text}</span>
                ))}
              </div>

              {/* мини-пельмени */}
              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                {parts.map((p) => (
                  <span
                    key={p.id}
                    className="pelmeni-particle text-xl"
                    style={{
                      transform: `translate(${p.x}px, ${p.y}px) rotate(${p.rot}deg)`,
                      // конечная траектория:
                      ["--tx" as any]: `${p.tx}px`,
                      ["--ty" as any]: `${p.ty}px`,
                    }}
                  >
                    🥟
                  </span>
                ))}
              </div>
            </div>

            <p className="mt-6 text-center text-sm text-white/70">
              Кликай по большому пельменю — запускай салют из мини-пельменей 🥟
            </p>
          </section>

          {/* магазин */}
          <aside className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <h2 className="mb-3 text-lg font-semibold">Магазин</h2>
            <div className="grid gap-3">
              {shop.map((it) => (
                <button
                  key={it.id}
                  onClick={() => buy(it)}
                  disabled={state.pelmeni < it.cost}
                  className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-left transition hover:bg-white/15 disabled:opacity-50"
                >
                  <div>
                    <div className="font-medium">{it.title}</div>
                    <div className="text-xs text-white/70">{it.desc}</div>
                  </div>
                  <div className="rounded-xl bg-black/30 px-3 py-1 text-sm">{fmt(it.cost)} 🥟</div>
                </button>
              ))}
            </div>
          </aside>
        </main>

        <footer className="mt-6 flex items-center justify-between text-xs text-white/60">
          <div>Всего нажатий: {fmt(state.totalTaps)}</div>
          <div>v0.2 · локальное сохранение</div>
        </footer>
      </div>
    </div>
  );
}
