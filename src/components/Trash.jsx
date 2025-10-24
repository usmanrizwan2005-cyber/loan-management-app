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
    <section className="data-panel data-panel--alt">
      <header className="data-panel__header">
        <div className="data-panel__titles">
          <span className="data-panel__eyebrow">Archive</span>
          <h2>Trash</h2>
          <p>Restore items or delete them forever. Nothing disappears until you say so.</p>
        </div>
      </header>

      {trashedLoans.length > 0 ? (
        <ul className="trash-list">
          {trashedLoans.map((loan) => (
            <li key={loan.id} className="trash-card">
              <div className="trash-card__details">
                <h3>{loan.borrowerName}</h3>
                <p className="trash-card__amount">{formatCurrency(loan.amount, loan.currency)}</p>
                <p className="trash-card__date">Trashed on {formatDate(loan.deletedAt)}</p>
              </div>
              <div className="trash-card__actions">
                <button
                  type="button"
                  onClick={() => restoreLoan(loan.id)}
                  disabled={processingId === loan.id}
                  className="button button--surface"
                >
                  {processingId === loan.id ? 'Restoring...' : 'Restore'}
                </button>
                <button
                  type="button"
                  onClick={() => deleteForever(loan.id)}
                  disabled={processingId === loan.id}
                  className="button button--danger"
                >
                  {processingId === loan.id ? 'Deleting...' : 'Delete forever'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="data-panel__empty">
          <h3>Trash is empty</h3>
          <p>Anything you delete from your portfolio will appear here first.</p>
        </div>
      )}
    </section>
  );
}
