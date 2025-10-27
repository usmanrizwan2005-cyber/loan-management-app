import { useEffect, useMemo, useState, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, onSnapshot, getDocs, writeBatch } from 'firebase/firestore';
import { Toaster } from 'react-hot-toast';
import {
  FaArrowRight,
  FaSignOutAlt,
  FaCog,
  FaChartPie,
  FaPlus,
  FaTrashAlt,
  FaExclamationTriangle,
  FaWallet,
  FaBalanceScale,
  FaTimes,
} from 'react-icons/fa';
import { auth, db } from './firebase';
import { toJSDate, formatCurrency, formatDate } from './utils/helpers';
import { currencies } from './utils/currencies';
import Login from './components/Login.jsx';
import LoanForm from './components/LoanForm';
import LoanList from './components/LoanList';
import Trash from './components/Trash.jsx';
import './App.css';

const SCREEN_WELCOME = 'welcome';
const SCREEN_DASHBOARD = 'dashboard';
const SCREEN_SETTINGS = 'settings';

const VIEW_MODES = [
  { key: 'loans', label: 'Portfolio' },
  { key: 'trash', label: 'Trash' },
];

const LOCALE_OPTIONS = [
  { value: 'en-US', label: 'English (United States)' },
  { value: 'en-GB', label: 'English (United Kingdom)' },
  { value: 'ur-PK', label: 'Urdu (Pakistan)' },
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

const PALETTES = {
  custom: {
    '--color-primary': '#2f44ff',
    '--color-primary-hover': '#2637db',
    '--color-primary-active': '#1d2cae',
    '--color-accent': '#2cb1bc',
    '--color-info': '#3a8bff',
    '--color-surface': '#ffffff',
    '--color-surface-alt': 'rgba(244, 246, 252, 0.9)',
    '--color-border': 'rgba(15, 23, 42, 0.08)',
    '--color-border-strong': 'rgba(15, 23, 42, 0.14)',
    '--color-bg': '#f7f8fb',
    '--color-muted': '#667085',
    '--color-text': '#1d2433',
    '--color-heading': '#111827',
    '--color-page-gradient': 'radial-gradient(circle at 8% 12%, rgba(86, 112, 255, 0.12), transparent 60%), radial-gradient(circle at 92% 10%, rgba(44, 177, 188, 0.12), transparent 55%), linear-gradient(180deg, #f9f9fc 0%, #eef2f9 100%)',
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

function SettingsScreen({
  onBack,
  dark,
  onToggleDark,
  themePalette,
  onSelectPalette,
  itemsPerPage,
  onItemsPerPageChange,
  defaultCurrency,
  onCurrencyChange,
  currencyLocale,
  onLocaleChange,
}) {
  const popularCodes = ['PKR', 'USD', 'EUR', 'GBP', 'AED', 'SAR'];
  const currencyOptions = popularCodes.includes(defaultCurrency)
    ? popularCodes
    : [defaultCurrency, ...popularCodes];

  return (
    <div className="screen settings-screen">
      <header className="settings-header">
        <button type="button" className="button button--ghost" onClick={onBack}>
          Back
        </button>
        <h1 className="settings-title">Preferences</h1>
      </header>

      <section className="settings-section">
        <div className="settings-card">
          <header className="settings-card__header">
            <span className="settings-card__eyebrow">Appearance</span>
            <h2>Workspace theme</h2>
            <p>Personalise the dashboard to suit your eyes and ambient lighting.</p>
          </header>

          <div className="settings-card__content">
            <div className="settings-switch">
              <span>Dark mode</span>
              <button type="button" className="button button--surface" onClick={onToggleDark}>
                {dark ? 'Turn off' : 'Turn on'}
              </button>
            </div>

            <div className="settings-palette">
              <span>Color palette</span>
              <div className="settings-palette__grid">
                {PALETTE_CHOICES.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => onSelectPalette(option.key)}
                    className={`settings-palette__option${themePalette === option.key ? ' settings-palette__option--active' : ''}`}
                  >
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

      </section>
    </div>
  );
}

function App() {
  const [user, loading] = useAuthState(auth);
  const [screen, setScreen] = useState(SCREEN_WELCOME);
  const [loans, setLoans] = useState([]);
  const [viewMode, setViewMode] = useState('loans');
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [themePalette, setThemePalette] = useState(() => localStorage.getItem('themePalette') || 'custom');
  const [itemsPerPage, setItemsPerPage] = useState(() => Number(localStorage.getItem('itemsPerPage') || 10));
  const [defaultCurrency, setDefaultCurrency] = useState(() => localStorage.getItem('preferredCurrency') || 'PKR');
  const [currencyLocale, setCurrencyLocale] = useState(() => localStorage.getItem('currencyLocale') || 'en-US');
  
  // Use refs to track current screen and viewMode for navigation
  const screenRef = useRef(screen);
  const viewModeRef = useRef(viewMode);
  
  // Update refs whenever state changes
  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);
  
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  const navigate = (newScreen, newViewMode = null, shouldAddToHistory = true) => {
    // Save current state to history before navigating (using refs to get current values)
    if (shouldAddToHistory && screenRef.current !== newScreen) {
      const currentState = { screen: screenRef.current, viewMode: viewModeRef.current };
      window.history.pushState(currentState, '', `#${newScreen}`);
    }
    // Update screen and view mode
    setScreen(newScreen);
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  const goBack = () => {
    window.history.back();
  };

  // Initialize from URL hash on mount
  useEffect(() => {
    if (!user) return; // Don't initialize navigation before user is loaded
    const hash = window.location.hash.slice(1);
    if (hash && (hash === SCREEN_DASHBOARD || hash === SCREEN_SETTINGS || hash.startsWith('dashboard-'))) {
      let targetScreen = SCREEN_DASHBOARD;
      let targetViewMode = 'loans';
      
      if (hash.startsWith('dashboard-')) {
        targetScreen = SCREEN_DASHBOARD;
        if (hash === 'dashboard-trash') {
          targetViewMode = 'trash';
        }
      } else if (hash === SCREEN_SETTINGS) {
        targetScreen = SCREEN_SETTINGS;
      }
      
      setScreen(targetScreen);
      setViewMode(targetViewMode);
    }
  }, [user]);

  const openLoanForm = () => {
    if (viewMode !== 'loans') {
      setViewMode('loans');
    }
    setShowLoanForm(true);
  };

  const handleViewModeChange = (mode) => {
    const prevMode = viewModeRef.current;
    if (mode === 'trash') {
      setShowLoanForm(false);
    }
    // Track view mode changes in browser history
    if (screenRef.current === SCREEN_DASHBOARD && prevMode !== mode) {
      window.history.pushState({ screen: screenRef.current, viewMode: prevMode }, '', `#dashboard-${mode}`);
    }
    setViewMode(mode);
  };

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event) => {
      // Get the state from browser history
      const state = event.state;
      if (state && state.screen) {
        setScreen(state.screen);
        if (state.viewMode !== null && state.viewMode !== undefined) {
          setViewMode(state.viewMode);
        }
        if (state.viewMode === 'trash') {
          setShowLoanForm(false);
        }
      } else {
        // If no state, try to get screen from URL hash
        const hash = window.location.hash.slice(1);
        if (hash && hash === SCREEN_WELCOME) {
          setScreen(SCREEN_WELCOME);
        } else if (hash && hash === SCREEN_SETTINGS) {
          setScreen(SCREEN_SETTINGS);
        } else if (hash && hash.startsWith('dashboard-')) {
          setScreen(SCREEN_DASHBOARD);
          if (hash === 'dashboard-trash') {
            setViewMode('trash');
          } else {
            setViewMode('loans');
          }
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Initialize screen and history when user loads
  useEffect(() => {
    if (user) {
      setShowLoanForm(false);
      // Initialize browser history with welcome screen only if no hash exists
      if (!window.location.hash || window.location.hash === '#') {
        setScreen(SCREEN_WELCOME);
        // Use replaceState for initial state, not pushState
        window.history.replaceState({ screen: SCREEN_WELCOME, viewMode: 'loans' }, '', `#${SCREEN_WELCOME}`);
      }
    }
  }, [user]);

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
    const root = document.documentElement;
    const palette = PALETTES[themePalette] || PALETTES.custom;
    Object.entries(palette).forEach(([variable, value]) => {
      root.style.setProperty(variable, value);
    });
    localStorage.setItem('themePalette', themePalette);
  }, [themePalette]);

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

  useEffect(() => {
    if (!user) {
      setLoans([]);
      return undefined;
    }

    const loansQuery = query(
      collection(db, 'loans'),
      where('ownerUid', '==', user.uid),
      where('deletedAt', '==', null)
    );

    const unsubscribe = onSnapshot(loansQuery, (snapshot) => {
      const nextLoans = [];
      snapshot.forEach((docSnap) => {
        nextLoans.push({ ...docSnap.data(), id: docSnap.id });
      });

      nextLoans.sort((a, b) => {
        const createdA = toJSDate(a.createdAt);
        const createdB = toJSDate(b.createdAt);
        return (createdB ? createdB.getTime() : 0) - (createdA ? createdA.getTime() : 0);
      });

      setLoans(nextLoans);
    });

    return () => unsubscribe();
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
      const snapshot = await getDocs(lateLoansQuery);
      if (snapshot.empty) return;
      const batch = writeBatch(db);
      snapshot.forEach((docSnap) => {
        batch.update(docSnap.ref, { status: 'late' });
      });
      await batch.commit();
    };

    checkAndUpdateLateLoans();
  }, [user]);

  const totals = useMemo(() => {
    return loans.reduce(
      (accumulator, loan) => {
        const amount = Number(loan.amount || 0);
        const paid = loan.repaidAt
          ? amount
          : Math.min(
              (Array.isArray(loan.paymentHistory) ? loan.paymentHistory : [])
                .filter((payment) => payment?.type === 'partial' || payment?.type === 'adjustment')
                .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
              amount
            );
        const remaining = Math.max(amount - paid, 0);

        accumulator.total += amount;
        accumulator.paid += paid;
        accumulator.remaining += remaining;

        return accumulator;
      },
      { total: 0, paid: 0, remaining: 0 }
    );
  }, [loans]);

  const { lateCount, dueSoonCount } = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const upcomingThreshold = new Date(today);
    upcomingThreshold.setDate(upcomingThreshold.getDate() + 7);

    return loans.reduce(
      (accumulator, loan) => {
        const dueDate = toJSDate(loan.dueDate);
        const isSettled = loan.repaidAt || loan.status === 'paid';
        if (!dueDate || isSettled) {
          return accumulator;
        }

        if (dueDate < today || loan.status === 'late') {
          accumulator.lateCount += 1;
        } else if (dueDate <= upcomingThreshold) {
          accumulator.dueSoonCount += 1;
        }

        return accumulator;
      },
      { lateCount: 0, dueSoonCount: 0 }
    );
  }, [loans]);

  const repaymentProgress = totals.total
    ? Math.min(100, Math.round((totals.paid / totals.total) * 100))
    : 0;
  const activeLoansCount = loans.length;
  const averageLoanAmount = useMemo(() => {
    if (!loans.length) return 0;
    return totals.total / loans.length;
  }, [loans, totals.total]);
  const attentionCount = lateCount + dueSoonCount;

  const handleLogout = () => {
    auth.signOut();
    // Clear browser history on logout
    window.history.replaceState({ screen: SCREEN_WELCOME, viewMode: 'loans' }, '', `#${SCREEN_WELCOME}`);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-dot" aria-hidden />
        Loading your workspace...
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (screen === SCREEN_WELCOME) {
    return (
      <>
        <Toaster position="top-center" />
        <div className="screen welcome-screen">
          <div className="welcome-shell">

            <article className="welcome-card">
              <header className="welcome-card__header">
                <span className="welcome-eyebrow">Loan Manager</span>
                <h2>Pick up where you left off</h2>
                <p className="welcome-lede">
                  Review loan history, capture new entries, and follow up on repayments without skipping a beat.
                </p>
              </header>

              <ul className="welcome-highlights">
                <li>Real-time sync via Firebase</li>
                <li>Multi-currency support</li>
                <li>Touch-first controls for mobile</li>
              </ul>

              <div className="welcome-card__actions">
                <button type="button" className="button button--primary button--stretch" onClick={() => navigate(SCREEN_DASHBOARD)}>
                  Continue
                  <FaArrowRight aria-hidden />
                </button>
                <button type="button" className="button button--ghost button--stretch" onClick={handleLogout}>
                  Sign out
                </button>
              </div>

              <p className="welcome-user-info">Signed in as {user.email}</p>
            </article>
          </div>
        </div>
      </>
    );
  }

  if (screen === SCREEN_SETTINGS) {
    return (
      <>
        <Toaster position="top-center" />
        <SettingsScreen
          onBack={goBack}
          dark={dark}
          onToggleDark={() => setDark((previous) => !previous)}
          themePalette={themePalette}
          onSelectPalette={setThemePalette}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
          defaultCurrency={defaultCurrency}
          onCurrencyChange={setDefaultCurrency}
          currencyLocale={currencyLocale}
          onLocaleChange={setCurrencyLocale}
        />
      </>
    );
  }

  return (
    <>
      <Toaster position="top-center" />
      <div className="screen dashboard-screen">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar__brand">
            <span className="dashboard-topbar__mark">LM</span>
            <span className="dashboard-topbar__title">Loan Manager</span>
          </div>
          <nav className="dashboard-topbar__nav" aria-label="Primary">
            <button
              type="button"
              className={`topbar-tab${viewMode === 'loans' ? ' is-active' : ''}`}
              onClick={() => handleViewModeChange('loans')}
              aria-pressed={viewMode === 'loans'}
            >
              Portfolio
            </button>
            <button
              type="button"
              className={`topbar-tab${viewMode === 'trash' ? ' is-active' : ''}`}
              onClick={() => handleViewModeChange('trash')}
              aria-pressed={viewMode === 'trash'}
            >
              Archive
            </button>
            <button
              type="button"
              className="topbar-tab"
              onClick={() => navigate(SCREEN_SETTINGS)}
            >
              Settings
            </button>
          </nav>
          <div className="dashboard-topbar__actions">
            <button
              type="button"
              className="button button--surface"
              onClick={() => {
                if (showLoanForm) {
                  setShowLoanForm(false);
                } else {
                  openLoanForm();
                }
              }}
            >
              {showLoanForm ? <FaTimes aria-hidden /> : <FaPlus aria-hidden />}
              <span>{showLoanForm ? 'Close form' : 'New loan'}</span>
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={handleLogout}
            >
              <FaSignOutAlt aria-hidden />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        <main className="dashboard-content">
          {showLoanForm && viewMode === 'loans' ? (
            <section className="panel">
              <div className="panel__header">
                <div className="panel__icon panel__icon--accent">
                  <FaPlus aria-hidden />
                </div>
                <div>
                  <span className="panel__eyebrow">Add record</span>
                  <h2>Create a new loan</h2>
                  <p>Capture borrower details, amounts, and upcoming repayments.</p>
                </div>
              </div>

              <div className="panel__actions">
                <button
                  type="button"
                  className="button button--ghost button--pill"
                  onClick={() => setShowLoanForm(false)}
                >
                  Cancel
                </button>
              </div>

              <LoanForm onClose={() => setShowLoanForm(false)} />
            </section>
          ) : viewMode === 'loans' && !showLoanForm ? (
            <section className="panel insight-panel">
              <div className="panel__header">
                <div className="panel__icon">
                  <FaChartPie aria-hidden />
                </div>
                <div>
                  <span className="panel__eyebrow">Performance</span>
                  <h2>Repayment progress</h2>
                  <p>
                    <strong>{repaymentProgress}%</strong> of portfolio repaid
                  </p>
                </div>
              </div>

              <div className="insight-panel__progress">
                <div className="progress-track">
                  <div className="progress-bar" style={{ width: `${repaymentProgress}%` }} />
                </div>
                <div className="progress-meta">
                  <span>{repaymentProgress}% collected</span>
                  <span>{Math.max(0, 100 - repaymentProgress)}% still open</span>
                </div>
              </div>

              <div className="insight-panel__metrics">
                <article className="metric-card metric-card--info">
                  <div className="metric-card__icon">
                    <FaWallet aria-hidden />
                  </div>
                  <div>
                    <span className="metric-card__label">Cash repaid</span>
                    <strong className="metric-card__value">
                      {formatCurrency(totals.paid, defaultCurrency, currencyLocale)}
                    </strong>
                    <p>{totals.paid ? 'Recorded repayments to date' : 'No repayments captured yet'}</p>
                  </div>
                </article>
                <article className="metric-card metric-card--success">
                  <div className="metric-card__icon">
                    <FaBalanceScale aria-hidden />
                  </div>
                  <div>
                    <span className="metric-card__label">Average ticket</span>
                    <strong className="metric-card__value">
                      {formatCurrency(averageLoanAmount, defaultCurrency, currencyLocale)}
                    </strong>
                    <p>{activeLoansCount ? 'Mean size of active portfolio' : 'Create a loan to set the baseline'}</p>
                  </div>
                </article>
                <article className="metric-card metric-card--warning">
                  <div className="metric-card__icon">
                    <FaExclamationTriangle aria-hidden />
                  </div>
                  <div>
                    <span className="metric-card__label">Attention needed</span>
                    <strong className="metric-card__value">{attentionCount}</strong>
                    <p>
                      {lateCount || dueSoonCount
                        ? `${lateCount} late - ${dueSoonCount} due shortly`
                        : 'All timelines look healthy'}
                    </p>
                  </div>
                </article>
              </div>
            </section>
          ) : null}

          {viewMode === 'loans' ? (
            <LoanList loans={loans} />
          ) : (
            <Trash />
          )}
        </main>

        <nav className="mobile-dock" aria-label="Primary navigation">
          <button
            type="button"
            className={`mobile-dock__item${viewMode === 'loans' ? ' mobile-dock__item--active' : ''}`}
            onClick={() => handleViewModeChange('loans')}
          >
            <FaChartPie aria-hidden />
            <span>Portfolio</span>
          </button>
          <button
            type="button"
            className={`mobile-dock__item${showLoanForm ? ' mobile-dock__item--active' : ''}`}
            onClick={() => {
              if (showLoanForm) {
                setShowLoanForm(false);
              } else {
                openLoanForm();
              }
            }}
          >
            <FaPlus aria-hidden />
            <span>{showLoanForm ? 'Close form' : 'New loan'}</span>
          </button>
          <button
            type="button"
            className={`mobile-dock__item${viewMode === 'trash' ? ' mobile-dock__item--active' : ''}`}
            onClick={() => handleViewModeChange('trash')}
          >
            <FaTrashAlt aria-hidden />
            <span>Trash</span>
          </button>
          <button
            type="button"
            className="mobile-dock__item"
            onClick={() => navigate(SCREEN_SETTINGS)}
          >
            <FaCog aria-hidden />
            <span>Settings</span>
          </button>
        </nav>
      </div>
    </>
  );
}

export default App;
