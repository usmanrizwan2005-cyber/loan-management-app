import { useMemo, useState } from 'react';
import LoanItem from './LoanItem';

// 1. ADDED 'Paid' to the list of official filters
const FILTERS = ['All', 'Pending', 'On-Time', 'Late', 'Paid'];

export default function LoanList({ loans }) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const enhancedLoans = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return loans.map(loan => ({
      ...loan,
      isOverdue: loan.status === 'pending' && loan.dueDate.toDate() < today
    }));
  }, [loans]);


  const filteredLoans = useMemo(() => {
    return enhancedLoans
      .filter(loan => {
        const filter = activeFilter.toLowerCase();
        
        if (filter === 'all') return true;

        if (filter === 'pending') {
          return loan.status === 'pending';
        }
        
        if (filter === 'late') {
          return loan.status === 'late' || (loan.status === 'pending' && loan.isOverdue);
        }

        // 2. THIS IS THE NEW LOGIC FOR THE 'PAID' FILTER 👇
        if (filter === 'paid') {
          // A loan is paid if its status is 'on-time' or 'late'.
          return loan.status === 'on-time' || loan.status === 'late';
        }

        // This handles the 'On-Time' case
        return loan.status === filter;
      })
      .filter(loan => {
        if (!searchTerm) return true;
        const nameMatch = loan.borrowerName.toLowerCase().includes(searchTerm.toLowerCase());
        const phoneMatch = loan.phone?.includes(searchTerm);
        return nameMatch || phoneMatch;
      });
  }, [enhancedLoans, activeFilter, searchTerm]);
  
  console.log("Data being rendered:", filteredLoans);

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Your Loans</h2>
      
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <input 
          type="text"
          placeholder="Search by name or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:flex-1 px-3 py-2 border border-gray-300 rounded-md"
        />
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-md">
          {FILTERS.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1 text-sm font-medium rounded-md ${
                activeFilter === filter
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {filteredLoans.length > 0 ? (
        <ul className="space-y-4">
          {filteredLoans.map(loan => (
            <LoanItem key={loan.id} loan={loan} />
          ))}
        </ul>
      ) : (
        <p className="text-center text-gray-500 py-8">No loans found for this filter.</p>
      )}
    </div>
  );
}