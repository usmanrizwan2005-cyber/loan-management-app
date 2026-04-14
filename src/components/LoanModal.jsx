import { useState, useEffect } from 'react';
import { doc, updateDoc, arrayUnion, deleteField } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';
import {
  formatDate,
  formatCurrency,
  formatDateInputValue,
  getLoanComputedState,
  getTodayDateValue,
  sumPaymentHistory,
} from '../utils/helpers';
import { currencies as seedCurrencies } from '../utils/currencies';
import { useCurrencies } from '../utils/useCurrencies';
import {
  phoneCountries as seedCountries,
  findCountryByDialPrefix,
  formatWithDialCode,
  validateInternationalPhone,
} from '../utils/phoneCountries';
import { usePhoneCountries } from '../utils/usePhoneCountries';
import CountrySelect from './CountrySelect.jsx';
import CurrencySelect from './CurrencySelect.jsx';
import { auth } from '../firebase';
import {
  FaArrowRight,
  FaCalendarAlt,
  FaCalendarCheck,
  FaCheckCircle,
  FaHistory,
  FaPhoneAlt,
  FaReceipt,
  FaWallet,
} from 'react-icons/fa';

function ModalChrome({ title, subtitle, badge, onClose, onBack, showBack, children }) {
  return (
    <div className="modal-shell" role="dialog" aria-modal="true" aria-labelledby="loan-modal-title">
      <button type="button" className="modal-shell__backdrop" aria-label="Close modal" onClick={onClose} />
      <section className="modal-shell__panel">
        <div className="modal-shell__handle" aria-hidden />
        <header className="modal-shell__header">
          <div className="modal-shell__header-actions">
            {showBack ? (
              <button type="button" onClick={onBack} className="button button--ghost button--compact">
                Back
              </button>
            ) : (
              <span className="modal-shell__spacer" aria-hidden />
            )}
            <button type="button" onClick={onClose} className="button button--ghost button--compact">
              Close
            </button>
          </div>
          <div className="modal-shell__header-copy">
            {badge && <span className="tag-pill">{badge}</span>}
            <h2 id="loan-modal-title" className="modal-shell__title">{title}</h2>
            {subtitle && <p className="modal-shell__subtitle">{subtitle}</p>}
          </div>
        </header>
        <div className="modal-shell__body">
          {children}
        </div>
      </section>
    </div>
  );
}

export default function LoanModal({ loan, viewType, onClose, initialPaymentType }) {
  const { currencies: allCurrencies } = useCurrencies();
  const { countries } = usePhoneCountries();
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [activeView, setActiveView] = useState(viewType || 'details');
  const [newDueDate, setNewDueDate] = useState('');
  const [formData, setFormData] = useState({
    borrowerName: '',
    phone: '',
    amount: '',
    currency: 'PKR',
    takenAt: '',
    dueDate: '',
  });
  const [isSubmittingExtend, setIsSubmittingExtend] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isSubmittingPaid, setIsSubmittingPaid] = useState(false);
  const [paidAt, setPaidAt] = useState(getTodayDateValue());
  const [paymentType, setPaymentType] = useState(initialPaymentType || 'full');
  const [partialAmount, setPartialAmount] = useState('');
  const [paidEditable, setPaidEditable] = useState('');
  const [remainingEditable, setRemainingEditable] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [editPhoneCountry, setEditPhoneCountry] = useState(null);
  const [editCountryFilter, setEditCountryFilter] = useState('');

  const { totalPaid, remaining, isEffectivelyPaid } = getLoanComputedState(loan || {});

  useEffect(() => {
    if (loan) {
      setFormData({
        borrowerName: loan.borrowerName || '',
        phone: loan.phone || '',
        amount: loan.amount || '',
        currency: loan.currency || 'PKR',
        takenAt: formatDateInputValue(loan.takenAt),
        dueDate: formatDateInputValue(loan.dueDate),
      });
      setPaidEditable(String(totalPaid || ''));
      setRemainingEditable(String(remaining || ''));
      const sourceCountries = countries?.length ? countries : seedCountries;
      const detected = loan.phone
        ? sourceCountries.find((country) =>
            (`+${country.dialCode}`) && String(loan.phone).replace(/\s+/g, '').startsWith(`+${country.dialCode}`)
          )
        : null;
      setEditPhoneCountry(detected);
    }
  }, [loan, totalPaid, remaining, countries]);

  useEffect(() => {
    if (initialPaymentType) {
      setPaymentType(initialPaymentType);
    }
  }, [initialPaymentType]);

  useEffect(() => {
    setActiveView(viewType || 'details');
  }, [viewType, loan?.id]);

  useEffect(() => {
    if (!loan) return;
    setNewDueDate('');
    setPartialAmount('');
    setPaidAt(getTodayDateValue());
    setPhoneError('');
  }, [loan?.id, activeView]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!loan) return null;

  const handleInputChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleUpdateLoan = async (event) => {
    event.preventDefault();
    if (isSubmittingEdit) return;

    const borrowerName = formData.borrowerName.trim();
    const phone = formData.phone.trim();
    const amountNum = parseFloat(formData.amount);

    if (!borrowerName || !formData.takenAt || !formData.dueDate) {
      toast.error('Please complete all required fields.');
      return;
    }

    if (Number.isNaN(amountNum) || amountNum <= 0) {
      toast.error('Amount must be greater than zero.');
      return;
    }

    if (formData.dueDate < formData.takenAt) {
      toast.error('Due date cannot be earlier than the taken date.');
      return;
    }

    if (phone) {
      const validation = validateInternationalPhone(editPhoneCountry, phone);
      if (!validation.ok) {
        setPhoneError(validation.reason || 'Invalid phone number');
        toast.error('Please enter a valid phone number.');
        return;
      }
    }

    const loanRef = doc(db, 'loans', loan.id);
    try {
      setIsSubmittingEdit(true);
      let paidNum = parseFloat(paidEditable);
      if (Number.isNaN(paidNum) || paidNum < 0) paidNum = 0;
      if (paidNum > amountNum) paidNum = amountNum;
      const remainingNum = Math.max(amountNum - paidNum, 0);

      const baseFields = {
        borrowerName,
        phone: phone || null,
        phoneCountry: editPhoneCountry?.code || null,
        amount: amountNum,
        currency: formData.currency,
        takenAt: formData.takenAt,
        dueDate: formData.dueDate,
      };

      const existing = Array.isArray(loan.paymentHistory) ? loan.paymentHistory : [];
      const historyWithoutAdjustments = existing.filter((entry) => entry?.type !== 'adjustment');
      const recordedPaid = sumPaymentHistory(historyWithoutAdjustments);
      const adjustmentAmount = Number((paidNum - recordedPaid).toFixed(2));
      const nextHistory =
        adjustmentAmount !== 0
          ? [
              ...historyWithoutAdjustments,
              {
                type: 'adjustment',
                amount: adjustmentAmount,
                paidAt: getTodayDateValue(),
                _id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
              },
            ]
          : historyWithoutAdjustments;

      const updateFields = {
        ...baseFields,
        paymentHistory: nextHistory,
      };

      if (remainingNum === 0) {
        const repaidDate = loan.repaidAt
          ? formatDateInputValue(loan.repaidAt) || getTodayDateValue()
          : getTodayDateValue();
        const wasPaidOnTime = !formData.dueDate || repaidDate <= formData.dueDate;
        updateFields.status = wasPaidOnTime ? 'on-time' : 'late';
        updateFields.repaidAt = repaidDate;
      } else {
        updateFields.status = 'pending';
        updateFields.repaidAt = deleteField();
      }

      await updateDoc(loanRef, updateFields);
      toast.success('Loan updated successfully.');
      onClose();
    } catch (error) {
      toast.error('Failed to update loan.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleExtendDueDate = async (event) => {
    event.preventDefault();
    if (isSubmittingExtend) return;
    if (!newDueDate) {
      toast.error('Please select a new due date.');
      return;
    }

    const currentDueDate = formatDateInputValue(loan.dueDate);
    if (currentDueDate && newDueDate <= currentDueDate) {
      toast.error('Choose a date later than the current due date.');
      return;
    }

    const loanRef = doc(db, 'loans', loan.id);
    try {
      setIsSubmittingExtend(true);
      const extensionLog = {
        extendedFrom: currentDueDate || loan.dueDate,
        extendedTo: newDueDate,
        extendedAt: new Date().toISOString(),
      };
      await updateDoc(loanRef, {
        originalDueDate: loan.originalDueDate || currentDueDate || loan.dueDate,
        dueDate: newDueDate,
        status: 'pending',
        extensionHistory: arrayUnion(extensionLog),
      });
      toast.success('Due date extended.');
      onClose();
    } catch (error) {
      toast.error('Failed to extend due date.');
    } finally {
      setIsSubmittingExtend(false);
    }
  };

  const handleMarkPaid = async (event) => {
    event.preventDefault();
    if (isSubmittingPaid) return;
    if (!paidAt) {
      toast.error('Please select a payment date.');
      return;
    }

    const loanRef = doc(db, 'loans', loan.id);
    try {
      setIsSubmittingPaid(true);
      const dueDateValue = formatDateInputValue(loan.dueDate);
      if (paymentType === 'full') {
        const wasPaidOnTime = !dueDateValue || paidAt <= dueDateValue;
        const finalStatus = wasPaidOnTime ? 'on-time' : 'late';
        const existing = Array.isArray(loan.paymentHistory) ? loan.paymentHistory : [];
        const nextHistory =
          remaining > 0
            ? [
                ...existing,
                {
                  amount: remaining,
                  paidAt,
                  type: 'full',
                  _id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                },
              ]
            : existing;
        await updateDoc(loanRef, {
          status: finalStatus,
          repaidAt: paidAt,
          paymentHistory: nextHistory,
        });
        toast.success(`Loan marked as paid (${finalStatus}).`);
      } else {
        const amountNum = parseFloat(partialAmount);
        if (!amountNum || amountNum <= 0) {
          setIsSubmittingPaid(false);
          toast.error('Enter a valid partial amount.');
          return;
        }
        if (amountNum > remaining) {
          setIsSubmittingPaid(false);
          toast.error('Partial amount exceeds remaining balance.');
          return;
        }
        const existing = Array.isArray(loan.paymentHistory) ? loan.paymentHistory : [];
        const newEntry = {
          amount: amountNum,
          paidAt,
          type: Math.abs(amountNum - remaining) < 1e-9 ? 'full' : 'partial',
          _id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        };
        const willSettleLoan = Math.abs(amountNum - remaining) < 1e-9;
        const extraFields = {};
        if (willSettleLoan) {
          const wasPaidOnTime = !dueDateValue || paidAt <= dueDateValue;
          extraFields.status = wasPaidOnTime ? 'on-time' : 'late';
          extraFields.repaidAt = paidAt;
        }
        await updateDoc(loanRef, {
          paymentHistory: [...existing, newEntry],
          ...extraFields,
        });
        toast.success(
          willSettleLoan ? `Loan marked as paid (${extraFields.status}).` : 'Partial payment recorded.'
        );
      }
      onClose();
    } catch (error) {
      toast.error('Failed to update payment.');
    } finally {
      setIsSubmittingPaid(false);
    }
  };

  const paymentHistory = Array.isArray(loan.paymentHistory)
    ? [...loan.paymentHistory]
        .filter((entry) => entry && ['partial', 'full', 'adjustment'].includes(entry.type))
        .sort((a, b) => {
          const ad = formatDateInputValue(a.paidAt);
          const bd = formatDateInputValue(b.paidAt);
          return bd.localeCompare(ad);
        })
    : [];

  const headerMeta = {
    details: {
      title: loan.borrowerName,
      subtitle: `${loan.currency} loan overview`,
      badge: 'Loan details',
    },
    extend: {
      title: 'Extend due date',
      subtitle: `Adjust when ${loan.borrowerName} needs to repay`,
      badge: 'Schedule',
    },
    edit: {
      title: 'Edit loan',
      subtitle: 'Update core information and balances',
      badge: 'Manage',
    },
    markPaid: {
      title: 'Record a payment',
      subtitle: `Log repayments for ${loan.borrowerName}`,
      badge: 'Payments',
    },
  };

  const amountValue = Number(loan.amount || 0);
  const repaymentPercent = amountValue > 0 ? Math.min(100, Math.round((totalPaid / amountValue) * 100)) : 0;
  const originalAmountLabel = formatCurrency(loan.amount, loan.currency);
  const paidLabel = formatCurrency(totalPaid, loan.currency);
  const remainingLabel = formatCurrency(remaining, loan.currency);

  const renderDetails = () => (
    <div className="loan-details">
      <section className="loan-details__hero">
        <div className="loan-details__hero-copy">
          <span className="loan-details__kicker">Balance overview</span>
          <strong>{remainingLabel}</strong>
          <p>{repaymentPercent}% repaid from {originalAmountLabel}</p>
        </div>
        <span className={`loan-details__status${isEffectivelyPaid ? ' loan-details__status--paid' : ''}`}>
          {isEffectivelyPaid ? <FaCheckCircle aria-hidden /> : <FaWallet aria-hidden />}
          {isEffectivelyPaid ? 'Settled' : 'Open balance'}
        </span>
        <div className="loan-details__hero-progress" aria-hidden>
          <span style={{ width: `${repaymentPercent}%` }} />
        </div>
      </section>

      <div className="loan-details__stats" aria-label="Loan balance summary">
        <article className="loan-details__stat loan-details__stat--total">
          <span className="loan-details__stat-icon"><FaReceipt aria-hidden /></span>
          <span>Original</span>
          <strong>{originalAmountLabel}</strong>
        </article>
        <article className="loan-details__stat loan-details__stat--paid">
          <span className="loan-details__stat-icon"><FaCheckCircle aria-hidden /></span>
          <span>Paid</span>
          <strong>{paidLabel}</strong>
        </article>
        <article className="loan-details__stat loan-details__stat--remaining">
          <span className="loan-details__stat-icon"><FaWallet aria-hidden /></span>
          <span>Remaining</span>
          <strong>{remainingLabel}</strong>
        </article>
      </div>

      <section className="loan-details__info-panel" aria-label="Loan timeline">
        <div className="loan-details__info-row">
          <span className="loan-details__info-icon"><FaReceipt aria-hidden /></span>
          <div>
            <span>Taken</span>
            <strong>{formatDate(loan.takenAt)}</strong>
          </div>
        </div>
        <div className="loan-details__info-row">
          <span className="loan-details__info-icon"><FaCalendarAlt aria-hidden /></span>
          <div>
            <span>Current due date</span>
            <strong>{formatDate(loan.dueDate)}</strong>
          </div>
        </div>
        {loan.originalDueDate && (
          <div className="loan-details__info-row">
            <span className="loan-details__info-icon"><FaHistory aria-hidden /></span>
            <div>
              <span>Original due date</span>
              <strong>{formatDate(loan.originalDueDate)}</strong>
            </div>
          </div>
        )}
        {loan.repaidAt && (
          <div className="loan-details__info-row loan-details__info-row--success">
            <span className="loan-details__info-icon"><FaCalendarCheck aria-hidden /></span>
            <div>
              <span>Paid in full</span>
              <strong>{formatDate(loan.repaidAt)}</strong>
            </div>
          </div>
        )}
        {loan.phone && (
          <div className="loan-details__info-row">
            <span className="loan-details__info-icon"><FaPhoneAlt aria-hidden /></span>
            <div>
              <span>Phone</span>
              <strong>{loan.phone}</strong>
            </div>
          </div>
        )}
      </section>

      {loan.extensionHistory?.length > 0 && (
        <section className="loan-details__history">
          <h3><FaHistory aria-hidden /> Extension history</h3>
          <ul>
            {loan.extensionHistory.map((extension, index) => (
              <li key={`${extension.extendedAt?.seconds || index}-${index}`}>
                <span>{formatDate(extension.extendedFrom)}</span>
                <FaArrowRight aria-hidden />
                <strong>{formatDate(extension.extendedTo)}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      {paymentHistory.length > 0 && (
        <section className="loan-details__history loan-details__history--payments">
          <h3><FaHistory aria-hidden /> Payment history</h3>
          <ul>
            {paymentHistory.map((entry, index) => (
              <li key={entry._id || `partial-${index}`}>
                <div>
                  <span>{formatDate(entry.paidAt)}</span>
                  <small>
                    {entry.type === 'adjustment'
                      ? 'Balance adjustment'
                      : entry.type === 'full'
                      ? 'Final payment'
                      : 'Partial payment'}
                  </small>
                </div>
                <strong>{formatCurrency(entry.amount, loan.currency)}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="loan-modal__quick-actions loan-modal__quick-actions--premium">
        {!isEffectivelyPaid && remaining > 0 && (
          <button type="button" className="button button--success button--stretch" onClick={() => setActiveView('markPaid')}>
            Record payment
          </button>
        )}
        {!isEffectivelyPaid && (
          <button type="button" className="button button--surface button--stretch" onClick={() => setActiveView('extend')}>
            Extend due date
          </button>
        )}
        <button type="button" className="button button--surface button--stretch" onClick={() => setActiveView('edit')}>
          Edit loan
        </button>
      </div>
    </div>
  );

  const renderExtend = () => (
    <form onSubmit={handleExtendDueDate} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--color-heading)]">New due date</label>
        <input
          type="date"
          value={newDueDate}
          onChange={(event) => setNewDueDate(event.target.value)}
          className="input"
          required
        />
      </div>
      <p className="text-sm text-[var(--color-muted)]">
        We will keep a running history so you can always see the original agreement.
      </p>
      <button type="submit" disabled={isSubmittingExtend} className="button button--primary button--stretch">
        {isSubmittingExtend ? 'Saving...' : 'Save new date'}
      </button>
    </form>
  );

  const renderEdit = () => (
    <form onSubmit={handleUpdateLoan} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-[var(--color-heading)]">Borrower name</span>
          <input
            type="text"
            name="borrowerName"
            value={formData.borrowerName}
            onChange={handleInputChange}
            className="input"
            required
          />
        </label>
        <div className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-[var(--color-heading)]">Currency</span>
          <CurrencySelect
            currencies={allCurrencies?.length ? allCurrencies : seedCurrencies}
            valueCode={formData.currency}
            filter={currencyFilter}
            onFilterChange={setCurrencyFilter}
            onChange={(selected) => setFormData({ ...formData, currency: selected.code })}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-[var(--color-heading)]">Amount</span>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            inputMode="decimal"
            step="any"
            min={0}
            onKeyDown={(event) => {
              if (['-', '+', 'e', 'E'].includes(event.key)) event.preventDefault();
            }}
            onChange={(event) => {
              handleInputChange(event);
              const value = parseFloat(event.target.value || '0');
              const paid = parseFloat(paidEditable || '0');
              const nextRemaining = Math.max(value - (Number.isNaN(paid) ? 0 : paid), 0);
              setRemainingEditable(String(nextRemaining));
            }}
            className="input"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-[var(--color-heading)]">Paid so far ({formData.currency})</span>
          <input
            type="number"
            step="any"
            min={0}
            value={paidEditable}
            onChange={(event) => {
              const value = event.target.value;
              setPaidEditable(value);
              const amountNum = parseFloat(formData.amount || '0');
              const paidNum = parseFloat(value || '0');
              const remainingNum = Math.max(amountNum - (Number.isNaN(paidNum) ? 0 : paidNum), 0);
              setRemainingEditable(String(remainingNum));
            }}
            className="input"
          />
        </label>
      </div>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-[var(--color-heading)]">Remaining ({formData.currency})</span>
        <input
          type="number"
          step="any"
          min={0}
          value={remainingEditable}
          onChange={(event) => {
            const value = event.target.value;
            setRemainingEditable(value);
            const amountNum = parseFloat(formData.amount || '0');
            const remainingNum = parseFloat(value || '0');
            const paidNum = Math.max(amountNum - (Number.isNaN(remainingNum) ? 0 : remainingNum), 0);
            setPaidEditable(String(paidNum));
          }}
          className="input"
        />
      </label>

      <div className="space-y-2 text-sm">
        <span className="font-medium text-[var(--color-heading)]">Phone number</span>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,220px),1fr]">
          <CountrySelect
            countries={countries?.length ? countries : seedCountries}
            value={editPhoneCountry}
            filter={editCountryFilter}
            onFilterChange={setEditCountryFilter}
            onChange={(country) => {
              setEditPhoneCountry(country);
              const uid = auth.currentUser?.uid;
              if (uid) {
                localStorage.setItem(`defaultPhoneCountry:${uid}`, country.code);
              } else {
                localStorage.setItem('defaultPhoneCountry', country.code);
              }
            }}
          />
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={(event) => {
              const value = event.target.value;
              const detected = findCountryByDialPrefix(value);
              if (detected && detected.code !== (editPhoneCountry?.code || '')) {
                setEditPhoneCountry(detected);
              }
              const formatted = formatWithDialCode(detected || editPhoneCountry, value);
              setFormData({ ...formData, phone: formatted });
              const result = validateInternationalPhone(detected || editPhoneCountry, formatted);
              setPhoneError(result.ok ? '' : result.reason || 'Invalid phone number');
            }}
            placeholder={`+${editPhoneCountry?.dialCode || ''} 3xxxxxxxxx`}
            className={`input ${phoneError ? '!border-[var(--color-error)] focus:!border-[var(--color-error)]' : ''}`}
          />
        </div>
        {phoneError && <p className="text-sm text-[var(--color-error)]">{phoneError}</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-[var(--color-heading)]">Taken on</span>
          <input
            type="date"
            name="takenAt"
            value={formData.takenAt}
            onChange={handleInputChange}
            className="input"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-[var(--color-heading)]">Due on</span>
          <input
            type="date"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleInputChange}
            className="input"
            required
          />
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button type="submit" disabled={isSubmittingEdit} className="button button--primary button--stretch">
          {isSubmittingEdit ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </form>
  );

  const renderMarkPaid = () => (
    <form onSubmit={handleMarkPaid} className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="chip chip--success">Paid: {formatCurrency(totalPaid, loan.currency)}</span>
        <span className="chip chip--warning">Remaining: {formatCurrency(remaining, loan.currency)}</span>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-[var(--color-heading)]">Payment date</span>
          <input
            type="date"
            value={paidAt}
            onChange={(event) => setPaidAt(event.target.value)}
            className="input"
            required
          />
        </label>
        <div className="flex flex-col gap-3 text-sm">
          <span className="font-medium text-[var(--color-heading)]">Payment type</span>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2">
              <input
                type="radio"
                name="paymentType"
                value="full"
                checked={paymentType === 'full'}
                onChange={() => setPaymentType('full')}
              />
              Full amount
            </label>
            <label className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2">
              <input
                type="radio"
                name="paymentType"
                value="partial"
                checked={paymentType === 'partial'}
                onChange={() => setPaymentType('partial')}
              />
              Partial amount
            </label>
          </div>
        </div>
      </div>

      {paymentType === 'partial' && (
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-[var(--color-heading)]">Partial amount ({loan.currency})</span>
          <input
            type="number"
            step="any"
            min={0}
            value={partialAmount}
            onChange={(event) => setPartialAmount(event.target.value)}
            className="input"
            placeholder="Enter amount"
          />
        </label>
      )}

      <button type="submit" disabled={isSubmittingPaid} className="button button--success button--stretch">
        {isSubmittingPaid ? 'Saving...' : 'Save payment'}
      </button>
    </form>
  );

  const contentMap = {
    details: renderDetails(),
    extend: renderExtend(),
    edit: renderEdit(),
    markPaid: renderMarkPaid(),
  };

  const { title, subtitle, badge } = headerMeta[activeView] || headerMeta.details;

  return (
    <ModalChrome
      title={title}
      subtitle={subtitle}
      badge={badge}
      onClose={onClose}
      onBack={activeView === 'details' ? undefined : () => setActiveView('details')}
      showBack={activeView !== 'details'}
    >
      {contentMap[activeView]}
    </ModalChrome>
  );
}
