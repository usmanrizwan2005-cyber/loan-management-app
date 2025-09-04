import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';
import { formatDate, getStatusColor, formatCurrency } from '../utils/helpers';

export default function LoanItem({ loan }) {
  if (!loan) {
    return null;
  }

  const isPaid = !!loan.repaidAt;
  const isOverdue = loan.status === 'pending' && loan.dueDate.toDate() < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const effectiveStatus = isOverdue ? 'late' : loan.status;

  const markAsPaid = async () => {
    const loanRef = doc(db, 'loans', loan.id);
    try {
      const wasPaidOnTime = new Date() <= loan.dueDate.toDate();
      const finalStatus = wasPaidOnTime ? 'on-time' : 'late';

      await updateDoc(loanRef, {
        status: finalStatus,
        repaidAt: serverTimestamp(),
      });
      toast.success(`Loan marked as paid (${finalStatus})!`);
    } catch (error) {
      toast.error('Failed to update loan.');
    }
  };

  const deleteLoan = async () => {
    if (window.confirm('Are you sure you want to delete this loan record?')) {
      const loanRef = doc(db, 'loans', loan.id);
      try {
        await deleteDoc(loanRef);
        toast.success('Loan deleted.');
      } catch (error) {
        toast.error('Failed to delete loan.');
      }
    }
  };

  return (
    <li className={`p-4 rounded-lg shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors ${isOverdue && !isPaid ? 'bg-red-100' : 'bg-white'}`}>
      <div className="flex-1">
        <div className="flex items-center justify-between">
            <p className={`text-lg font-semibold ${isOverdue && !isPaid ? 'text-red-800' : 'text-gray-800'}`}>{loan.borrowerName}</p>
            
            {/* UPDATED THIS ENTIRE LOGIC BLOCK 👇 */}
            <div className="flex items-center gap-2">
              {!isPaid ? (
                <span className={`px-2 py-1 text-xs uppercase rounded-full ${getStatusColor(effectiveStatus)}`}>
                  {effectiveStatus.replace('-', ' ')}
                </span>
              ) : (
                <>
                  <span className={`px-2 py-1 text-xs uppercase rounded-full ${getStatusColor('on-time')}`}>
                    Paid
                  </span>
                  {loan.status === 'late' && (
                    <span className={`px-2 py-1 text-xs uppercase rounded-full ${getStatusColor('late')}`}>
                      Late
                    </span>
                  )}
                  {loan.status === 'on-time' && (
                    <span className={`px-2 py-1 text-xs uppercase rounded-full ${getStatusColor('on-time')}`}>
                      On-Time
                    </span>
                  )}
                </>
              )}
            </div>
        </div>
        <p className={` ${isOverdue && !isPaid ? 'text-red-700' : 'text-gray-600'}`}>{formatCurrency(loan.amount, loan.currency)}</p>
        
        <p className={`text-sm ${isOverdue && !isPaid ? 'text-red-600' : 'text-gray-500'}`}>Taken: {formatDate(loan.takenAt)}</p>
        <p className={`text-sm ${isOverdue && !isPaid ? 'text-red-600' : 'text-gray-500'}`}>Due: {formatDate(loan.dueDate)}</p>
        {loan.repaidAt && <p className="text-sm text-gray-500">Repaid: {formatDate(loan.repaidAt)}</p>}
      </div>
      <div className="flex items-center gap-2 mt-4 md:mt-0">
        {!isPaid ? (
          <button
            onClick={markAsPaid}
            className="px-3 py-1 text-sm font-medium text-white bg-green-500 rounded-md hover:bg-green-600"
          >
            Mark as Paid
          </button>
        ) : (
          <button
            onClick={deleteLoan}
            className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            Delete
          </button>
        )}
      </div>
    </li>
  );
}