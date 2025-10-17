import { useEffect, useMemo, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, onSnapshot, getDocs, writeBatch } from 'firebase/firestore';
import { Toaster } from 'react-hot-toast';
import {
  FaArrowRight,
  FaSignOutAlt,
  FaCog,
  FaChartPie,
  FaCheckCircle,
  FaClock,
  FaPlus,
} from 'react-icons/fa';
import { auth, db } from './firebase';
import { toJSDate, formatCurrency } from './utils/helpers';
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
        <button type="button" className="btn btn-muted" onClick={onBack}>
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
              <button type="button" className="btn btn-outline" onClick={onToggleDark}>
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

        <div className="settings-card">
          <header className="settings-card__header">
            <span className="settings-card__eyebrow">Defaults</span>
            <h2>Loan preferences</h2>
            <p>Set values we’ll reuse every time you create or review loans.</p>
          </header>

          <div className="settings-card__content settings-card__grid">
            <label className="settings-field">
              <span>Items per page</span>
              <input
                type="number"
                min={5}
                max={100}
                value={itemsPerPage}
                onChange={(event) => onItemsPerPageChange(Number(event.target.value) || 10)}
                className="input"
              />
            </label>

            <label className="settings-field">
              <span>Preferred currency</span>
              <select value={defaultCurrency} onChange={(event) => onCurrencyChange(event.target.value)} className="input">
                {currencyOptions
                  .map((code) => currencies.find((currency) => currency.code === code))
                  .filter(Boolean)
                  .map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="settings-field">
              <span>Number format</span>
              <select value={currencyLocale} onChange={(event) => onLocaleChange(event.target.value)} className="input">
                {LOCALE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
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

  useEffect(() => {
    if (user) {
      setScreen(SCREEN_WELCOME);
      setShowLoanForm(false);
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

  const handleLogout = () => {
    auth.signOut();
    setScreen(SCREEN_WELCOME);
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
          <article className="welcome-card">
            <p className="welcome-eyebrow">Stay on top of every promise</p>
            <h1>Loan Manager</h1>
            <p className="welcome-lede">
              A calm, responsive workspace for tracking balances, celebrating repayments, and keeping lending relationships
              transparent.
            </p>
            <ul className="welcome-highlights">
              <li>Real-time sync via Firebase</li>
              <li>Multi-currency tracking</li>
            </ul>
            <button type="button" className="welcome-continue" onClick={() => setScreen(SCREEN_DASHBOARD)}>
              Continue
              <FaArrowRight aria-hidden />
            </button>
            <p className="welcome-user-info">Signed in as {user.email}</p>
          </article>
          <button type="button" className="welcome-signout" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </>
    );
  }

  if (screen === SCREEN_SETTINGS) {
    return (
      <>
        <Toaster position="top-center" />
        <SettingsScreen
          onBack={() => setScreen(SCREEN_DASHBOARD)}
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
        {/* Loan Summary Card */}
        <section className="loan-summary-card">
          <span className="card-eyebrow">Loan Amount</span>
          <div className="loan-amount">
            {formatCurrency(totals.total, defaultCurrency, currencyLocale)}
          </div>
          <div className="loan-breakdown">
            <div className="breakdown-item">
              <span className="breakdown-label">Total Repaid</span>
              <span className="breakdown-value repaid">{formatCurrency(totals.paid, defaultCurrency, currencyLocale)}</span>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">Balance Remaining</span>
              <span className="breakdown-value remaining">{formatCurrency(totals.remaining, defaultCurrency, currencyLocale)}</span>
            </div>
          </div>
        </section>

        {/* Create Entry Card */}
        <section className="create-entry-card">
          <span className="card-eyebrow">Create Entry</span>
          <h2>Add a new loan</h2>
          <p>
            Capture who borrowed, how much they owe, and when repayment is expected. We will keep everything synced across devices.
          </p>
          <button
            type="button"
            className="add-loan-button"
            onClick={() => setShowLoanForm(!showLoanForm)}
          >
            {showLoanForm ? 'Hide Form' : 'Add loan'}
          </button>
          
          {/* Loan Form - appears inside the same card */}
          {showLoanForm && <LoanForm onClose={() => setShowLoanForm(false)} />}
        </section>

        {/* Your Loans Card */}
        <section className="loans-navigation-card">
          <h2>Your loans</h2>
          <p>
            Filter by status, search by name or number, and open any record for deeper detail.
          </p>
        </section>

        {viewMode === 'loans' ? (
          <LoanList loans={loans} itemsPerPage={itemsPerPage} />
        ) : (
          <Trash />
        )}

        {/* Fixed Floating Navigation Bar */}
        <div className="floating-nav-bar">
          <button
            type="button"
            className={`nav-item nav-item--portfolio${viewMode === 'loans' ? ' nav-item--active' : ''}`}
            onClick={() => setViewMode('loans')}
          >
            Portfolio
          </button>
          <button
            type="button"
            className="nav-item nav-item--trash"
            onClick={() => setViewMode('trash')}
          >
            Trash
          </button>
          <button
            type="button"
            className="nav-item nav-item--settings"
            onClick={() => setScreen(SCREEN_SETTINGS)}
          >
            <FaCog aria-hidden />
            Settings
          </button>
        </div>
      </div>
    </>
  );
}

export default App;
