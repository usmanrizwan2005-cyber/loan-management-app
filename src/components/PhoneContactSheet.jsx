import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FaAddressBook, FaCheck, FaPhoneAlt, FaSearch, FaTimes, FaUser } from 'react-icons/fa';
import { loadSavedPhoneContacts, pickPhoneContact, savePhoneContact } from '../utils/contactPicker';

export default function PhoneContactSheet({
  open,
  initialName = '',
  initialPhone = '',
  onClose,
  onSelect,
}) {
  const searchRef = useRef(null);
  const [query, setQuery] = useState('');
  const [typedName, setTypedName] = useState('');
  const [typedPhone, setTypedPhone] = useState('');
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setTypedName(initialName || '');
    setTypedPhone(initialPhone || '');
    setContacts(loadSavedPhoneContacts());
    window.setTimeout(() => searchRef.current?.focus(), 80);
  }, [initialName, initialPhone, open]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const filteredContacts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return contacts;
    const queryDigits = normalizedQuery.replace(/\D/g, '');

    return contacts.filter((contact) => {
      const nameMatch = contact.name.toLowerCase().includes(normalizedQuery);
      const phoneMatch = queryDigits
        ? contact.phone.replace(/\D/g, '').includes(queryDigits)
        : contact.phone.toLowerCase().includes(normalizedQuery);
      return nameMatch || phoneMatch;
    });
  }, [contacts, query]);

  if (!open) return null;

  const applyContact = (contact) => {
    const saved = savePhoneContact(contact);
    if (saved) {
      setContacts(loadSavedPhoneContacts());
      onSelect?.(saved);
    }
    onClose?.();
  };

  const handlePickNativeContact = async () => {
    try {
      const contact = await pickPhoneContact();
      if (contact.status === 'unsupported') {
        toast.error('Phone book is available on supported mobile browsers.');
        return;
      }
      if (contact.status === 'cancelled') return;
      if (contact.status === 'no-phone') {
        toast.error('Selected contact has no phone number.');
        return;
      }

      applyContact(contact);
      toast.success('Contact selected.');
    } catch (_) {
      toast.error('Could not open phone book.');
    }
  };

  const handleUseTypedContact = () => {
    const searchValue = query.trim();
    const searchHasDigits = /\d/.test(searchValue);
    const searchHasLetters = /[a-z]/i.test(searchValue);
    const name = typedName.trim() || (searchHasLetters && !searchHasDigits ? searchValue : '');
    const phone = typedPhone.trim() || (searchHasDigits ? searchValue : '');

    if (!name && !phone) {
      toast.error('Enter a name or phone number.');
      return;
    }

    applyContact({ name, phone });
  };

  return (
    <div className="phone-contact-sheet" role="dialog" aria-modal="true" aria-labelledby="phone-contact-title">
      <button type="button" className="phone-contact-sheet__backdrop" aria-label="Close phone book" onClick={onClose} />
      <section className="phone-contact-sheet__panel">
        <header className="phone-contact-sheet__header">
          <button type="button" className="phone-contact-sheet__icon-button" onClick={onClose} aria-label="Close phone book">
            <FaTimes aria-hidden />
          </button>
          <h2 id="phone-contact-title">Phone book</h2>
          <button type="button" className="phone-contact-sheet__icon-button" onClick={handlePickNativeContact} aria-label="Open phone book">
            <FaAddressBook aria-hidden />
          </button>
        </header>

        <label className="phone-contact-sheet__search">
          <FaSearch aria-hidden />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Enter number or contact name"
            inputMode="search"
          />
        </label>

        <div className="phone-contact-sheet__manual">
          <label>
            <span>Contact name</span>
            <input
              type="text"
              value={typedName}
              onChange={(event) => setTypedName(event.target.value)}
              placeholder="e.g. Saad Ahmed"
            />
          </label>
          <label>
            <span>Mobile number</span>
            <input
              type="tel"
              value={typedPhone}
              onChange={(event) => setTypedPhone(event.target.value)}
              placeholder="+92 3xxxxxxxxx"
            />
          </label>
          <button type="button" className="phone-contact-sheet__use-button" onClick={handleUseTypedContact}>
            <FaCheck aria-hidden />
            <span>Use contact</span>
          </button>
        </div>

        <div className="phone-contact-sheet__list" aria-label="Saved contacts">
          {filteredContacts.map((contact) => (
            <button
              type="button"
              key={contact.id}
              className="phone-contact-sheet__contact"
              onClick={() => applyContact(contact)}
            >
              <span className="phone-contact-sheet__avatar">
                {contact.name ? contact.name[0]?.toUpperCase() : <FaUser aria-hidden />}
              </span>
              <span className="phone-contact-sheet__contact-copy">
                <strong>{contact.name || 'Unnamed contact'}</strong>
                {contact.phone && <small>{contact.phone}</small>}
              </span>
              <FaPhoneAlt aria-hidden />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
