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
import { formatDateInputValue } from '../utils/helpers';
import PhoneContactSheet from './PhoneContactSheet.jsx';
import { FaAddressBook } from 'react-icons/fa';

export default function LoanForm({ onClose }) {
  const [borrowerName, setBorrowerName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [hasNoDueDate, setHasNoDueDate] = useState(false);
  const [takenDate, setTakenDate] = useState(formatDateInputValue(new Date()));
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currencies: allCurrencies } = useCurrencies();
  const [currency, setCurrency] = useState(localStorage.getItem('preferredCurrency') || 'PKR');
  const { countries } = usePhoneCountries();
  const [phoneCountry, setPhoneCountry] = useState(() =>
    seedCountries.find((country) => country.code === (localStorage.getItem('defaultPhoneCountry') || 'PK'))
  );
  const [phoneError, setPhoneError] = useState('');
  const [isPhoneSheetOpen, setIsPhoneSheetOpen] = useState(false);
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

  const saveDefaultPhoneCountry = (country) => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      localStorage.setItem(`defaultPhoneCountry:${uid}`, country.code);
    } else {
      localStorage.setItem('defaultPhoneCountry', country.code);
    }
  };

  const applyPhoneValue = (value) => {
    const detected = findCountryByDialPrefix(value);
    const selectedCountry = detected || phoneCountry;
    if (detected && detected.code !== (phoneCountry?.code || '')) {
      setPhoneCountry(detected);
      saveDefaultPhoneCountry(detected);
    }

    const formatted = formatWithDialCode(selectedCountry, value);
    setPhone(formatted);
    const result = validateInternationalPhone(selectedCountry, formatted);
    setPhoneError(result.ok ? '' : result.reason || 'Invalid phone number');
  };

  const handlePhoneContactSelect = (contact) => {
    if (contact.phone) {
      applyPhoneValue(contact.phone);
    }
    if (contact.name) {
      setBorrowerName(contact.name);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (!borrowerName || !amount || !takenDate || (!hasNoDueDate && !dueDate)) {
      toast.error('Please fill out all required fields.');
      return;
    }

    if (parseFloat(amount) <= 0) {
      toast.error('Amount must be a positive number.');
      return;
    }

    if (!hasNoDueDate && dueDate < takenDate) {
      toast.error('Due date cannot be earlier than the taken date.');
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
        borrowerName: borrowerName.trim(),
        phone: phone.trim(),
        phoneCountry: phoneCountry?.code || null,
        amount: parseFloat(amount),
        currency,
        takenAt: takenDate,
        dueDate: hasNoDueDate ? null : dueDate,
        note: note.trim() || null,
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
      setHasNoDueDate(false);
      setNote('');
      setPhoneError('');
      setTakenDate(formatDateInputValue(new Date()));
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
              placeholder="e.g. Saad Ahmed"
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
                  saveDefaultPhoneCountry(country);
                }}
                filter={countryFilter}
                onFilterChange={setCountryFilter}
              />
              <div className="phone-input-row">
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(event) => applyPhoneValue(event.target.value)}
                  placeholder={`+${phoneCountry?.dialCode || ''} 3xxxxxxxxx`}
                  className={`input${phoneError ? ' input--error' : ''}`}
                  aria-invalid={Boolean(phoneError)}
                  style={{ fontSize: '16px' }}
                />
                <button
                  type="button"
                  className="phone-book-button"
                  onClick={() => setIsPhoneSheetOpen(true)}
                  aria-label="Pick number from phone book"
                  title="Phone book"
                >
                  <FaAddressBook aria-hidden />
                </button>
              </div>
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

          <div className="form-field">
            <span>Due on <span className="form-field__hint">(optional)</span></span>
            <input
              type="date"
              id="dueDate"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="input"
              disabled={hasNoDueDate}
              required={!hasNoDueDate}
              style={{ fontSize: '16px' }}
            />
            <label className="form-field__check">
              <input
                type="checkbox"
                checked={hasNoDueDate}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setHasNoDueDate(checked);
                  if (checked) setDueDate('');
                }}
              />
              <span className="form-field__toggle" aria-hidden="true" />
              <span className="form-field__check-label">No due date</span>
            </label>
          </div>

          <label className="form-field loan-form__note-field">
            <span>Note <span className="form-field__hint">(optional)</span></span>
            <textarea
              id="note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add a note about purpose, guarantee details, or repayment terms"
              className="input loan-form__textarea"
              rows={4}
              maxLength={500}
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
      <PhoneContactSheet
        open={isPhoneSheetOpen}
        initialName={borrowerName}
        initialPhone={phone}
        onSelect={handlePhoneContactSelect}
        onClose={() => setIsPhoneSheetOpen(false)}
      />
    </div>
  );
}
