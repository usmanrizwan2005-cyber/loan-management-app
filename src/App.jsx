import { useEffect, useMemo, useState, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
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
  FaMoon,
  FaSun,
} from 'react-icons/fa';
import { auth, db } from './firebase';
import { toJSDate, formatCurrency, getLoanComputedState } from './utils/helpers';
import Login from './components/Login.jsx';
import LoanForm from './components/LoanForm';
import LoanList from './components/LoanList';
import LoanModal from './components/LoanModal';
import Trash from './components/Trash.jsx';
import './App.css';

const SCREEN_WELCOME = 'welcome';
const SCREEN_DASHBOARD = 'dashboard';
const SCREEN_SETTINGS = 'settings';

const VIEW_MODES = [
  { key: 'loans', label: 'Portfolio' },
  { key: 'insights', label: 'Insights' },
  { key: 'trash', label: 'Archive' },
];

const LOCALE_OPTIONS = [
  { value: 'en-US', label: 'English (United States)' },
  { value: 'en-GB', label: 'English (United Kingdom)' },
  { value: 'ur-PK', label: 'Urdu (Pakistan)' },
];

const ITEMS_PER_PAGE_OPTIONS = [6, 9, 12, 18, 24];

const LIGHT_THEME = {
  '--color-primary': '#1155ff',
  '--color-primary-hover': '#0d43cc',
  '--color-primary-active': '#082f99',
  '--color-accent': '#00a693',
  '--color-info': '#0ea5e9',
  '--color-bg': '#eef5ff',
  '--color-page-gradient': 'radial-gradient(circle at 10% 8%, rgba(17, 85, 255, 0.16), transparent 58%), radial-gradient(circle at 90% 8%, rgba(0, 166, 147, 0.15), transparent 55%), radial-gradient(circle at 20% 90%, rgba(242, 173, 61, 0.12), transparent 50%), linear-gradient(180deg, #f8fbff 0%, #eaf3ff 100%)',
  '--color-surface': 'rgba(255, 255, 255, 0.98)',
  '--color-surface-alt': 'rgba(244, 246, 252, 0.88)',
  '--color-border': 'rgba(15, 23, 42, 0.08)',
  '--color-border-strong': 'rgba(15, 23, 42, 0.14)',
  '--color-muted': '#667085',
  '--color-muted-strong': '#4a5568',
  '--color-text': '#1d2433',
  '--color-heading': '#111827',
  '--shadow-soft': '0 28px 65px rgba(17, 24, 39, 0.08)',
  '--shadow-card': '0 18px 48px rgba(17, 24, 39, 0.06)',
  '--shadow-hover': '0 32px 70px rgba(17, 85, 255, 0.22)',
  '--shadow-elevated': '0 42px 90px rgba(15, 23, 42, 0.12)',
  '--shadow-focus': '0 0 0 4px rgba(17, 85, 255, 0.24)',
  '--gradient-primary': 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-info) 62%, var(--color-accent) 100%)',
  '--gradient-primary-soft': 'linear-gradient(150deg, rgba(17, 85, 255, 0.18) 0%, rgba(6, 182, 212, 0.1) 100%)',
  '--gradient-surface': 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(252, 253, 255, 0.82) 100%)',
  '--gradient-muted': 'linear-gradient(135deg, rgba(102, 112, 133, 0.12) 0%, rgba(102, 112, 133, 0.04) 100%)',
};

const DARK_THEME = {
  '--color-primary': '#3b82f6',
  '--color-primary-hover': '#60a5fa',
  '--color-primary-active': '#2563eb',
  '--color-accent': '#14b8a6',
  '--color-info': '#38bdf8',
  '--color-bg': '#070b14',
  '--color-page-gradient': 'radial-gradient(circle at 12% 10%, rgba(17, 85, 255, 0.28), transparent 42%), radial-gradient(circle at 88% 6%, rgba(0, 166, 147, 0.24), transparent 40%), radial-gradient(circle at 18% 94%, rgba(242, 173, 61, 0.1), transparent 46%), linear-gradient(180deg, #050814 0%, #0b1220 48%, #101827 100%)',
  '--color-surface': 'rgba(15, 23, 42, 0.94)',
  '--color-surface-alt': 'rgba(21, 31, 50, 0.86)',
  '--color-border': 'rgba(148, 163, 184, 0.18)',
  '--color-border-strong': 'rgba(148, 163, 184, 0.3)',
  '--color-muted': '#a5b4c8',
  '--color-muted-strong': '#cbd5e1',
  '--color-text': '#e5edf8',
  '--color-heading': '#f8fafc',
  '--shadow-soft': '0 28px 70px rgba(0, 0, 0, 0.42)',
  '--shadow-card': '0 22px 58px rgba(0, 0, 0, 0.36)',
  '--shadow-hover': '0 34px 76px rgba(17, 85, 255, 0.34)',
  '--shadow-elevated': '0 42px 92px rgba(0, 0, 0, 0.46)',
  '--shadow-focus': '0 0 0 4px rgba(96, 165, 250, 0.34)',
  '--gradient-primary': 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-info) 58%, var(--color-accent) 100%)',
  '--gradient-primary-soft': 'linear-gradient(150deg, rgba(96, 165, 250, 0.22) 0%, rgba(20, 184, 166, 0.13) 100%)',
  '--gradient-surface': 'linear-gradient(180deg, rgba(30, 41, 59, 0.94) 0%, rgba(15, 23, 42, 0.88) 100%)',
  '--gradient-muted': 'linear-gradient(135deg, rgba(148, 163, 184, 0.16) 0%, rgba(148, 163, 184, 0.06) 100%)',
};

const buildHistoryHash = (screenKey, viewModeValue = null) => {
  if (screenKey === SCREEN_DASHBOARD) {
    let suffix = '';
    if (viewModeValue === 'trash') suffix = '-trash';
    else if (viewModeValue === 'insights') suffix = '-insights';
    return `#dashboard${suffix}`;
  }
  return `#${screenKey}`;
};

const buildHistoryState = (screenKey, viewModeValue = null, fallbackViewMode = 'loans') => {
  if (screenKey === SCREEN_DASHBOARD) {
    return {
      screen: SCREEN_DASHBOARD,
      viewMode: viewModeValue ?? fallbackViewMode ?? 'loans',
    };
  }

  return {
    screen: screenKey,
    viewMode: fallbackViewMode ?? null,
  };
};

function SettingsScreen({
  onBack,
  dark,
  onToggleDark,
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
  const currentLocale = LOCALE_OPTIONS.find((option) => option.value === currencyLocale);

  return (
    <div className="screen settings-screen">
      <header className="settings-header">
        <div className="settings-header__main">
          <button type="button" className="button button--ghost settings-header__back" onClick={onBack}>
            Back
          </button>
          <div className="settings-header__copy">
            <span className="settings-card__eyebrow">Workspace preferences</span>
            <h1 className="settings-title">Preferences</h1>
            <p>Adjust the visual style and default loan behavior without affecting your saved records.</p>
          </div>
        </div>

        <div className="settings-header__summary">
          <span className="settings-header__summary-label">Current workspace</span>
          <strong>{dark ? 'Dark' : 'Light'} mode</strong>
          <span>{defaultCurrency} - {currentLocale?.label || currencyLocale}</span>
        </div>
      </header>

      <section className="settings-section">
        <div className="settings-card settings-card--appearance">
          <header className="settings-card__header">
            <span className="settings-card__eyebrow">Appearance</span>
            <h2>Workspace theme</h2>
            <p>Personalise the dashboard to suit your eyes and ambient lighting.</p>
          </header>

          <div className="settings-card__content">
            <div className="settings-switch">
              <div className="settings-switch__copy">
                <span>Dark mode</span>
                <small>Use a lower-glare layout for evening work and dim rooms.</small>
              </div>
              <button
                type="button"
                className={`theme-toggle${dark ? ' theme-toggle--active' : ''}`}
                onClick={onToggleDark}
                aria-pressed={dark}
              >
                <span className="theme-toggle__option theme-toggle__option--light">
                  <FaSun aria-hidden />
                  Light
                </span>
                <span className="theme-toggle__option theme-toggle__option--dark">
                  <FaMoon aria-hidden />
                  Dark
                </span>
                <span className="theme-toggle__thumb" aria-hidden />
              </button>
            </div>

          </div>
        </div>

        <div className="settings-card settings-card--defaults">
          <header className="settings-card__header">
            <span className="settings-card__eyebrow">Defaults</span>
            <h2>Portfolio preferences</h2>
            <p>Control how the loan list is presented and which defaults new records should inherit.</p>
          </header>

          <div className="settings-card__content settings-card__grid">
            <label className="settings-field">
              <span>Loans per page</span>
              <select
                className="input"
                value={itemsPerPage}
                onChange={(event) => onItemsPerPageChange(Number(event.target.value))}
              >
                {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option} loans
                  </option>
                ))}
              </select>
            </label>

            <label className="settings-field">
              <span>Preferred currency</span>
              <select
                className="input"
                value={defaultCurrency}
                onChange={(event) => onCurrencyChange(event.target.value)}
              >
                {currencyOptions.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>

            <label className="settings-field">
              <span>Formatting locale</span>
              <select
                className="input"
                value={currencyLocale}
                onChange={(event) => onLocaleChange(event.target.value)}
              >
                {LOCALE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="settings-switch settings-switch--summary">
              <div className="settings-switch__copy">
                <span>Current defaults</span>
                <small>New loans will start with these display settings.</small>
              </div>
              <strong>{defaultCurrency} - {currencyLocale}</strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function LoanFormDialog({ open, onClose, children }) {
  if (!open) return null;

  return (
    <div className="loan-form-dialog" role="dialog" aria-modal="true" aria-labelledby="loan-form-dialog-title">
      <button
        type="button"
        className="loan-form-dialog__backdrop"
        aria-label="Close add loan form"
        onClick={onClose}
      />
      <section className="loan-form-dialog__panel">
        <header className="loan-form-dialog__header">
          <div className="loan-form-dialog__header-copy">
            <span className="panel__eyebrow">Quick capture</span>
            <h2 id="loan-form-dialog-title">Add a new loan</h2>
            <p>Capture the details here without losing your place in the dashboard.</p>
          </div>
          <button
            type="button"
            className="button button--ghost button--compact loan-form-dialog__close"
            aria-label="Close add loan form"
            onClick={onClose}
          >
            <FaTimes aria-hidden />
            <span>Close</span>
          </button>
        </header>
        <div className="loan-form-dialog__body">{children}</div>
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
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const stored = Number(localStorage.getItem('itemsPerPage') || 12);
    return ITEMS_PER_PAGE_OPTIONS.includes(stored) ? stored : 12;
  });
  const [defaultCurrency, setDefaultCurrency] = useState(() => localStorage.getItem('preferredCurrency') || 'PKR');
  const [currencyLocale, setCurrencyLocale] = useState(() => localStorage.getItem('currencyLocale') || 'en-US');
  // Modal state lifted to App for history-aware back behavior
  const [modalLoanId, setModalLoanId] = useState(null);
  const [modalView, setModalView] = useState('details');
  const [initialPaymentType, setInitialPaymentType] = useState('full');
  
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
    const fallbackViewMode = viewModeRef.current || 'loans';
    const resolvedViewMode =
      newScreen === SCREEN_DASHBOARD ? (newViewMode !== null ? newViewMode : fallbackViewMode) : null;
    const targetState = buildHistoryState(newScreen, resolvedViewMode, fallbackViewMode);
    const targetHash = buildHistoryHash(newScreen, targetState.viewMode);

    if (shouldAddToHistory) {
      const currentView = viewModeRef.current;
      const isDifferentScreen = screenRef.current !== targetState.screen;
      const viewHasChanged =
        targetState.screen === SCREEN_DASHBOARD && targetState.viewMode !== currentView;

      if (isDifferentScreen || viewHasChanged) {
        // Push the TARGET state so back goes to the previous screen step-by-step
        window.history.pushState(targetState, '', targetHash);
      } else {
        // Avoid duplicate entries when navigating to the same target
        window.history.replaceState(targetState, '', targetHash);
      }
    } else {
      window.history.replaceState(targetState, '', targetHash);
    }

    setScreen(newScreen);
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  const goBack = () => {
    window.history.back();
  };

  const openLoanModal = (loanId, viewType, paymentType = 'full') => {
    setModalLoanId(loanId);
    setModalView(viewType);
    setInitialPaymentType(paymentType || 'full');

    const currentView = viewModeRef.current || 'loans';
    const baseState = buildHistoryState(SCREEN_DASHBOARD, currentView, currentView);
    const modalState = { ...baseState, modal: { type: viewType, loanId, initialPaymentType: paymentType } };

    try {
      // History is only for the Back button. The modal opens immediately from React state above.
      window.history.pushState(modalState, '', buildHistoryHash(SCREEN_DASHBOARD, baseState.viewMode));
    } catch (error) {
      console.warn('Unable to push loan modal history state.', error);
    }
  };

  const closeLoanModalViaBack = () => {
    if (window.history.state?.modal) {
      window.history.back();
      return;
    }

    setModalLoanId(null);
  };

  // Initialize from URL hash on mount
  useEffect(() => {
    if (!user) return; // Don't initialize navigation before user is loaded
    const hash = window.location.hash.slice(1);
    if (hash) {
      if (hash === SCREEN_SETTINGS) {
        const state = buildHistoryState(SCREEN_SETTINGS, null, viewModeRef.current || 'loans');
        window.history.replaceState(state, '', buildHistoryHash(SCREEN_SETTINGS, state.viewMode));
        setScreen(SCREEN_SETTINGS);
        return;
      }
      if (hash === SCREEN_DASHBOARD || hash.startsWith('dashboard-')) {
        const view = hash === 'dashboard-trash' ? 'trash' : hash === 'dashboard-insights' ? 'insights' : 'loans';
        const state = buildHistoryState(SCREEN_DASHBOARD, view, viewModeRef.current || 'loans');
        window.history.replaceState(state, '', buildHistoryHash(SCREEN_DASHBOARD, view));
        setScreen(SCREEN_DASHBOARD);
        setViewMode(view);
        return;
      }
      if (hash === SCREEN_WELCOME) {
        const state = buildHistoryState(SCREEN_WELCOME, null, viewModeRef.current || 'loans');
        window.history.replaceState(state, '', buildHistoryHash(SCREEN_WELCOME));
        setScreen(SCREEN_WELCOME);
        return;
      }
    }
  }, [user]);

  const openLoanForm = () => {
    if (viewModeRef.current !== 'loans') {
      handleViewModeChange('loans');
    }
    setShowLoanForm(true);
  };

  const handleViewModeChange = (mode) => {
    const prevMode = viewModeRef.current;
    if (prevMode === mode) {
      return;
    }

    if (mode !== 'loans') {
      setShowLoanForm(false);
    }

    if (screenRef.current === SCREEN_DASHBOARD) {
      const historyState = buildHistoryState(SCREEN_DASHBOARD, mode, prevMode || 'loans');
      const historyHash = buildHistoryHash(SCREEN_DASHBOARD, historyState.viewMode);
      // Push the TARGET dashboard view so back returns to the previous view/screen
      window.history.pushState(historyState, '', historyHash);
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
        // Sync modal state from history
        if (state.modal && state.modal.loanId && state.screen === SCREEN_DASHBOARD) {
          setModalLoanId(state.modal.loanId);
          setModalView(state.modal.type || 'details');
          setInitialPaymentType(state.modal.initialPaymentType || 'full');
        } else {
          setModalLoanId(null);
        }
      } else {
        // If no state, try to get screen from URL hash
        const hash = window.location.hash.slice(1);
        if (hash) {
          if (hash === SCREEN_WELCOME) {
            const welcomeState = buildHistoryState(SCREEN_WELCOME, null, viewModeRef.current || 'loans');
            window.history.replaceState(welcomeState, '', buildHistoryHash(SCREEN_WELCOME));
            setScreen(SCREEN_WELCOME);
            setModalLoanId(null);
            return;
          }
          if (hash === SCREEN_SETTINGS) {
            const stateObj = buildHistoryState(SCREEN_SETTINGS, null, viewModeRef.current || 'loans');
            window.history.replaceState(stateObj, '', buildHistoryHash(SCREEN_SETTINGS));
            setScreen(SCREEN_SETTINGS);
            setModalLoanId(null);
            return;
          }
          if (hash === SCREEN_DASHBOARD || hash.startsWith('dashboard-')) {
            const view = hash === 'dashboard-trash' ? 'trash' : hash === 'dashboard-insights' ? 'insights' : 'loans';
            const stateObj = buildHistoryState(SCREEN_DASHBOARD, view, viewModeRef.current || 'loans');
            window.history.replaceState(stateObj, '', buildHistoryHash(SCREEN_DASHBOARD, view));
            setScreen(SCREEN_DASHBOARD);
            setViewMode(view);
            if (view === 'trash') setShowLoanForm(false);
            setModalLoanId(null);
            return;
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
        const welcomeState = buildHistoryState(SCREEN_WELCOME, null, 'loans');
        window.history.replaceState(welcomeState, '', buildHistoryHash(SCREEN_WELCOME, welcomeState.viewMode));
      }
    }
  }, [user]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', dark);
    root.style.colorScheme = dark ? 'dark' : 'light';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    const root = document.documentElement;
    const modeTheme = dark ? DARK_THEME : LIGHT_THEME;

    Object.entries(modeTheme).forEach(([variable, value]) => {
      root.style.setProperty(variable, value);
    });

    localStorage.removeItem('themePalette');
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

  useEffect(() => {
    if (!showLoanForm) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowLoanForm(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showLoanForm]);

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

  const portfolio = useMemo(() => {
    const currencyMap = new Map();
    let settledCount = 0;
    let pendingCount = 0;
    let lateCount = 0;
    let dueSoonCount = 0;

    loans.forEach((loan) => {
      const computed = getLoanComputedState(loan);
      const currency = loan.currency || defaultCurrency || 'USD';
      const existingCurrency = currencyMap.get(currency) || {
        currency,
        count: 0,
        settledCount: 0,
        total: 0,
        paid: 0,
        remaining: 0,
      };

      existingCurrency.count += 1;
      existingCurrency.total += Number(loan.amount || 0);
      existingCurrency.paid += computed.totalPaid;
      existingCurrency.remaining += computed.remaining;

      if (computed.isEffectivelyPaid) {
        settledCount += 1;
        existingCurrency.settledCount += 1;
      } else {
        pendingCount += 1;
      }

      if (!computed.isEffectivelyPaid && computed.status === 'late') {
        lateCount += 1;
      } else if (computed.isDueSoon) {
        dueSoonCount += 1;
      }

      currencyMap.set(currency, existingCurrency);
    });

    const currencyBreakdown = Array.from(currencyMap.values()).sort((left, right) => {
      if (right.remaining !== left.remaining) return right.remaining - left.remaining;
      if (right.total !== left.total) return right.total - left.total;
      return left.currency.localeCompare(right.currency);
    });

    return {
      totalLoans: loans.length,
      settledCount,
      pendingCount,
      lateCount,
      dueSoonCount,
      currencyBreakdown,
    };
  }, [loans, defaultCurrency]);

  const activeLoansCount = portfolio.totalLoans;
  const settledLoansCount = portfolio.settledCount;
  const pendingLoansCount = portfolio.pendingCount;
  const lateCount = portfolio.lateCount;
  const dueSoonCount = portfolio.dueSoonCount;
  const currencyBreakdown = portfolio.currencyBreakdown;
  const currencyCount = currencyBreakdown.length;
  const topCurrency = currencyBreakdown[0] || null;
  const repaymentProgress = activeLoansCount
    ? Math.min(100, Math.round((settledLoansCount / activeLoansCount) * 100))
    : 0;
  const attentionCount = lateCount + dueSoonCount;
  const dashboardContentClassName = 'dashboard-content dashboard-content--single';

  const handleLogout = () => {
    auth.signOut();
    // Clear browser history on logout
    const welcomeState = buildHistoryState(SCREEN_WELCOME, null, 'loans');
    window.history.replaceState(welcomeState, '', buildHistoryHash(SCREEN_WELCOME, welcomeState.viewMode));
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
    return (
      <>
        <Toaster position="top-center" />
        <Login />
      </>
    );
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
            <div className="dashboard-topbar__brand-copy">
              <span className="dashboard-topbar__title">Loan Manager</span>
              <span className="dashboard-topbar__subtitle">Mobile workspace</span>
            </div>
          </div>
          <nav className="dashboard-topbar__nav" aria-label="Primary">
            {VIEW_MODES.map((mode) => (
              <button
                key={mode.key}
                type="button"
                className={`topbar-tab${viewMode === mode.key ? ' is-active' : ''}`}
                onClick={() => handleViewModeChange(mode.key)}
                aria-pressed={viewMode === mode.key}
              >
                {mode.label}
              </button>
            ))}
            <button
              type="button"
              className={`topbar-tab${screen === SCREEN_SETTINGS ? ' is-active' : ''}`}
              onClick={() => navigate(SCREEN_SETTINGS)}
            >
              Settings
            </button>
          </nav>
          <div className="dashboard-topbar__actions">
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

        {viewMode === 'loans' && (
          <div className="dashboard-cta-row">
            <button
              type="button"
              className="button button--surface dashboard-cta"
              onClick={() => {
                if (showLoanForm) {
                  setShowLoanForm(false);
                } else {
                  openLoanForm();
                }
              }}
            >
              {showLoanForm ? <FaTimes aria-hidden /> : <FaPlus aria-hidden />}
              <span>{showLoanForm ? 'Close form' : 'Add loan'}</span>
            </button>
          </div>
        )}

        <main className={dashboardContentClassName}>
          {viewMode === 'loans' ? (
            <LoanList
              loans={loans}
              itemsPerPage={itemsPerPage}
              onOpenDetails={(loan) => openLoanModal(loan.id, 'details')}
              onOpenExtend={(loan) => openLoanModal(loan.id, 'extend')}
              onOpenEdit={(loan) => openLoanModal(loan.id, 'edit')}
              onOpenMarkPaid={(loan) => openLoanModal(loan.id, 'markPaid', 'full')}
            />
          ) : viewMode === 'insights' ? (
            <section className="panel insight-panel">
              <div className="panel__header">
                <div className="panel__icon">
                  <FaChartPie aria-hidden />
                </div>
                <div>
                  <span className="panel__eyebrow">Health</span>
                  <h2>Portfolio health</h2>
                  <p>
                    <strong>{repaymentProgress}%</strong> of loans are fully settled
                  </p>
                </div>
              </div>

              <div className="insight-panel__progress">
                <div className="progress-track">
                  <div className="progress-bar" style={{ width: `${repaymentProgress}%` }} />
                </div>
                <div className="progress-meta">
                  <span>{settledLoansCount} settled</span>
                  <span>{pendingLoansCount} still open</span>
                </div>
              </div>

              <div className="insight-panel__metrics">
                <article className="metric-card metric-card--info">
                  <div className="metric-card__icon">
                    <FaWallet aria-hidden />
                  </div>
                  <div>
                    <span className="metric-card__label">Open loans</span>
                    <strong className="metric-card__value">{pendingLoansCount}</strong>
                    <p>{pendingLoansCount ? 'Loans still waiting for repayment' : 'All loans are settled'}</p>
                  </div>
                </article>
                <article className="metric-card metric-card--success">
                  <div className="metric-card__icon">
                    <FaBalanceScale aria-hidden />
                  </div>
                  <div>
                    <span className="metric-card__label">Currencies tracked</span>
                    <strong className="metric-card__value">{currencyCount}</strong>
                    <p>
                      {topCurrency
                        ? `Largest open balance is in ${topCurrency.currency}`
                        : 'Create a loan to start tracking balances'}
                    </p>
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
                        ? `${lateCount} overdue - ${dueSoonCount} due soon`
                        : 'All timelines look healthy'}
                    </p>
                  </div>
                </article>
              </div>

              <section className="insight-panel__currencies">
                <div className="insight-panel__currencies-header">
                  <div>
                    <span className="panel__eyebrow">Breakdown</span>
                    <h3>By currency</h3>
                  </div>
                  <p>Balances stay separate so mixed-currency portfolios remain accurate.</p>
                </div>

                {currencyBreakdown.length > 0 ? (
                  <div className="insight-panel__currency-grid">
                    {currencyBreakdown.map((entry) => (
                      <article key={entry.currency} className="currency-breakdown-card">
                        <header className="currency-breakdown-card__header">
                          <strong>{entry.currency}</strong>
                          <span>{entry.count} {entry.count === 1 ? 'loan' : 'loans'}</span>
                        </header>
                        <p className="currency-breakdown-card__value">
                          {formatCurrency(entry.remaining, entry.currency, currencyLocale)}
                        </p>
                        <p className="currency-breakdown-card__meta">
                          {entry.settledCount} settled - {entry.count - entry.settledCount} open
                        </p>
                        <div className="currency-breakdown-card__stats">
                          <span>Total {formatCurrency(entry.total, entry.currency, currencyLocale)}</span>
                          <span>Paid {formatCurrency(entry.paid, entry.currency, currencyLocale)}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="data-panel__empty">
                    <h3>No balances yet</h3>
                    <p>Add a loan to see your portfolio split cleanly by currency.</p>
                  </div>
                )}
              </section>
            </section>
          ) : (
            <Trash />
          )}
        </main>

        <LoanFormDialog open={showLoanForm && viewMode === 'loans'} onClose={() => setShowLoanForm(false)}>
          <LoanForm onClose={() => setShowLoanForm(false)} />
        </LoanFormDialog>

        {modalLoanId && (
          <LoanModal
            loan={loans.find((loan) => loan.id === modalLoanId) || null}
            viewType={modalView}
            onClose={closeLoanModalViaBack}
            initialPaymentType={initialPaymentType}
          />
        )}

        <nav className="mobile-dock" aria-label="Primary navigation">
          <button
            type="button"
            className={`mobile-dock__item${viewMode === 'loans' ? ' mobile-dock__item--active' : ''}`}
            onClick={() => handleViewModeChange('loans')}
          >
            <FaWallet aria-hidden />
            <span>Portfolio</span>
          </button>
          <button
            type="button"
            className={`mobile-dock__item${viewMode === 'insights' ? ' mobile-dock__item--active' : ''}`}
            onClick={() => handleViewModeChange('insights')}
          >
            <FaChartPie aria-hidden />
            <span>Insights</span>
          </button>
          <button
            type="button"
            className={`mobile-dock__item${viewMode === 'trash' ? ' mobile-dock__item--active' : ''}`}
            onClick={() => handleViewModeChange('trash')}
          >
            <FaTrashAlt aria-hidden />
            <span>Archive</span>
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
