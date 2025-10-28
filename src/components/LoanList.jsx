import { useMemo, useState, useEffect, useRef } from 'react';
import LoanItem from './LoanItem';
import LoanModal from './LoanModal';
import { FaChevronDown, FaCheck } from 'react-icons/fa';

const FILTERS = [
  { key: 'All', label: 'All loans' },
  { key: 'Pending', label: 'Pending' },
  { key: 'On-Time', label: 'On time' },
  { key: 'Late', label: 'Late' },
  { key: 'Paid', label: 'Paid' },
];

export default function LoanList({
  loans,
  modalLoan,
  modalView,
  initialPaymentType,
  onOpenDetails,
  onOpenExtend,
  onOpenEdit,
  onOpenMarkPaid,
  onCloseModal,
}) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


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

      <div className="data-panel__filters">
        <div ref={filterDropdownRef} className="relative inline-block">
          <button
            type="button"
            onClick={() => setIsFilterOpen((open) => !open)}
            aria-haspopup="listbox"
            aria-expanded={isFilterOpen}
            className="button button--surface rounded-full px-4 py-2 flex items-center gap-2 shadow-sm"
          >
            <span>Filter by Status</span>
            <FaChevronDown aria-hidden className={`transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} />
          </button>

          <ul
            role="listbox"
            className={`absolute z-20 mt-2 w-56 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl ring-1 ring-black/5 overflow-hidden transform transition-all duration-150 origin-top ${
              isFilterOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
            }`}
          >
            {FILTERS.map((filter) => {
              const selected = activeFilter === filter.key;
              return (
                <li key={filter.key} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveFilter(filter.key);
                      setIsFilterOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-[var(--color-surface-alt)] focus:bg-[var(--color-surface-alt)] ${
                      selected ? 'text-[var(--color-primary)] font-medium' : 'text-[var(--color-text)]'
                    }`}
                  >
                    <span>{filter.label}</span>
                    {selected && <FaCheck aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
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
          onClose={onCloseModal}
          initialPaymentType={initialPaymentType}
        />
      )}
    </section>
  );
}
