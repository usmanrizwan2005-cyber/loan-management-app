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

export default function LoanForm({ onClose }) {
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
      if (typeof onClose === 'function') {
        onClose();
      }
    } catch (error) {
      toast.error(`Error adding loan: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="loan-form-content">
      <form onSubmit={handleSubmit} className="loan-form">
        <div className="loan-form__grid">
          <label className="form-field">
            <span>Borrower's name</span>
            <input
              type="text"
              id="borrowerName"
              value={borrowerName}
              onChange={(event) => setBorrowerName(event.target.value)}
              placeholder="e.g. Sara Ahmed"
              className="input"
              required
              style={{ fontSize: '16px' }}
            />
          </label>

          <div className="form-field">
            <span>Phone number <span className="form-field__hint">(optional)</span></span>
            <div className="form-field__group">
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
                className={`input${phoneError ? ' input--error' : ''}`}
                aria-invalid={Boolean(phoneError)}
                style={{ fontSize: '16px' }}
              />
            </div>
            {phoneError && <p className="form-field__error">{phoneError}</p>}
          </div>

          <label className="form-field">
            <span>Amount</span>
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
              style={{ fontSize: '16px' }}
            />
          </label>

          <div className="form-field">
            <span>Currency</span>
            <CurrencySelect
              currencies={allCurrencies?.length ? allCurrencies : seedCurrencies}
              valueCode={currency}
              filter={currencyFilter}
              onFilterChange={setCurrencyFilter}
              onChange={(selected) => setCurrency(selected.code)}
            />
          </div>

          <label className="form-field">
            <span>Taken on</span>
            <input
              type="date"
              id="takenDate"
              value={takenDate}
              onChange={(event) => setTakenDate(event.target.value)}
              className="input"
              required
              style={{ fontSize: '16px' }}
            />
          </label>

          <label className="form-field">
            <span>Due on</span>
            <input
              type="date"
              id="dueDate"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="input"
              required
              style={{ fontSize: '16px' }}
            />
          </label>
        </div>

        <div className="loan-form__footer">
          <p className="loan-form__note">
            You can add extensions, partial payments, and adjustments after the loan is created.
          </p>
          <button type="submit" className="button button--primary button--stretch" disabled={isSubmitting}>
            {isSubmitting ? 'Adding...' : 'Add loan'}
          </button>
        </div>
      </form>
    </div>
  );
}
