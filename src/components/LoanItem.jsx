import { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';
import { formatDate, formatCurrency, getLoanComputedState } from '../utils/helpers';
import {
  FaCalendarAlt,
  FaChartLine,
  FaClock,
  FaEdit,
  FaMoneyBillWave,
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

  const {
    totalPaid,
    remaining,
    isEffectivelyPaid,
    effectivePaidAt,
    status,
    daysUntilDue,
  } = getLoanComputedState(loan);

  const isOverdueLate = !isEffectivelyPaid && status === 'late';

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
      return status === 'late' ? 'Paid late' : status === 'on-time' ? 'Paid on time' : 'Paid';
    }
    if (isOverdueLate) return 'Late';
    return 'Pending';
  })();

  const amountValue = Number(loan.amount || 0);
  const amountLabel = formatCurrency(loan.amount, loan.currency);
  const remainingLabel = formatCurrency(remaining, loan.currency);
  const repaymentPercent = amountValue > 0 ? Math.min(100, Math.round((totalPaid / amountValue) * 100)) : 0;
  const dueDateLabel = formatDate(loan.dueDate);
  const takenDateLabel = formatDate(loan.takenAt);
  const notePreview = String(loan.note || loan.description || '').trim();

  let timelineDescriptor;
  if (isEffectivelyPaid) {
    timelineDescriptor = effectivePaidAt ? `Settled on ${formatDate(effectivePaidAt)}` : 'Marked as paid';
  } else if (isOverdueLate && typeof daysUntilDue === 'number') {
    const daysOverdue = Math.abs(Math.min(daysUntilDue, 0));
    timelineDescriptor = daysOverdue ? `${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue` : 'Overdue';
  } else if (daysUntilDue === 0) {
    timelineDescriptor = 'Due today';
  } else if (daysUntilDue === 1) {
    timelineDescriptor = 'Due tomorrow';
  } else if (typeof daysUntilDue === 'number' && daysUntilDue > 1) {
    timelineDescriptor = `Due in ${daysUntilDue} days`;
  } else {
    timelineDescriptor = 'Due date not set';
  }

  return (
    <li className={`loan-card loan-card--${isOverdueLate ? 'late' : isEffectivelyPaid ? 'paid' : 'pending'}`}>
      <header className="loan-card__header">
        <div className="loan-card__identity">
          <div className="loan-card__avatar">{loan.borrowerName?.[0]?.toUpperCase() || '?'}</div>
          <div className="loan-card__identity-copy">
            <div className="loan-card__name-row">
              <h3 className="loan-card__name">{loan.borrowerName}</h3>
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
            </div>
            <p className="loan-card__subtitle">
              {loan.phone ? loan.phone : `Taken ${takenDateLabel}`}
            </p>
          </div>
        </div>
        <div className="loan-card__amount-block">
          <span>Total loan</span>
          <strong>{amountLabel}</strong>
        </div>
      </header>

      <div className="loan-card__body">
        <div className="loan-card__meta-grid">
          <div className="loan-card__meta-item loan-card__meta-item--money">
            <span className="loan-card__meta-icon">
              <FaMoneyBillWave aria-hidden />
            </span>
            <div className="loan-card__meta-copy">
              <span>Outstanding</span>
              <strong>{remainingLabel}</strong>
            </div>
          </div>
          <div className="loan-card__meta-item loan-card__meta-item--due">
            <span className="loan-card__meta-icon">
              <FaCalendarAlt aria-hidden />
            </span>
            <div className="loan-card__meta-copy">
              <span>Due</span>
              <strong>{dueDateLabel}</strong>
            </div>
          </div>
          <div className="loan-card__meta-item loan-card__meta-item--taken">
            <span className="loan-card__meta-icon">
              <FaClock aria-hidden />
            </span>
            <div className="loan-card__meta-copy">
              <span>Taken</span>
              <strong>{takenDateLabel}</strong>
            </div>
          </div>
          <div className="loan-card__meta-item loan-card__meta-item--progress">
            <span className="loan-card__meta-icon">
              <FaChartLine aria-hidden />
            </span>
            <div className="loan-card__meta-copy">
              <span>Progress</span>
              <strong>{repaymentPercent}% repaid</strong>
            </div>
          </div>
        </div>

        <div className="loan-card__timeline">
          <span className="loan-card__timeline-label">{timelineDescriptor}</span>
          <span className="loan-card__timeline-date">{loan.currency} loan record</span>
        </div>

        {notePreview && (
          <p className="loan-card__note">{notePreview}</p>
        )}

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
        <button type="button" className="button button--surface button--stretch" onClick={() => onDetailsClick(loan)}>
          View details
        </button>
        {!isEffectivelyPaid && (
          <button type="button" className="button button--surface button--stretch" onClick={() => onExtendClick(loan)}>
            Extend due date
          </button>
        )}
        {!isEffectivelyPaid && remaining > 0 && (
          <button
            type="button"
            className="button button--primary"
            onClick={() => onMarkPaidClick(loan)}
          >
            Record payment
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
