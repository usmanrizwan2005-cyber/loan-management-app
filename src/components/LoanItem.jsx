import { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { FaEdit, FaTrashAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { db } from '../firebase';
import { formatDate, formatCurrency, getLoanComputedState } from '../utils/helpers';

export default function LoanItem({
  loan,
  onDetailsClick,
  onEditClick,
}) {
  const [isProcessingArchive, setIsProcessingArchive] = useState(false);

  if (!loan) return null;

  const amountLabel = formatCurrency(loan.amount, loan.currency);
  const takenDateLabel = formatDate(loan.takenAt);
  const borrowerName = loan.borrowerName || 'Unnamed borrower';
  const { isEffectivelyPaid, status } = getLoanComputedState(loan);
  const isLate = !isEffectivelyPaid && status === 'late';
  const statusLabel = isEffectivelyPaid
    ? status === 'late'
      ? 'Paid late'
      : status === 'on-time'
      ? 'Paid on time'
      : 'Paid'
    : isLate
    ? 'Late'
    : 'Pending';
  const statusClass = isLate
    ? 'loan-card__badge--late'
    : isEffectivelyPaid
    ? 'loan-card__badge--paid'
    : 'loan-card__badge--pending';

  const moveToArchive = async () => {
    if (isProcessingArchive) return;
    if (!window.confirm('Move this loan to the archive?')) return;

    const loanRef = doc(db, 'loans', loan.id);
    try {
      setIsProcessingArchive(true);
      await updateDoc(loanRef, { deletedAt: serverTimestamp() });
      toast.success('Loan moved to archive.');
    } catch (error) {
      toast.error('Failed to move loan to archive.');
    } finally {
      setIsProcessingArchive(false);
    }
  };

  return (
    <li className={`loan-card loan-card--compact loan-card--${isLate ? 'late' : isEffectivelyPaid ? 'paid' : 'pending'}`}>
      <button
        type="button"
        className="loan-card__summary"
        onClick={() => onDetailsClick?.(loan)}
        aria-label={`View loan details for ${borrowerName}`}
      >
        <div className="loan-card__summary-main">
          <div className="loan-card__avatar">{borrowerName[0]?.toUpperCase() || '?'}</div>
          <div className="loan-card__identity-copy">
            <h3 className="loan-card__name">{borrowerName}</h3>
            <span className={`loan-card__badge loan-card__badge--compact ${statusClass}`}>
              {statusLabel}
            </span>
          </div>
        </div>
        <div className="loan-card__summary-meta">
          <div className="loan-card__amount-feature">
            <span>Amount</span>
            <strong>{amountLabel}</strong>
          </div>
          <div className="loan-card__taken-detail">
            <span>Taken</span>
            <strong>{takenDateLabel}</strong>
          </div>
        </div>
      </button>

      <footer className="loan-card__footer loan-card__footer--floating">
        <button
          type="button"
          onClick={() => onEditClick?.(loan)}
          className="icon-button"
          title="Edit loan"
        >
          <FaEdit aria-hidden />
          <span className="sr-only">Edit loan</span>
        </button>
        <button
          type="button"
          onClick={moveToArchive}
          disabled={isProcessingArchive}
          className="icon-button icon-button--danger"
          title="Move to archive"
        >
          <FaTrashAlt aria-hidden />
          <span className="sr-only">Move to archive</span>
        </button>
      </footer>
    </li>
  );
}
