import { useState, useEffect } from 'react';
import { doc, updateDoc, arrayUnion, deleteField } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';
import { formatDate, formatCurrency, calculateLoanPaymentState } from '../utils/helpers';
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
import { FaCalendarAlt, FaCalendarCheck, FaReceipt, FaHistory, FaPhoneAlt } from 'react-icons/fa';

function ModalChrome({ title, subtitle, badge, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-[var(--color-surface)] shadow-2xl sm:max-w-3xl max-w-full mx-2">
        <header className="relative bg-gradient-to-br from-[var(--color-primary)]/12 via-transparent to-transparent px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              {badge && <span className="tag-pill text-xs">{badge}</span>}
              <h2 className="text-2xl font-semibold text-[var(--color-heading)]">{title}</h2>
              {subtitle && <p className="text-sm text-[var(--color-muted)]">{subtitle}</p>}
            </div>
            <button type="button" onClick={onClose} className="button button--ghost button--compact">Close</button>
          </div>
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-4 py-4 sm:px-8 sm:py-8 space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function LoanModal({ loan, viewType, onClose, initialPaymentType }) {
  const { currencies: allCurrencies } = useCurrencies();
  const { countries } = usePhoneCountries();
  const [currencyFilter, setCurrencyFilter] = useState('');
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
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState(initialPaymentType || 'full');
  const [partialAmount, setPartialAmount] = useState('');
  const [paidEditable, setPaidEditable] = useState('');
  const [remainingEditable, setRemainingEditable] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [editPhoneCountry, setEditPhoneCountry] = useState(null);
  const [editCountryFilter, setEditCountryFilter] = useState('');

  const { totalPaid, remaining } = calculateLoanPaymentState(loan || {});

  useEffect(() => {
    if (loan) {
      setFormData({
        borrowerName: loan.borrowerName || '',
        phone: loan.phone || '',
        amount: loan.amount || '',
        currency: loan.currency || 'PKR',
        takenAt: loan.takenAt
          ? (loan.takenAt.toDate ? loan.takenAt.toDate() : new Date(loan.takenAt)).toISOString().split('T')[0]
          : '',
        dueDate: loan.dueDate
          ? (loan.dueDate.toDate ? loan.dueDate.toDate() : new Date(loan.dueDate)).toISOString().split('T')[0]
          : '',
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

  if (!loan) return null;

  const handleInputChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleUpdateLoan = async (event) => {
    event.preventDefault();
    if (isSubmittingEdit) return;
    const loanRef = doc(db, 'loans', loan.id);
    try {
      setIsSubmittingEdit(true);
      const amountNum = parseFloat(formData.amount);
      let paidNum = parseFloat(paidEditable);
      if (Number.isNaN(paidNum) || paidNum < 0) paidNum = 0;
      if (paidNum > amountNum) paidNum = amountNum;
      const remainingNum = Math.max(amountNum - paidNum, 0);

      const baseFields = {
        borrowerName: formData.borrowerName,
        phone: formData.phone || null,
        phoneCountry: editPhoneCountry?.code || null,
        amount: amountNum,
        currency: formData.currency,
        takenAt: new Date(formData.takenAt),
        dueDate: new Date(formData.dueDate),
      };

      const updateFields = { ...baseFields };

      if (remainingNum === 0) {
        const repaidDate = loan.repaidAt
          ? loan.repaidAt.toDate
            ? loan.repaidAt.toDate()
            : new Date(loan.repaidAt)
          : new Date();
        const wasPaidOnTime = repaidDate <= new Date(formData.dueDate);
        updateFields.status = wasPaidOnTime ? 'on-time' : 'late';
        updateFields.repaidAt = repaidDate;
        const existing = Array.isArray(loan.paymentHistory) ? loan.paymentHistory : [];
        updateFields.paymentHistory = [
          ...existing.filter((entry) => entry?.type !== 'adjustment'),
          {
            type: 'adjustment',
            amount: paidNum,
            paidAt: repaidDate,
            _id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          },
        ];
      } else if (paidNum > 0) {
        updateFields.status = 'pending';
        updateFields.repaidAt = deleteField();
        const existing = Array.isArray(loan.paymentHistory) ? loan.paymentHistory : [];
        updateFields.paymentHistory = [
          ...existing.filter((entry) => entry?.type !== 'adjustment'),
          {
            type: 'adjustment',
            amount: paidNum,
            paidAt: new Date(),
            _id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          },
        ];
      } else {
        updateFields.status = 'pending';
        updateFields.repaidAt = deleteField();
        updateFields.paymentHistory = [];
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

    const loanRef = doc(db, 'loans', loan.id);
    try {
      setIsSubmittingExtend(true);
      const extensionLog = {
        extendedFrom: loan.dueDate,
        extendedTo: new Date(newDueDate),
        extendedAt: new Date(),
      };
      await updateDoc(loanRef, {
        originalDueDate: loan.originalDueDate || loan.dueDate,
        dueDate: new Date(newDueDate),
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
    const loanRef = doc(db, 'loans', loan.id);
    try {
      setIsSubmittingPaid(true);
      if (paymentType === 'full') {
        const wasPaidOnTime = new Date(paidAt) <= (loan.dueDate?.toDate ? loan.dueDate.toDate() : new Date(loan.dueDate));
        const finalStatus = wasPaidOnTime ? 'on-time' : 'late';
        await updateDoc(loanRef, { status: finalStatus, repaidAt: new Date(paidAt) });
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
          paidAt: new Date(paidAt),
          type: 'partial',
          _id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        };
        const willSettleLoan = Math.abs(amountNum - remaining) < 1e-9;
        const extraFields = {};
        if (willSettleLoan) {
          const wasPaidOnTime = new Date(paidAt) <= (loan.dueDate?.toDate ? loan.dueDate.toDate() : new Date(loan.dueDate));
          extraFields.status = wasPaidOnTime ? 'on-time' : 'late';
          extraFields.repaidAt = new Date(paidAt);
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
        .filter((entry) => entry && entry.type === 'partial')
        .sort((a, b) => {
          const ad = a.paidAt?.toDate ? a.paidAt.toDate() : new Date(a.paidAt);
          const bd = b.paidAt?.toDate ? b.paidAt.toDate() : new Date(b.paidAt);
          return bd - ad;
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

  const renderDetails = () => (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-[var(--color-surface-alt)]/80 p-5 shadow-inner">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">Original amount</p>
          <p className="mt-2 text-xl font-semibold text-[var(--color-heading)]">
            {formatCurrency(loan.amount, loan.currency)}
          </p>
        </div>
        <div className="rounded-2xl bg-[var(--color-surface-alt)]/80 p-5 shadow-inner">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">Paid</p>
          <p className="mt-2 text-xl font-semibold text-green-600 dark:text-green-400">
            {formatCurrency(totalPaid, loan.currency)}
          </p>
        </div>
        <div className="rounded-2xl bg-[var(--color-surface-alt)]/80 p-5 shadow-inner">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">Remaining</p>
          <p className="mt-2 text-xl font-semibold text-amber-600 dark:text-amber-300">
            {formatCurrency(remaining, loan.currency)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 text-sm text-[var(--color-muted)] sm:grid-cols-2">
        <div className="flex items-center gap-3">
          <FaReceipt className="text-[var(--color-primary)]" />
          <span>
            <strong className="text-[var(--color-heading)]">Taken:</strong> {formatDate(loan.takenAt)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <FaCalendarAlt className="text-[var(--color-primary)]" />
          <span>
            <strong className="text-[var(--color-heading)]">Current due date:</strong> {formatDate(loan.dueDate)}
          </span>
        </div>
        {loan.originalDueDate && (
          <div className="flex items-center gap-3">
            <FaCalendarAlt className="text-[var(--color-muted)]" />
            <span>
              <strong className="text-[var(--color-heading)]">Original due date:</strong> {formatDate(loan.originalDueDate)}
            </span>
          </div>
        )}
        {loan.repaidAt && (
          <div className="flex items-center gap-3">
            <FaCalendarCheck className="text-green-500" />
            <span>
              <strong className="text-[var(--color-heading)]">Paid in full:</strong> {formatDate(loan.repaidAt)}
            </span>
          </div>
        )}
        {loan.phone && (
          <div className="flex items-center gap-3">
            <FaPhoneAlt className="text-[var(--color-primary)]" />
            <span>{loan.phone}</span>
          </div>
        )}
      </div>

      {loan.extensionHistory?.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/60 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-heading)]">
            <FaHistory /> Extension history
          </h3>
          <ul className="space-y-2 text-sm text-[var(--color-muted)]">
            {loan.extensionHistory.map((extension, index) => (
              <li key={`${extension.extendedAt?.seconds || index}-${index}`}>
                {formatDate(extension.extendedFrom)} {'->'} {formatDate(extension.extendedTo)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {paymentHistory.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/60 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-heading)]">
            <FaHistory /> Payment history
          </h3>
          <ul className="space-y-2 text-sm text-[var(--color-muted)]">
            {paymentHistory.map((entry, index) => (
              <li key={entry._id || `partial-${index}`} className="flex items-center justify-between gap-4">
                <span>{formatDate(entry.paidAt)}</span>
                <span className="font-medium text-[var(--color-heading)]">
                  {formatCurrency(entry.amount, loan.currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
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
        <span className="chip chip-success">Paid: {formatCurrency(totalPaid, loan.currency)}</span>
        <span className="chip chip-warning">Remaining: {formatCurrency(remaining, loan.currency)}</span>
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
          <div className="flex items-center gap-3">
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

  const { title, subtitle, badge } = headerMeta[viewType] || headerMeta.details;

  return (
    <ModalChrome title={title} subtitle={subtitle} badge={badge} onClose={onClose}>
      {contentMap[viewType]}
    </ModalChrome>
  );
}

