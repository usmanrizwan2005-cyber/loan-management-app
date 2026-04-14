import { useMemo, useState, useEffect } from 'react';
import LoanItem from './LoanItem';
import { getLoanComputedState } from '../utils/helpers';

const FILTERS = [
  { key: 'All', label: 'All loans' },
  { key: 'Pending', label: 'Pending' },
  { key: 'On-Time', label: 'On time' },
  { key: 'Late', label: 'Late' },
  { key: 'Paid', label: 'Paid' },
];

export default function LoanList({
  loans,
  itemsPerPage = 10,
  onOpenDetails,
  onOpenExtend,
  onOpenEdit,
  onOpenMarkPaid,
}) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const enhancedLoans = useMemo(() => {
    return loans.map((loan) => {
      const computed = getLoanComputedState(loan);
      return {
        ...loan,
        computed,
      };
    });
  }, [loans]);

  const filteredLoans = useMemo(() => {
    return enhancedLoans
      .filter((loan) => {
        const filter = activeFilter.toLowerCase();
        if (filter === 'all') return true;
        if (filter === 'pending') return !loan.computed.isEffectivelyPaid;
        if (filter === 'late') return loan.computed.status === 'late' && !loan.computed.isEffectivelyPaid;
        if (filter === 'paid') return loan.computed.isEffectivelyPaid;
        if (filter === 'on-time') return loan.computed.isEffectivelyPaid && loan.computed.status === 'on-time';
        return loan.computed.status === filter;
      })
      .filter((loan) => {
        if (!searchTerm) return true;
        const query = searchTerm.toLowerCase();
        const nameMatch = (loan.borrowerName || '').toLowerCase().includes(query);
        const phoneMatch = loan.phone?.toLowerCase().includes(query);
        return nameMatch || phoneMatch;
      });
  }, [enhancedLoans, activeFilter, searchTerm]);

  const resolvedItemsPerPage = Number.isFinite(itemsPerPage) && itemsPerPage > 0 ? itemsPerPage : 10;
  const totalPages = Math.max(1, Math.ceil(filteredLoans.length / resolvedItemsPerPage));
  const pageStart = (currentPage - 1) * resolvedItemsPerPage;
  const pageEnd = pageStart + resolvedItemsPerPage;
  const visibleLoans = filteredLoans.slice(pageStart, pageEnd);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchTerm, resolvedItemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleDetailsClick = (loan) => onOpenDetails?.(loan);
  const handleExtendClick = (loan) => onOpenExtend?.(loan);
  const handleEditClick = (loan) => onOpenEdit?.(loan);
  const handleMarkPaidClick = (loan) => onOpenMarkPaid?.(loan);


  return (
    <section className="data-panel">
      <header className="data-panel__header">
        <div className="data-panel__titles">
          <span className="data-panel__eyebrow">Portfolio</span>
          <h2>Your loans</h2>
          <p>Search borrowers, check balances, and record repayments quickly.</p>
        </div>
        <div className="data-panel__controls">
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
        </div>
      </header>

      <div className="data-panel__filters" aria-label="Loan status filters">
        {FILTERS.map((filter) => {
          const selected = activeFilter === filter.key;
          return (
            <button
              key={filter.key}
              type="button"
              className={`data-panel__filter-chip${selected ? ' data-panel__filter-chip--active' : ''}`}
              onClick={() => setActiveFilter(filter.key)}
              aria-pressed={selected}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="data-panel__meta" aria-live="polite">
        {filteredLoans.length > 0
          ? `Showing ${pageStart + 1}-${Math.min(pageEnd, filteredLoans.length)} of ${filteredLoans.length} ${
              filteredLoans.length === 1 ? 'loan' : 'loans'
            }`
          : 'No loans match the current filters'}
      </div>

      {filteredLoans.length > 0 ? (
        <ul className="data-panel__list">
          {visibleLoans.map((loan) => (
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

      {totalPages > 1 && (
        <div className="data-panel__pagination">
          <button
            type="button"
            className="button button--surface"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          >
            Previous
          </button>
          <span className="data-panel__pagination-label">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            className="button button--surface"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          >
            Next
          </button>
        </div>
      )}

    </section>
  );
}
