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

  return (
    <li className="loan-card">
      {/* Header Section */}
      <div className="loan-card-header">
        <div className="borrower-info">
          <div className="borrower-avatar">
            {loan.borrowerName?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="borrower-details">
            <h3 className="borrower-name">{loan.borrowerName}</h3>
            <p className="loan-date">Taken {formatDate(loan.takenAt)}</p>
          </div>
        </div>
        <div className="status-badge">
          {isOverdueLate ? (
            <span className="status-late">LATE</span>
          ) : isEffectivelyPaid ? (
            <span className="status-paid">Paid</span>
          ) : (
            <span className="status-pending">{statusLabel}</span>
          )}
        </div>
      </div>

      {/* Amount Section */}
      <div className="loan-amount-section">
        <span className="amount-label">Amount</span>
        <span className="amount-value">{formatCurrency(loan.amount, loan.currency)}</span>
      </div>

      {/* Action Buttons */}
      <div className="loan-actions">
        <div className="action-buttons-row">
          <button onClick={() => onDetailsClick(loan)} className="btn-details">
            Details
          </button>
          {!isEffectivelyPaid && (
            <button onClick={() => onExtendClick(loan)} className="btn-extend">
              Extend due date
            </button>
          )}
        </div>
        {!isEffectivelyPaid && remaining > 0 && (
          <button onClick={() => onMarkPaidClick(loan)} className="btn-mark-paid">
            Mark as paid
          </button>
        )}
      </div>

      {/* Bottom Action Icons */}
      <div className="loan-bottom-actions">
        <button
          onClick={() => onEditClick(loan)}
          className="action-icon edit-icon"
          title="Edit loan"
        >
          <FaEdit />
        </button>
        <button
          onClick={moveToTrash}
          disabled={isProcessingTrash}
          className="action-icon delete-icon"
          title="Move to trash"
        >
          <FaTrashAlt />
        </button>
      </div>
    </li>
  );
}


