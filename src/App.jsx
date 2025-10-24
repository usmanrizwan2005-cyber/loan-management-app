import { useEffect, useMemo, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, onSnapshot, getDocs, writeBatch } from 'firebase/firestore';
import { Toaster } from 'react-hot-toast';
import {
  FaArrowRight,
  FaSignOutAlt,
  FaCog,
  FaChartPie,
  FaClock,
  FaPlus,
  FaTrashAlt,
  FaCalendarAlt,
  FaExclamationTriangle,
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
  const nextDueLoan = useMemo(() => {
    return (
      loans
        .map((loan) => {
          const due = toJSDate(loan.dueDate);
          const isSettled = loan.repaidAt || loan.status === 'paid';
          if (!due || isSettled) return null;
          return { loan, due };
        })
        .filter(Boolean)
        .sort((a, b) => a.due.getTime() - b.due.getTime())[0] || null
    );
  }, [loans]);
  const latestLoan = loans.length ? loans[0] : null;
  const userFirstName = useMemo(() => {
    if (!user) return '';
    if (user.displayName) {
      return user.displayName.split(' ')[0];
    }
    if (user.email) {
      return user.email.split('@')[0];
    }
    return '';
  }, [user]);

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
                <button type="button" className="button button--primary button--stretch" onClick={() => setScreen(SCREEN_DASHBOARD)}>
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
        <header className="dashboard-header">
          <div className="dashboard-header__intro">
            <span className="dashboard-header__badge">Loan Manager</span>
            <h1>
              {userFirstName ? `Welcome back, ${userFirstName}` : 'Portfolio overview'}
            </h1>
            <p>
              {activeLoansCount
                ? 'Monitor repayments and upcoming obligations in one place.'
                : 'Add your first loan to start tracking repayments and reminders.'}
            </p>
          </div>
          <div className="dashboard-header__actions">
            <button
              type="button"
              className="button button--primary"
              onClick={() => setShowLoanForm(true)}
            >
              <FaPlus aria-hidden />
              <span>New loan</span>
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

        <section className="dashboard-summary" aria-label="Portfolio summary">
          <article className="summary-card">
            <span className="summary-card__label">Outstanding balance</span>
            <strong className="summary-card__value">
              {formatCurrency(totals.remaining, defaultCurrency, currencyLocale)}
            </strong>
            <p className="summary-card__meta">
              {totals.total
                ? `${Math.max(0, 100 - repaymentProgress)}% of principal still open`
                : 'Awaiting your first loan'}
            </p>
          </article>
          <article className="summary-card">
            <span className="summary-card__label">Cash repaid</span>
            <strong className="summary-card__value">
              {formatCurrency(totals.paid, defaultCurrency, currencyLocale)}
            </strong>
            <p className="summary-card__meta">
              {totals.paid
                ? `Across ${activeLoansCount} active ${activeLoansCount === 1 ? 'loan' : 'loans'}`
                : 'No repayments captured yet'}
            </p>
          </article>
          <article className="summary-card">
            <span className="summary-card__label">Active loans</span>
            <strong className="summary-card__value">{activeLoansCount}</strong>
            <p className="summary-card__meta">
              {activeLoansCount
                ? `Avg ticket ${formatCurrency(averageLoanAmount, defaultCurrency, currencyLocale)}${latestLoan ? ` | Last added ${formatDate(latestLoan.createdAt)}` : ''}`
                : 'Create a new loan to get started'}
            </p>
          </article>
        </section>

        <main className="dashboard-content">
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
                <span>{formatCurrency(totals.paid, defaultCurrency, currencyLocale)} repaid</span>
                <span>{formatCurrency(totals.remaining, defaultCurrency, currencyLocale)} outstanding</span>
              </div>
            </div>

            <div className="insight-panel__metrics">
              <article className="metric-card metric-card--warning">
                <div className="metric-card__icon">
                  <FaExclamationTriangle aria-hidden />
                </div>
                <div>
                  <span className="metric-card__label">Late loans</span>
                  <strong className="metric-card__value">{lateCount}</strong>
                  <p>{lateCount ? 'Needs attention today' : 'All accounts on time'}</p>
                </div>
              </article>
              <article className="metric-card metric-card--info">
                <div className="metric-card__icon">
                  <FaClock aria-hidden />
                </div>
                <div>
                  <span className="metric-card__label">Due this week</span>
                  <strong className="metric-card__value">{dueSoonCount}</strong>
                  <p>{dueSoonCount ? 'Schedule follow-ups' : 'No upcoming deadlines'}</p>
                </div>
              </article>
              <article className="metric-card metric-card--neutral">
                <div className="metric-card__icon">
                  <FaCalendarAlt aria-hidden />
                </div>
                <div>
                  <span className="metric-card__label">Next due date</span>
                  <strong className="metric-card__value">
                    {nextDueLoan ? formatDate(nextDueLoan.due) : 'All caught up'}
                  </strong>
                  <p>
                    {nextDueLoan
                      ? `${nextDueLoan.loan.borrowerName || 'Borrower'} - ${formatCurrency(
                          nextDueLoan.loan.amount,
                          nextDueLoan.loan.currency || defaultCurrency,
                          currencyLocale
                        )}`
                      : 'No open balances pending'}
                  </p>
                </div>
              </article>
            </div>
          </section>

          <section className="panel create-panel">
            <div className="panel__header">
              <div className="panel__icon panel__icon--accent">
                <FaPlus aria-hidden />
              </div>
              <div>
                <span className="panel__eyebrow">Add record</span>
                <h2>Create a new loan</h2>
                <p>Capture borrower details, amounts, and upcoming repayments in a few taps.</p>
              </div>
            </div>

            <div className="panel__actions">
              <button
                type="button"
                className={`button ${showLoanForm ? 'button--ghost' : 'button--surface'} button--pill`}
                onClick={() => setShowLoanForm((previous) => !previous)}
              >
                {showLoanForm ? 'Close builder' : 'Open loan form'}
              </button>
            </div>

            {showLoanForm ? (
              <div className="create-panel__form">
                <LoanForm onClose={() => setShowLoanForm(false)} />
              </div>
            ) : (
              <ul className="panel__tips">
                <li>Store phone numbers with automatic country code detection.</li>
                <li>Track partial repayments and adjustments over time.</li>
                <li>Your workspace stays in sync instantly through Firebase.</li>
              </ul>
            )}
          </section>

          <section className="panel views-panel">
            <div className="views-panel__header">
              <div>
                <span className="panel__eyebrow">Workspace</span>
                <h2>{viewMode === 'loans' ? 'Active portfolio' : 'Trash bin'}</h2>
                <p>Switch between live records and archived items.</p>
              </div>
              <div className="views-panel__tabs" role="tablist" aria-label="Loan views">
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'loans'}
                  className={`tab-chip${viewMode === 'loans' ? ' tab-chip--active' : ''}`}
                  onClick={() => setViewMode('loans')}
                >
                  Portfolio
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === 'trash'}
                  className={`tab-chip${viewMode === 'trash' ? ' tab-chip--active' : ''}`}
                  onClick={() => setViewMode('trash')}
                >
                  Trash
                </button>
              </div>
            </div>
          </section>

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
            onClick={() => setViewMode('loans')}
          >
            <FaChartPie aria-hidden />
            <span>Portfolio</span>
          </button>
          <button
            type="button"
            className={`mobile-dock__item${showLoanForm ? ' mobile-dock__item--active' : ''}`}
            onClick={() => setShowLoanForm((previous) => !previous)}
          >
            <FaPlus aria-hidden />
            <span>{showLoanForm ? 'Close form' : 'New loan'}</span>
          </button>
          <button
            type="button"
            className={`mobile-dock__item${viewMode === 'trash' ? ' mobile-dock__item--active' : ''}`}
            onClick={() => setViewMode('trash')}
          >
            <FaTrashAlt aria-hidden />
            <span>Trash</span>
          </button>
          <button
            type="button"
            className="mobile-dock__item"
            onClick={() => setScreen(SCREEN_SETTINGS)}
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
