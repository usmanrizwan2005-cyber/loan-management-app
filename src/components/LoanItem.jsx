import { formatDate, formatCurrency } from '../utils/helpers';

export default function LoanItem({
  loan,
  onDetailsClick,
}) {
  if (!loan) return null;

  const amountLabel = formatCurrency(loan.amount, loan.currency);
  const takenDateLabel = formatDate(loan.takenAt);
  const borrowerName = loan.borrowerName || 'Unnamed borrower';

  return (
    <li className="loan-card loan-card--compact">
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
