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

  const handleQuickPartial = (loan) => {
    setInitialPaymentType('partial');
    setModalView('markPaid');
    setModalLoan(loan);
  };

  return (
    <section className="card space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2 text-center sm:text-left">
          <h2 className="text-2xl font-semibold text-[var(--color-heading)]">Your loans</h2>
          <p className="text-sm text-[var(--color-muted)]">
            Filter by status, search by name or number, and open any record for deeper detail.
          </p>
        </div>
        <div className="w-full max-w-md lg:w-auto lg:min-w-[320px]">
          <input
            type="text"
            placeholder="Search by name or phone"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="input"
          />
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 text-sm sm:flex sm:flex-wrap sm:items-center">
        {FILTERS.map((filter) => (
          <button
            key={filter.key}
            onClick={() => setActiveFilter(filter.key)}
            className={`btn px-4 py-2 w-full sm:w-auto ${activeFilter === filter.key ? 'btn-primary' : 'btn-surface'}`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {filteredLoans.length > 0 ? (
        <ul className="space-y-4">
          {filteredLoans.map((loan) => (
            <LoanItem
              key={loan.id}
              loan={loan}
              onDetailsClick={handleDetailsClick}
              onExtendClick={handleExtendClick}
              onEditClick={handleEditClick}
              onMarkPaidClick={handleMarkPaidClick}
              onQuickPartial={handleQuickPartial}
            />
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)]/70 px-6 py-12 text-center">
          <h3 className="text-lg font-semibold text-[var(--color-heading)]">No loans match your filters</h3>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Try adjusting the status filter or search for another borrower.
          </p>
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
