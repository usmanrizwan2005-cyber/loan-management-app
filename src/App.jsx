import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, onSnapshot, getDocs, writeBatch } from 'firebase/firestore';
import { Toaster } from 'react-hot-toast';
import { auth, db } from './firebase';
import { toJSDate, formatCurrency } from './utils/helpers';
import { currencies } from './utils/currencies';
import Login from './components/Login.jsx';
import LoanForm from './components/LoanForm';
import LoanList from './components/LoanList';
import Trash from './components/Trash.jsx';

const VIEW_MODES = [
  { key: 'loans', label: 'Portfolio' },
  { key: 'trash', label: 'Trash' },
];

const PALETTE_CHOICES = [
  { key: 'custom', label: 'Aurora' },
  { key: 'sky', label: 'Sky' },
  { key: 'ocean', label: 'Ocean' },
  { key: 'forest', label: 'Forest' },
  { key: 'rose', label: 'Rose' },
  { key: 'violet', label: 'Violet' },
  { key: 'amber', label: 'Amber' },
  { key: 'slate', label: 'Slate' },
];

function App() {
  const [user, loading] = useAuthState(auth);
  const [loans, setLoans] = useState([]);
  const [view, setView] = useState('loans');
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [showSettings, setShowSettings] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(() => Number(localStorage.getItem('itemsPerPage') || 10));
  const [defaultCurrency] = useState(() => localStorage.getItem('preferredCurrency') || 'PKR');
  const [currencyLocale] = useState(() => localStorage.getItem('currencyLocale') || 'en-US');
  const [themePalette, setThemePalette] = useState(() => localStorage.getItem('themePalette') || 'custom');

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  useEffect(() => {
    localStorage.setItem('itemsPerPage', String(itemsPerPage));
  }, [itemsPerPage]);

  useEffect(() => {
    if (defaultCurrency) {
      localStorage.setItem('preferredCurrency', defaultCurrency);
    }
  }, [defaultCurrency]);

  useEffect(() => {
    if (currencyLocale) {
      localStorage.setItem('currencyLocale', currencyLocale);
    }
  }, [currencyLocale]);

  const applyThemePalette = (palette) => {
    const root = document.documentElement;
    const palettes = {
      custom: {
        '--color-primary': '#2563eb',
        '--color-primary-hover': '#1d4ed8',
        '--color-primary-active': '#1e40af',
        '--color-accent': '#0ea5e9',
        '--color-info': '#38bdf8',
        '--color-surface': '#ffffff',
        '--color-surface-alt': 'rgba(255, 255, 255, 0.75)',
        '--color-border': '#d8def4',
        '--color-border-strong': '#c5cbea',
        '--color-bg': '#f3f4ff',
        '--color-muted': '#64748b',
        '--color-text': '#0f172a',
        '--color-heading': '#0b1220',
      },
      sky: {
        '--color-primary': '#0ea5e9',
        '--color-primary-hover': '#0284c7',
        '--color-primary-active': '#0369a1',
        '--color-accent': '#38bdf8',
        '--color-info': '#22d3ee',
        '--color-surface': '#f8feff',
        '--color-surface-alt': '#f0f9ff',
        '--color-border': '#cae8ff',
        '--color-border-strong': '#9ed8ff',
        '--color-bg': '#eef9ff',
        '--color-muted': '#0f172a',
        '--color-text': '#082f49',
        '--color-heading': '#0f172a',
      },
      ocean: {
        '--color-primary': '#0284c7',
        '--color-primary-hover': '#0369a1',
        '--color-primary-active': '#075985',
        '--color-accent': '#0ea5e9',
        '--color-info': '#38bdf8',
        '--color-surface': '#e0f2fe',
        '--color-surface-alt': 'rgba(224, 242, 254, 0.85)',
        '--color-border': '#9cd6f7',
        '--color-border-strong': '#6ec0ea',
        '--color-bg': '#d8efff',
        '--color-muted': '#0f172a',
        '--color-text': '#0b1220',
        '--color-heading': '#082f49',
      },
      forest: {
        '--color-primary': '#059669',
        '--color-primary-hover': '#047857',
        '--color-primary-active': '#065f46',
        '--color-accent': '#34d399',
        '--color-info': '#a7f3d0',
        '--color-surface': '#ecfdf5',
        '--color-surface-alt': 'rgba(236, 253, 245, 0.85)',
        '--color-border': '#bbf7d0',
        '--color-border-strong': '#86efac',
        '--color-bg': '#dcfce7',
        '--color-muted': '#064e3b',
        '--color-text': '#022c22',
        '--color-heading': '#022c22',
      },
      rose: {
        '--color-primary': '#e11d48',
        '--color-primary-hover': '#be123c',
        '--color-primary-active': '#9f1239',
        '--color-accent': '#fb7185',
        '--color-info': '#fecdd3',
        '--color-surface': '#fff1f2',
        '--color-surface-alt': 'rgba(255, 241, 242, 0.85)',
        '--color-border': '#fbcfe8',
        '--color-border-strong': '#f472b6',
        '--color-bg': '#ffe4e6',
        '--color-muted': '#831843',
        '--color-text': '#4a044e',
        '--color-heading': '#4a044e',
      },
      violet: {
        '--color-primary': '#7c3aed',
        '--color-primary-hover': '#6d28d9',
        '--color-primary-active': '#5b21b6',
        '--color-accent': '#a855f7',
        '--color-info': '#c4b5fd',
        '--color-surface': '#f5f3ff',
        '--color-surface-alt': 'rgba(245, 243, 255, 0.85)',
        '--color-border': '#ddd6fe',
        '--color-border-strong': '#c4b5fd',
        '--color-bg': '#ede9fe',
        '--color-muted': '#4338ca',
        '--color-text': '#2e1065',
        '--color-heading': '#1e1b4b',
      },
      amber: {
        '--color-primary': '#d97706',
        '--color-primary-hover': '#b45309',
        '--color-primary-active': '#92400e',
        '--color-accent': '#f59e0b',
        '--color-info': '#fde68a',
        '--color-surface': '#fffbeb',
        '--color-surface-alt': 'rgba(255, 251, 235, 0.88)',
        '--color-border': '#fcd34d',
        '--color-border-strong': '#fbbf24',
        '--color-bg': '#fef3c7',
        '--color-muted': '#78350f',
        '--color-text': '#422006',
        '--color-heading': '#7c2d12',
      },
      slate: {
        '--color-primary': '#334155',
        '--color-primary-hover': '#1e293b',
        '--color-primary-active': '#0f172a',
        '--color-accent': '#64748b',
        '--color-info': '#94a3b8',
        '--color-surface': '#f1f5f9',
        '--color-surface-alt': 'rgba(241, 245, 249, 0.85)',
        '--color-border': '#cbd5f5',
        '--color-border-strong': '#94a3b8',
        '--color-bg': '#e2e8f0',
        '--color-muted': '#475569',
        '--color-text': '#0f172a',
        '--color-heading': '#020617',
      },
    };

    const selected = palettes[palette] || palettes.custom;
    Object.entries(selected).forEach(([name, value]) => {
      root.style.setProperty(name, value);
    });
  };

  useEffect(() => {
    applyThemePalette(themePalette);
    localStorage.setItem('themePalette', themePalette);
  }, [themePalette]);

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'loans'),
        where('ownerUid', '==', user.uid),
        where('deletedAt', '==', null)
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const loansData = [];
        querySnapshot.forEach((docSnap) => {
          loansData.push({ ...docSnap.data(), id: docSnap.id });
        });
        loansData.sort((a, b) => {
          const da = toJSDate(a.createdAt);
          const dbb = toJSDate(b.createdAt);
          const ta = da ? da.getTime() : 0;
          const tb = dbb ? dbb.getTime() : 0;
          return tb - ta;
        });
        setLoans(loansData);
      });

      return () => unsubscribe();
    }

    setLoans([]);
  }, [user]);

  useEffect(() => {
    const checkAndUpdateLateLoans = async () => {
      if (!user) return;
      const lateLoansQuery = query(
        collection(db, 'loans'),
        where('ownerUid', '==', user.uid),
        where('status', '==', 'pending'),
        where('dueDate', '<', new Date()),
        where('deletedAt', '==', null)
      );
      const querySnapshot = await getDocs(lateLoansQuery);
      if (querySnapshot.empty) return;
      const batch = writeBatch(db);
      querySnapshot.forEach((docSnap) => {
        batch.update(docSnap.ref, { status: 'late' });
      });
      await batch.commit();
    };

    checkAndUpdateLateLoans();
  }, [user]);

  const handleLogout = () => {
    auth.signOut();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-lg font-medium">Loading...</div>;
  }

  if (!user) {
    return <Login />;
  }

  const totals = loans.reduce(
    (acc, loan) => {
      const amount = Number(loan.amount || 0);
      const paid = loan.repaidAt
        ? amount
        : Math.min(
            (Array.isArray(loan.paymentHistory) ? loan.paymentHistory : [])
              .filter((p) => p?.type === 'partial' || p?.type === 'adjustment')
              .reduce((sum, p) => sum + Number(p.amount || 0), 0),
            amount
          );
      const remaining = Math.max(amount - paid, 0);
      acc.total += amount;
      acc.paid += paid;
      acc.remaining += remaining;
      return acc;
    },
    { total: 0, paid: 0, remaining: 0 }
  );

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <div className="min-h-screen pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <header className="pt-12 space-y-10">
            <div className="relative overflow-hidden glass p-6 sm:p-10">
              <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/30 to-transparent dark:from-white/5 dark:via-white/0" aria-hidden />
              <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-5 text-center lg:text-left">
                  <span className="tag-pill">Stay on top of every promise</span>
                  <div className="space-y-3">
                    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--color-heading)]">
                      Loan Manager
                    </h1>
                    <p className="text-base sm:text-lg text-[var(--color-muted)] max-w-xl mx-auto lg:mx-0">
                      A calm, responsive workspace for tracking balances, celebrating repayments, and keeping lending relationships transparent.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-[var(--color-muted)] lg:justify-start">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] dark:bg-white/10">
                      <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                      Real-time sync via Firebase
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] dark:bg-white/10">
                      <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                      Multi-currency tracking
                    </div>
                  </div>
                </div>
                <div className="w-full max-w-sm mx-auto lg:mx-0">
                  <div className="surface p-5 sm:p-6 flex flex-col gap-5 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">Signed in</p>
                        <p className="mt-1 text-base font-semibold text-[var(--color-heading)] truncate" title={user?.email || ''}>
                          {user?.email}
                        </p>
                      </div>
                      <button onClick={handleLogout} className="btn btn-danger px-4 py-2">Sign out</button>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:flex-row">
                      <button onClick={() => setShowSettings(true)} className="btn btn-surface text-sm px-4 py-2 w-full sm:w-auto">
                        Preferences
                      </button>
                      <button onClick={() => setDark((prev) => !prev)} className="btn btn-outline text-sm px-4 py-2 w-full sm:w-auto">
                        {dark ? 'Light mode' : 'Dark mode'}
                      </button>
                    </div>
                    <div className="rounded-xl bg-[var(--color-surface-alt)]/60 p-4 text-xs leading-relaxed text-[var(--color-muted)] shadow-inner">
                      Customize palettes and pagination anytime from preferences.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="toolbar">
                {VIEW_MODES.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setView(option.key)}
                    className={`btn text-sm px-4 py-2 w-full sm:w-auto ${view === option.key ? 'btn-primary shadow-md' : 'btn-ghost'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-[var(--color-muted)] md:justify-end">
                <span className="hidden sm:inline">Showing</span>
                <span className="font-semibold text-[var(--color-heading)]">{loans.length}</span>
                <span>active records</span>
              </div>
            </div>
          </header>

          <main className="mt-10 space-y-10">
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <article className="stat-card">
                <span className="stat-card__label">Total outstanding</span>
                <span className="stat-card__value text-[var(--color-heading)]">
                  {formatCurrency(totals.total, defaultCurrency, currencyLocale)}
                </span>
                <span className="text-sm text-[var(--color-muted)]">Across every active loan</span>
              </article>
              <article className="stat-card">
                <span className="stat-card__label">Collected</span>
                <span className="stat-card__value text-green-600 dark:text-green-400">
                  {formatCurrency(totals.paid, defaultCurrency, currencyLocale)}
                </span>
                <span className="text-sm text-[var(--color-muted)]">Payments logged so far</span>
              </article>
              <article className="stat-card">
                <span className="stat-card__label">Remaining</span>
                <span className="stat-card__value text-amber-600 dark:text-amber-300">
                  {formatCurrency(totals.remaining, defaultCurrency, currencyLocale)}
                </span>
                <span className="text-sm text-[var(--color-muted)]">Balance still expected</span>
              </article>
            </section>

            {view === 'loans' && (
              <>
                <LoanForm />
                <LoanList loans={loans} itemsPerPage={itemsPerPage} />
              </>
            )}

            {view === 'trash' && <Trash />}
          </main>
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-[var(--color-surface)] shadow-2xl max-h-[calc(100vh-2rem)] flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/8 via-transparent to-transparent pointer-events-none" aria-hidden />
            <div className="relative flex-1 overflow-y-auto px-6 sm:px-8 py-6 sm:py-8 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-semibold text-[var(--color-heading)]">Preferences</h3>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">Tweak the workspace to match how you work.</p>
                </div>
                <button onClick={() => setShowSettings(false)} className="btn btn-ghost text-sm px-3 py-2">Close</button>
              </div>

              <div className="grid gap-6">
                <div className="flex items-center justify-between gap-4 rounded-2xl bg-[var(--color-surface-alt)]/70 p-4 text-sm">
                  <div>
                    <p className="font-medium text-[var(--color-heading)]">Theme</p>
                    <p className="text-[var(--color-muted)]">Switch between light and dark surfaces.</p>
                  </div>
                  <button onClick={() => setDark((prev) => !prev)} className="btn btn-outline px-4 py-2">
                    {dark ? 'Light mode' : 'Dark mode'}
                  </button>
                </div>


                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium text-[var(--color-heading)]">Items per page</span>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={itemsPerPage}
                    onChange={(event) =>
                      setItemsPerPage(
                        Math.max(5, Math.min(100, Number(event.target.value) || 10))
                      )
                    }
                    className="input"
                  />
                  <span className="text-xs text-[var(--color-muted)]">
                    Affects pagination wherever lists become longer than the set size.
                  </span>
                </label>

                <div className="grid gap-3">
                  <p className="font-medium text-[var(--color-heading)]">Color palette</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PALETTE_CHOICES.map((option) => (
                      <label
                        key={option.key}
                        className={`flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-sm transition-colors ${
                          themePalette === option.key
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/8'
                            : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="palette"
                            value={option.key}
                            checked={themePalette === option.key}
                            onChange={() => setThemePalette(option.key)}
                            className="h-3 w-3"
                          />
                          {option.label}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 rounded-full bg-[var(--color-primary)]" />
                          <span className="h-4 w-4 rounded-full bg-[var(--color-accent)]" />
                          <span className="h-4 w-4 rounded-full bg-[var(--color-info)]" />
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
