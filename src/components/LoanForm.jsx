import { useState, useEffect } from 'react'; // 1. Import useEffect
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import toast from 'react-hot-toast';
import { currencies } from '../utils/currencies'; // 2. Import our new currency list

export default function LoanForm() {
  const [borrowerName, setBorrowerName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [takenDate, setTakenDate] = useState(new Date().toISOString().split('T')[0]);
  
  // 3. Add state for currency, defaulting to the last used one or PKR.
  const [currency, setCurrency] = useState(localStorage.getItem('preferredCurrency') || 'PKR');

  // 4. This effect saves your currency choice in the browser.
  useEffect(() => {
    localStorage.setItem('preferredCurrency', currency);
  }, [currency]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!borrowerName || !amount || !dueDate || !takenDate) {
      return toast.error('Please fill out all required fields.');
    }
    if (parseFloat(amount) <= 0) {
        return toast.error('Amount must be a positive number.');
    }
    
    const user = auth.currentUser;
    if (!user) {
        toast.error("You must be logged in to add a loan.");
        return;
    }

    try {
      await addDoc(collection(db, 'loans'), {
        borrowerName,
        phone,
        amount: parseFloat(amount),
        currency: currency, // 5. Save the selected currency to the database
        takenAt: new Date(takenDate), 
        dueDate: new Date(dueDate),
        status: 'pending',
        repaidAt: null,
        createdAt: serverTimestamp(),
        ownerUid: user.uid,
      });
      toast.success('Loan added successfully!');
      setBorrowerName('');
      setPhone('');
      setAmount('');
      setDueDate('');
      setTakenDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      toast.error('Error adding loan: ' + error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 mb-8 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Add New Loan</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          value={borrowerName}
          onChange={(e) => setBorrowerName(e.target.value)}
          placeholder="Borrower's Name"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          required
        />
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone Number (Optional)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        {/* 6. Group the amount and currency inputs together */}
        <div className="flex items-end gap-2">
            <div className="flex-grow">
                <label className="block text-sm font-medium text-gray-500">Amount</label>
                <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Loan Amount"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
                />
            </div>
            <select 
                value={currency} 
                onChange={e => setCurrency(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            >
                {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
            </select>
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-500">Taken On</label>
            <input
              type="date"
              value={takenDate}
              onChange={(e) => setTakenDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-500">Due On</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
        </div>
      </div>
      <button type="submit" className="w-full mt-4 py-2 px-4 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
        Add Loan
      </button>
    </form>
  );
}