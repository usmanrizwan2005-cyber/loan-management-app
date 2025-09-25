import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import toast from 'react-hot-toast';
import { currencies as seedCurrencies } from '../utils/currencies';
import { useCurrencies } from '../utils/useCurrencies';
import {
  phoneCountries as seedCountries,
  findCountryByDialPrefix,
  formatWithDialCode,
  validateInternationalPhone,
} from '../utils/phoneCountries';
import { usePhoneCountries } from '../utils/usePhoneCountries';
import CountrySelect from './CountrySelect.jsx';
import CurrencySelect from './CurrencySelect.jsx';

export default function LoanForm() {
  const [isOpen, setIsOpen] = useState(true);
  const [borrowerName, setBorrowerName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [takenDate, setTakenDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currencies: allCurrencies } = useCurrencies();
  const [currency, setCurrency] = useState(localStorage.getItem('preferredCurrency') || 'PKR');
  const { countries } = usePhoneCountries();
  const [phoneCountry, setPhoneCountry] = useState(() =>
    seedCountries.find((country) => country.code === (localStorage.getItem('defaultPhoneCountry') || 'PK'))
  );
  const [phoneError, setPhoneError] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    const storedCode =
      (uid && localStorage.getItem(`defaultPhoneCountry:${uid}`)) ||
      localStorage.getItem('defaultPhoneCountry') ||
      'PK';
    const source = countries?.length ? countries : seedCountries;
    const match = source.find((country) => country.code === storedCode);
    if (match) setPhoneCountry(match);
  }, [countries]);

  useEffect(() => {
    localStorage.setItem('preferredCurrency', currency);
  }, [currency]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (!borrowerName || !amount || !dueDate || !takenDate) {
      toast.error('Please fill out all required fields.');
      return;
    }

    if (parseFloat(amount) <= 0) {
      toast.error('Amount must be a positive number.');
      return;
    }

    if (phone) {
      const validation = validateInternationalPhone(phoneCountry, phone);
      if (!validation.ok) {
        setPhoneError(validation.reason || 'Invalid phone number');
        return;
      }
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error('You must be logged in to add a loan.');
      return;
    }

    try {
      setIsSubmitting(true);
      await addDoc(collection(db, 'loans'), {
        borrowerName,
        phone,
        phoneCountry: phoneCountry?.code || null,
        amount: parseFloat(amount),
        currency,
        takenAt: new Date(takenDate),
        dueDate: new Date(dueDate),
        status: 'pending',
        repaidAt: null,
        deletedAt: null,
        createdAt: serverTimestamp(),
        ownerUid: currentUser.uid,
      });
      toast.success('Loan added successfully!');
      setBorrowerName('');
      setPhone('');
      setAmount('');
      setDueDate('');
      setPhoneError('');
      setTakenDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      toast.error(`Error adding loan: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="add-loan" className="card space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2 text-center sm:text-left">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">Create entry</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--color-heading)]">Add a new loan</h2>
          <p className="text-sm text-[var(--color-muted)] max-w-2xl mx-auto sm:mx-0">
            Capture who borrowed, how much they owe, and when repayment is expected. We will keep everything synced across devices.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((previous) => !previous)}
          className="btn btn-accent text-sm px-5 py-2 w-full sm:w-auto"
        >
          {isOpen ? 'Hide form' : 'Add loan'}
        </button>
      </header>

      {isOpen && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="md:col-span-2 flex flex-col gap-2 text-sm">
              <span className="font-medium text-[var(--color-heading)]">Borrower's name</span>
              <input
                type="text"
                id="borrowerName"
                value={borrowerName}
                onChange={(event) => setBorrowerName(event.target.value)}
                placeholder="e.g. Sara Ahmed"
                className="input"
                required
              />
            </label>

            <div className="md:col-span-2 space-y-2">
              <span className="block text-sm font-medium text-[var(--color-heading)]">Phone number <span className="text-[var(--color-muted)]">(optional)</span></span>
              <div className="grid gap-3 md:grid-cols-[minmax(0,220px),1fr]">
                <CountrySelect
                  countries={countries?.length ? countries : seedCountries}
                  value={phoneCountry}
                  onChange={(country) => {
                    setPhoneCountry(country);
                    const uid = auth.currentUser?.uid;
                    if (uid) {
                      localStorage.setItem(`defaultPhoneCountry:${uid}`, country.code);
                    } else {
                      localStorage.setItem('defaultPhoneCountry', country.code);
                    }
                  }}
                  filter={countryFilter}
                  onFilterChange={setCountryFilter}
                />
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(event) => {
                    const value = event.target.value;
                    const detected = findCountryByDialPrefix(value);
                    if (detected && detected.code !== (phoneCountry?.code || '')) {
                      setPhoneCountry(detected);
                      const uid = auth.currentUser?.uid;
                      if (uid) {
                        localStorage.setItem(`defaultPhoneCountry:${uid}`, detected.code);
                      } else {
                        localStorage.setItem('defaultPhoneCountry', detected.code);
                      }
                    }
                    const formatted = formatWithDialCode(detected || phoneCountry, value);
                    setPhone(formatted);
                    const result = validateInternationalPhone(detected || phoneCountry, formatted);
                    setPhoneError(result.ok ? '' : result.reason || 'Invalid phone number');
                  }}
                  placeholder={`+${phoneCountry?.dialCode || ''} 3xxxxxxxxx`}
                  className={`input ${phoneError ? '!border-[var(--color-error)] focus:!border-[var(--color-error)]' : ''}`}
                />
              </div>
              {phoneError && <p className="text-sm text-[var(--color-error)]">{phoneError}</p>}
            </div>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-[var(--color-heading)]">Amount</span>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="number"
                  id="amount"
                  value={amount}
                  inputMode="decimal"
                  step="any"
                  min={0}
                  onKeyDown={(event) => {
                    if (event.key === '-' || event.key === '+' || event.key === 'e' || event.key === 'E') {
                      event.preventDefault();
                    }
                  }}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === '') {
                      setAmount('');
                      return;
                    }
                    const numeric = Number(value);
                    if (!Number.isNaN(numeric)) {
                      setAmount(String(Math.max(0, numeric)));
                    }
                  }}
                  placeholder="1000"
                  className="input"
                  required
                />
              </div>
            </label>

            <div className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-[var(--color-heading)]">Currency</span>
              <CurrencySelect
                currencies={allCurrencies?.length ? allCurrencies : seedCurrencies}
                valueCode={currency}
                filter={currencyFilter}
                onFilterChange={setCurrencyFilter}
                onChange={(selected) => setCurrency(selected.code)}
              />
            </div>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-[var(--color-heading)]">Taken on</span>
              <input
                type="date"
                id="takenDate"
                value={takenDate}
                onChange={(event) => setTakenDate(event.target.value)}
                className="input"
                required
              />
            </label>

            <label className="md:col-span-2 flex flex-col gap-2 text-sm">
              <span className="font-medium text-[var(--color-heading)]">Due on</span>
              <input
                type="date"
                id="dueDate"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="input"
                required
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--color-muted)] text-center sm:text-left">
              You can add extensions, partial payments, and adjustments after the loan is created.
            </p>
            <button type="submit" className="btn btn-primary w-full sm:w-auto px-6" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add loan'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
