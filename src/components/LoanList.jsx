import { useMemo, useState } from 'react';
import LoanItem from './LoanItem';
import LoanModal from './LoanModal';

const FILTERS = [
  { key: 'All', label: 'All loans' },
  { key: 'Pending', label: 'Pending' },
  { key: 'On-Time', label: 'On time' },
  { key: 'Late', label: 'Late' },
  { key: 'Paid', label: 'Paid' },
];

export default function LoanList({ loans }) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalLoan, setModalLoan] = useState(null);
  const [modalView, setModalView] = useState('details');
  const [initialPaymentType, setInitialPaymentType] = useState('full');

  const enhancedLoans = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return loans.map((loan) => ({
      ...loan,
      isOverdue: loan.status === 'pending' && loan.dueDate.toDate() < today,
    }));
  }, [loans]);

  const filteredLoans = useMemo(() => {
    return enhancedLoans
      .filter((loan) => {
        const filter = activeFilter.toLowerCase();
        if (filter === 'all') return true;
        if (filter === 'pending') return loan.status === 'pending';
        if (filter === 'late') return loan.status === 'late' || (loan.status === 'pending' && loan.isOverdue);
        if (filter === 'paid') return loan.status === 'on-time' || loan.status === 'late';
        return loan.status === filter;
      })
      .filter((loan) => {
        if (!searchTerm) return true;
        const nameMatch = loan.borrowerName.toLowerCase().includes(searchTerm.toLowerCase());
        const phoneMatch = loan.phone?.includes(searchTerm);
        return nameMatch || phoneMatch;
      });
  }, [enhancedLoans, activeFilter, searchTerm]);

  const handleDetailsClick = (loan) => {
    setModalView('details');
    setModalLoan(loan);
  };

  const handleExtendClick = (loan) => {
    setModalView('extend');
    setModalLoan(loan);
  };

  const handleEditClick = (loan) => {
    setModalView('edit');
    setModalLoan(loan);
  };

  const handleMarkPaidClick = (loan) => {
    setInitialPaymentType('full');
    setModalView('markPaid');
    setModalLoan(loan);
  };


  return (
    <section className="data-panel">
      <header className="data-panel__header">
        <div className="data-panel__titles">
          <span className="data-panel__eyebrow">Portfolio</span>
          <h2>Your loans</h2>
          <p>Filter by status, search by name or phone, and open any record for deeper detail.</p>
        </div>
        <div className="data-panel__search">
          <label className="input-group">
            <span className="sr-only">Search loans</span>
            <input
              type="text"
              placeholder="Search by name or phone"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="input input--search"
            />
          </label>
        </div>
      </header>

      <div className="data-panel__filters" role="tablist" aria-label="Loan filters">
        {FILTERS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            role="tab"
            aria-selected={activeFilter === filter.key}
            onClick={() => setActiveFilter(filter.key)}
            className={`chip${activeFilter === filter.key ? ' chip--active' : ''}`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="data-panel__meta" aria-live="polite">
        Showing {filteredLoans.length} {filteredLoans.length === 1 ? 'loan' : 'loans'}
      </div>

      {filteredLoans.length > 0 ? (
        <ul className="data-panel__list">
          {filteredLoans.map((loan) => (
            <LoanItem
              key={loan.id}
              loan={loan}
              onDetailsClick={handleDetailsClick}
              onExtendClick={handleExtendClick}
              onEditClick={handleEditClick}
              onMarkPaidClick={handleMarkPaidClick}
            />
          ))}
        </ul>
      ) : (
        <div className="data-panel__empty">
          <h3>No loans match your filters</h3>
          <p>Try adjusting the status filter or search for another borrower.</p>
        </div>
      )}

      {modalLoan && (
        <LoanModal
          loan={modalLoan}
          viewType={modalView}
          onClose={() => setModalLoan(null)}
          initialPaymentType={initialPaymentType}
        />
      )}
    </section>
  );
}
