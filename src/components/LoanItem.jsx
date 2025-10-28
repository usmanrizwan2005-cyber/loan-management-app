import { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';
import { formatDate, formatCurrency, calculateLoanPaymentState } from '../utils/helpers';
import {
  FaEdit,
  FaTrashAlt,
} from 'react-icons/fa';

export default function LoanItem({
  loan,
  onDetailsClick,
  onExtendClick,
  onEditClick,
  onMarkPaidClick,
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

  const amountValue = Number(loan.amount || 0);
  const amountLabel = formatCurrency(loan.amount, loan.currency);
  const remainingLabel = formatCurrency(remaining, loan.currency);
  const repaymentPercent = amountValue > 0 ? Math.min(100, Math.round((totalPaid / amountValue) * 100)) : 0;
  const daysUntilDue = Math.ceil((dueDateOnly - today) / (1000 * 60 * 60 * 24));
  const dueDateLabel = formatDate(loan.dueDate);

  let timelineDescriptor;
  if (isEffectivelyPaid) {
    timelineDescriptor = effectivePaidAt ? `Settled on ${formatDate(effectivePaidAt)}` : 'Marked as paid';
  } else if (isOverdueLate) {
    const daysOverdue = Math.abs(Math.min(daysUntilDue, 0));
    timelineDescriptor = daysOverdue ? `${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue` : 'Overdue';
  } else if (daysUntilDue === 0) {
    timelineDescriptor = 'Due today';
  } else if (daysUntilDue === 1) {
    timelineDescriptor = 'Due tomorrow';
  } else {
    timelineDescriptor = `Due in ${daysUntilDue} days`;
  }

  return (
    <li className="loan-card">
      <header className="loan-card__header">
        <div className="loan-card__identity">
          <div className="loan-card__avatar">{loan.borrowerName?.[0]?.toUpperCase() || '?'}</div>
          <div>
            <h3 className="loan-card__name">{loan.borrowerName}</h3>
            <p className="loan-card__subtitle">Taken {formatDate(loan.takenAt)}</p>
          </div>
        </div>
        <span
          className={`loan-card__badge ${
            isOverdueLate
              ? 'loan-card__badge--late'
              : isEffectivelyPaid
              ? 'loan-card__badge--paid'
              : 'loan-card__badge--pending'
          }`}
        >
          {isOverdueLate ? 'Late' : statusLabel}
        </span>
      </header>

      <div className="loan-card__body">
        <div className="loan-card__amount">
          <span>Amount</span>
          <strong>{amountLabel}</strong>
        </div>

        {/* Removed Paid/Remaining stat boxes from front of loans */}

        <div className="loan-card__timeline">
          <span className="loan-card__timeline-label">{timelineDescriptor}</span>
          <span className="loan-card__timeline-date">Due {dueDateLabel}</span>
        </div>

        <div className="loan-card__progress">
          <div className="progress-track">
            <div
              className={`progress-bar${isEffectivelyPaid ? ' progress-bar--success' : ''}`}
              style={{ width: `${repaymentPercent}%` }}
            />
          </div>
          <div className="loan-card__progress-meta">
            <span>{repaymentPercent}% repaid</span>
            <span>{remainingLabel} remaining</span>
          </div>
        </div>
      </div>

      <div className="loan-card__actions">
        <div className="loan-card__actions-row">
          <button type="button" className="button button--surface" onClick={() => onDetailsClick(loan)}>
            Details
          </button>
          {!isEffectivelyPaid && (
            <button type="button" className="button button--surface" onClick={() => onExtendClick(loan)}>
              Extend due date
            </button>
          )}
        </div>
        {!isEffectivelyPaid && remaining > 0 && (
          <button
            type="button"
            className="button button--primary"
            onClick={() => onMarkPaidClick(loan)}
          >
            Mark as paid
          </button>
        )}
      </div>

      <footer className="loan-card__footer">
        <button
          type="button"
          onClick={() => onEditClick(loan)}
          className="icon-button"
          title="Edit loan"
        >
          <FaEdit aria-hidden />
          <span className="sr-only">Edit loan</span>
        </button>
        <button
          type="button"
          onClick={moveToTrash}
          disabled={isProcessingTrash}
          className="icon-button icon-button--danger"
          title="Move to trash"
        >
          <FaTrashAlt aria-hidden />
          <span className="sr-only">Move to trash</span>
        </button>
      </footer>
    </li>
  );
}


