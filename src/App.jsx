import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, onSnapshot, orderBy, getDocs, writeBatch } from 'firebase/firestore'; // Import new functions
import { Toaster } from 'react-hot-toast';
import { auth, db } from './firebase';
import Login from './components/Login.jsx';
import LoanForm from './components/LoanForm';
import LoanList from './components/LoanList';

function App() {
  const [user, loading] = useAuthState(auth);
  const [loans, setLoans] = useState([]);

  // This is the main listener for displaying loans
  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'loans'),
        where('ownerUid', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const loansData = [];
        querySnapshot.forEach((doc) => {
          loansData.push({ ...doc.data(), id: doc.id });
        });
        setLoans(loansData);
      });

      return () => unsubscribe();
    } else {
      setLoans([]);
    }
  }, [user]);

  // NEW: This effect runs once when the user logs in to check for late loans
  useEffect(() => {
    const checkAndUpdateLateLoans = async () => {
      if (!user) return;

      // Query for pending loans that are past their due date
      const lateLoansQuery = query(
        collection(db, "loans"),
        where("ownerUid", "==", user.uid),
        where("status", "==", "pending"),
        where("dueDate", "<", new Date()) 
      );

      const querySnapshot = await getDocs(lateLoansQuery);

      if (querySnapshot.empty) {
        console.log("No overdue loans found.");
        return; 
      }

      // Use a batch to update all late loans at once
      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        console.log(`Updating loan ${doc.id} to 'late'`);
        batch.update(doc.ref, { status: "late" });
      });

      await batch.commit();
    };

    checkAndUpdateLateLoans();
  }, [user]); // This runs whenever the 'user' object is available

  const handleLogout = () => {
    auth.signOut();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Login />;
  }
  
  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Loan Manager</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700"
          >
            Logout
          </button>
        </header>
        <main>
          <LoanForm />
          <LoanList loans={loans} />
        </main>
      </div>
    </>
  );
}

export default App;