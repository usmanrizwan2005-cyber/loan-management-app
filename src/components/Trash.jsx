import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { formatDate, formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function Trash() {
  const [trashedLoans, setTrashedLoans] = useState([]);
  const [user] = useAuthState(auth);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (user) {
      const trashQuery = query(
        collection(db, 'loans'),
        where('ownerUid', '==', user.uid),
        where('deletedAt', '!=', null),
        orderBy('deletedAt', 'desc')
      );

      const unsubscribe = onSnapshot(trashQuery, (snapshot) => {
        const loansData = [];
        snapshot.forEach((docSnap) => {
          loansData.push({ ...docSnap.data(), id: docSnap.id });
        });
        setTrashedLoans(loansData);
      });

      return () => unsubscribe();
    }
  }, [user]);

  const restoreLoan = async (loanId) => {
    if (processingId) return;
    const loanRef = doc(db, 'loans', loanId);
    try {
      setProcessingId(loanId);
      await updateDoc(loanRef, { deletedAt: null });
      toast.success('Loan restored.');
    } catch (error) {
      toast.error('Failed to restore loan.');
    } finally {
      setProcessingId(null);
    }
  };

  const deleteForever = async (loanId) => {
    if (processingId) return;
    if (!window.confirm('This is permanent. Delete this loan forever?')) return;
    const loanRef = doc(db, 'loans', loanId);
    try {
      setProcessingId(loanId);
      await deleteDoc(loanRef);
      toast.success('Loan deleted permanently.');
    } catch (error) {
      toast.error('Failed to delete loan.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <section className="card space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-[var(--color-heading)]">Trash</h2>
        <p className="text-sm text-[var(--color-muted)]">
          Items stay here until you restore or permanently delete them.
        </p>
      </header>

      {trashedLoans.length > 0 ? (
        <ul className="space-y-4">
          {trashedLoans.map((loan) => (
            <li
              key={loan.id}
              className="surface flex flex-col gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/60 p-5 shadow-inner sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <p className="text-lg font-semibold text-[var(--color-heading)]">{loan.borrowerName}</p>
                <p className="text-sm text-[var(--color-muted)]">
                  {formatCurrency(loan.amount, loan.currency)}
                </p>
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">
                  Trashed on {formatDate(loan.deletedAt)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => restoreLoan(loan.id)}
                  disabled={processingId === loan.id}
                  className={`btn btn-outline px-4 py-2 ${processingId === loan.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {processingId === loan.id ? 'Restoring...' : 'Restore'}
                </button>
                <button
                  onClick={() => deleteForever(loan.id)}
                  disabled={processingId === loan.id}
                  className={`btn btn-danger px-4 py-2 ${processingId === loan.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {processingId === loan.id ? 'Deleting...' : 'Delete forever'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)]/70 px-6 py-12 text-center">
          <h3 className="text-lg font-semibold text-[var(--color-heading)]">Trash is empty</h3>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Anything you delete from your portfolio will appear here first.
          </p>
        </div>
      )}
    </section>
  );
}
