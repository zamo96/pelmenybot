import { useEffect, useMemo, useRef, useState } from "react";

// --- Types
type SaveState = {
  pelmeni: number; // total tiny pelmeni (score)
  perTap: number; // how many tiny pelmeni per tap
  perSecond: number; // passive income per second
  totalTaps: number;
  createdAt: number;
};

const SAVE_KEY = "pelmeni-save-v1";

// Utility: load/save
function loadState(): SaveState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state: SaveState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {}
}

// Simple number formatter
function fmt(n: number) {
  return Intl.NumberFormat().format(Math.floor(n));
}

// Cute dumpling SVG component
function BigPelmeni({ onTap }: { onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className="relative mx-auto block h-64 w-64 select-none rounded-full transition-transform active:scale-95"
      aria-label="Tap the pelmeni"
      title="Tap!"
    >
      <svg viewBox="0 0 300 300" className="h-full w-full drop-shadow-xl">
        {/* shadow */}
        <ellipse cx="150" cy="205" rx="110" ry="25" fill="#d9d9d9" opacity="0.6" />
        {/* base */}
        <circle cx="150" cy="150" r="110" fill="#f7e7c6" />
        {/* folds */}
        <path d="M40 150 C80 120, 220 120, 260 150" fill="none" stroke="#e1cfa6" strokeWidth="10" />
        <path d="M60 180 C110 150, 190 150, 240 180" fill="none" stroke="#e1cfa6" strokeWidth="10" />
        {/* highlight */}
        <circle cx="110" cy="120" r="20" fill="#fff" opacity="0.6" />
        {/* face */}
        <circle cx="120" cy="160" r="8" fill="#333" />
        <circle cx="180" cy="160" r="8" fill="#333" />
        <path d="M130 180 Q150 195 170 180" stroke="#333" strokeWidth="6" fill="none" strokeLinecap="round" />
      </svg>
      <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-zinc-700 shadow">нажми</span>
    </button>
  );
}

// Floating +1 pellets on tap
function useFloaters() {
  const [floaters, setFloaters] = useState<Array<{ id: number; x: number; y: number; text: string }>>([]);
  const idRef = useRef(0);
  useEffect(() => {
    const t = setInterval(() => {
      setFloaters((f) => f.slice(-12)); // cap to last N to avoid overflow
    }, 1000);
    return () => clearInterval(t);
  }, []);
  return {
    floaters,
    addFloater(x: number, y: number, text: string) {
      const id = ++idRef.current;
      setFloaters((f) => [...f, { id, x, y, text }]);
      setTimeout(() => setFloaters((f) => f.filter((i) => i.id !== id)), 900);
    },
  };
}

export default function App() {
  // Telegram Mini App integration (optional)
  useEffect(() => {
    const w = window as any;
    if (w?.Telegram?.WebApp) {
      try {
        const wa = w.Telegram.WebApp;
        wa.ready();
        wa.expand();
        // match theme a bit
        document.documentElement.style.setProperty("--tg-bg", wa.themeParams?.bg_color || "#0b1220");
      } catch {}
    }
  }, []);

  const initial: SaveState = useMemo(
    () =>
      loadState() || {
        pelmeni: 0,
        perTap: 1,
        perSecond: 0,
        totalTaps: 0,
        createdAt: Date.now(),
      },
    []
  );

  const [state, setState] = useState<SaveState>(initial);
  const [tick, setTick] = useState(0);
  const { floaters, addFloater } = useFloaters();

  // Save on change
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Passive income loop (60fps throttled per second)
  useEffect(() => {
    const t = setInterval(() => {
      setTick((x) => x + 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (state.perSecond > 0) {
      setState((s) => ({ ...s, pelmeni: s.pelmeni + s.perSecond }));
    }
  }, [tick]);

  // Handle tap
  const onTap = (e?: React.MouseEvent) => {
    const delta = state.perTap;
    setState((s) => ({ ...s, pelmeni: s.pelmeni + delta, totalTaps: s.totalTaps + 1 }));
    // Floater at click position
    if (e) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      addFloater(e.clientX - rect.left - rect.width / 2, e.clientY - rect.top - rect.height / 2, `+${delta}`);
    }
  };

  // Simple shop items (optional, for engagement)
  const shop = [
    { id: "tap2", title: "Сильнее нажимать", desc: "+1 за тап", cost: 50, apply: (s: SaveState) => ({ ...s, perTap: s.perTap + 1 }) },
    { id: "tap5", title: "Лопатка пельменная", desc: "+5 за тап", cost: 250, apply: (s: SaveState) => ({ ...s, perTap: s.perTap + 5 }) },
    { id: "auto1", title: "Вареник-робот", desc: "+1/сек", cost: 200, apply: (s: SaveState) => ({ ...s, perSecond: s.perSecond + 1 }) },
    { id: "auto5", title: "Цех лепки", desc: "+5/сек", cost: 900, apply: (s: SaveState) => ({ ...s, perSecond: s.perSecond + 5 }) },
  ];

  function buy(item: (typeof shop)[number]) {
    if (state.pelmeni < item.cost) return;
    setState((s) => ({ ...item.apply({ ...s, pelmeni: s.pelmeni - item.cost }) }));
  }

  function reset() {
    if (!confirm("Сбросить прогресс?")) return;
    const fresh: SaveState = { pelmeni: 0, perTap: 1, perSecond: 0, totalTaps: 0, createdAt: Date.now() };
    setState(fresh);
    saveState(fresh);
  }

  return (
    <div className="min-h-screen bg-[var(--tg-bg,#0b1220)] text-white">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">🥟 Pelmeni Tapper</h1>
          <div className="flex items-center gap-2 text-xs opacity-80">
            <button onClick={reset} className="rounded-xl bg-white/10 px-3 py-1 hover:bg-white/15">
              Сброс
            </button>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                navigator.clipboard.writeText(JSON.stringify(state));
                alert("Сейв скопирован в буфер обмена");
              }}
              className="rounded-xl bg-white/10 px-3 py-1 hover:bg-white/15"
            >
              Экспорт
            </a>
          </div>
        </header>

        <main className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <section className="relative rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            {/* Score */}
            <div className="mb-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-white/10 p-3">
                <div className="text-[11px] uppercase tracking-wide text-white/70">Пельмени</div>
                <div className="text-3xl font-extrabold tabular-nums">{fmt(state.pelmeni)}</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <div className="text-[11px] uppercase tracking-wide text-white/70">За тап</div>
                <div className="text-3xl font-extrabold tabular-nums">{fmt(state.perTap)}</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <div className="text-[11px] uppercase tracking-wide text-white/70">В сек.</div>
                <div className="text-3xl font-extrabold tabular-nums">{fmt(state.perSecond)}</div>
              </div>
            </div>

            {/* Big Pelmeni */}
            <div className="relative">
              <div onClick={onTap} className="mx-auto w-fit">
                <BigPelmeni onTap={onTap} />
              </div>

              {/* Floaters */}
              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                {floaters.map((f) => (
                  <span
                    key={f.id}
                    className="absolute animate-[rise_0.9s_ease-out] select-none text-base font-bold text-emerald-300 drop-shadow"
                    style={{ transform: `translate(${f.x}px, ${f.y}px)` }}
                  >
                    {f.text}
                  </span>
                ))}
              </div>
            </div>

            {/* Tap hint */}
            <p className="mt-6 text-center text-sm text-white/70">Кликай по большому пельменю, чтобы лепить маленькие 🥟</p>
          </section>

          {/* Shop */}
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
          <div>v0.1 · сохранение локально</div>
        </footer>
      </div>

      {/* keyframes for floaters */}
      <style>{`
        @keyframes rise { from { opacity: 1; transform: translate(var(--x,0), var(--y,0)) translateY(0); } to { opacity: 0; transform: translate(var(--x,0), var(--y,0)) translateY(-60px); } }
      `}</style>
    </div>
  );
}
