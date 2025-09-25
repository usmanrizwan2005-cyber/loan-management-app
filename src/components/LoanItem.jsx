import { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';
import { formatDate, formatCurrency, calculateLoanPaymentState } from '../utils/helpers';
import {
  FaEdit,
  FaTrashAlt,
  FaCalendarAlt,
  FaCalendarCheck,
  FaReceipt,
  FaPhoneAlt,
  FaClock,
} from 'react-icons/fa';

export default function LoanItem({
  loan,
  onDetailsClick,
  onExtendClick,
  onEditClick,
  onMarkPaidClick,
  onQuickPartial,
}) {
  if (!loan) return null;

  const [isProcessingTrash, setIsProcessingTrash] = useState(false);

  const getDateOnly = (dateValue) => {
    const js = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue);
    return new Date(js.getFullYear(), js.getMonth(), js.getDate());
  };

  const today = (() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  })();

  const dueDateOnly = getDateOnly(loan.dueDate);
  const inferredLate = dueDateOnly < today;

  const {
    totalPaid,
    remaining,
    isEffectivelyPaid,
    effectivePaidAt,
    onTimeVsLate,
  } = calculateLoanPaymentState(loan);

  const isOverdueLate = !isEffectivelyPaid && (loan.status === 'late' || inferredLate);

  const moveToTrash = async () => {
    if (isProcessingTrash) return;
    if (!window.confirm('Are you sure you want to move this loan to the trash?')) return;
    const loanRef = doc(db, 'loans', loan.id);
    try {
      setIsProcessingTrash(true);
      await updateDoc(loanRef, { deletedAt: serverTimestamp() });
      toast.success('Loan moved to trash.');
    } catch (error) {
      toast.error('Failed to move loan to trash.');
    } finally {
      setIsProcessingTrash(false);
    }
  };

  const statusLabel = (() => {
    if (isEffectivelyPaid) {
      return onTimeVsLate ? onTimeVsLate.replace('-', ' ') : 'Paid';
    }
    if (loan.status === 'pending' && inferredLate) return 'Late';
    return loan.status.replace('-', ' ');
  })();

  const progressPercent = Math.min(
    100,
    Math.round(((totalPaid || 0) / (loan.amount || 1)) * 100)
  );

  return (
    <li
      className={`surface overflow-hidden transition-transform duration-300 hover:-translate-y-1 ${
        isOverdueLate ? 'border-[var(--color-error)]/40 shadow-[0_25px_40px_rgba(220,38,38,0.12)]' : ''
      }`}
    >
      <div className="space-y-6 p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-4 sm:items-start">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-lg font-semibold text-white shadow-lg">
              {loan.borrowerName?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-xl font-semibold text-[var(--color-heading)]">{loan.borrowerName}</h3>
              <p className="text-sm text-[var(--color-muted)]">{loan.currency}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 md:justify-end">
            {!isEffectivelyPaid ? (
              <span className={`chip ${isOverdueLate ? 'chip-error' : 'chip-subtle'}`}>{statusLabel}</span>
            ) : (
              <>
                <span className="chip chip-success">Paid</span>
                {onTimeVsLate && (
                  <span className="chip chip-muted">{onTimeVsLate.replace('-', ' ')}</span>
                )}
              </>
            )}
            {isOverdueLate && <span className="chip chip-error uppercase">Overdue</span>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-[var(--color-surface-alt)]/70 p-4 shadow-inner text-center sm:text-left">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">Original amount</p>
            <p className="mt-2 text-lg font-semibold text-[var(--color-heading)]">
              {formatCurrency(loan.amount, loan.currency)}
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--color-surface-alt)]/70 p-4 shadow-inner text-center sm:text-left">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">Paid</p>
            <p className="mt-2 text-lg font-semibold text-green-600 dark:text-green-400">
              {formatCurrency(totalPaid, loan.currency)}
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--color-surface-alt)]/70 p-4 shadow-inner text-center sm:text-left">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">Remaining</p>
            <p className={`mt-2 text-lg font-semibold ${isOverdueLate ? 'text-red-600' : 'text-amber-600'}`}>
              {formatCurrency(remaining, loan.currency)}
            </p>
          </div>
        </div>

        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/40">
            <div
              className={`h-full rounded-full ${isEffectivelyPaid ? 'bg-[var(--color-success)]' : 'bg-[var(--color-primary)]'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-[var(--color-muted)]">
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
        </div>

        <div className="grid gap-3 text-sm text-[var(--color-muted)] sm:grid-cols-2">
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <FaReceipt className="text-[var(--color-primary)]" />
            <span>
              <strong className="text-[var(--color-heading)]">Taken:</strong> {formatDate(loan.takenAt)}
            </span>
          </div>
          <div className={`flex items-center justify-center gap-2 sm:justify-start ${isOverdueLate ? 'text-[var(--color-error)]' : ''}`}>
            <FaCalendarAlt className={isOverdueLate ? 'text-[var(--color-error)]' : 'text-[var(--color-primary)]'} />
            <span>
              <strong className="text-[var(--color-heading)]">Due:</strong> {formatDate(loan.dueDate)}
            </span>
          </div>
          {loan.phone && (
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <FaPhoneAlt className="text-[var(--color-primary)]" />
              <span>{loan.phone}</span>
            </div>
          )}
          {isEffectivelyPaid && effectivePaidAt && (
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <FaCalendarCheck className="text-green-500" />
              <span>
                <strong className="text-[var(--color-heading)]">Repaid:</strong> {formatDate(effectivePaidAt)}
              </span>
            </div>
          )}
          {!isEffectivelyPaid && inferredLate && (
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <FaClock className="text-[var(--color-error)]" />
              <span>Past due date</span>
            </div>
          )}
        </div>
      </div>

      <footer className="flex flex-col gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <button onClick={() => onDetailsClick(loan)} className="btn btn-outline px-4 py-2 w-full sm:w-auto">
            Details
          </button>
          {!isEffectivelyPaid && remaining > 0 && (
            <>
              <button onClick={() => onExtendClick(loan)} className="btn btn-surface px-4 py-2 w-full sm:w-auto">
                Extend due date
              </button>
              <button onClick={() => onQuickPartial(loan)} className="btn btn-accent px-4 py-2 w-full sm:w-auto">
                Log partial payment
              </button>
              <button onClick={() => onMarkPaidClick(loan)} className="btn btn-success px-4 py-2 w-full sm:w-auto">
                Mark as paid
              </button>
            </>
          )}
        </div>
        <div className="flex w-full items-center justify-end gap-2">
          <button
            onClick={() => onEditClick(loan)}
            className="btn btn-ghost px-3 py-2 text-[var(--color-muted)] hover:text-[var(--color-primary)]"
            title="Edit loan"
          >
            <FaEdit />
          </button>
          <button
            onClick={moveToTrash}
            disabled={isProcessingTrash}
            className={`btn btn-ghost px-3 py-2 ${
              isProcessingTrash ? 'cursor-not-allowed text-[var(--color-muted)]' : 'text-red-500 hover:text-red-600'
            }`}
            title="Move to trash"
          >
            <FaTrashAlt />
          </button>
        </div>
      </footer>
    </li>
  );
}


