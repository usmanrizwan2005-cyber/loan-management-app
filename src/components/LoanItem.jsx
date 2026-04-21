import { formatDate, formatCurrency, getLoanComputedState } from '../utils/helpers';

export default function LoanItem({
  loan,
  onDetailsClick,
}) {
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
    </li>
  );
}
