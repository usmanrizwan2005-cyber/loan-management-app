const SAVED_CONTACTS_KEY = 'loanAppPhoneContacts';

const normalizeSavedContact = (contact) => {
  const name = String(contact?.name || '').trim();
  const phone = String(contact?.phone || '').trim();
  if (!name && !phone) return null;

  return {
    id: String(contact?.id || phone.replace(/\D/g, '') || name.toLowerCase()),
    name,
    phone,
  };
};

export const loadSavedPhoneContacts = () => {
  if (typeof localStorage === 'undefined') return [];

  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_CONTACTS_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.map(normalizeSavedContact).filter(Boolean)
      : [];
  } catch (_) {
    return [];
  }
};

export const savePhoneContact = (contact) => {
  const nextContact = normalizeSavedContact(contact);
  if (!nextContact || typeof localStorage === 'undefined') return nextContact;

  const existing = loadSavedPhoneContacts();
  const nextPhoneKey = nextContact.phone.replace(/\D/g, '');
  const nextNameKey = nextContact.name.toLowerCase();
  const filtered = existing.filter((item) => {
    const itemPhoneKey = item.phone.replace(/\D/g, '');
    const itemNameKey = item.name.toLowerCase();
    const samePhone = nextPhoneKey && itemPhoneKey === nextPhoneKey;
    const sameName = nextNameKey && itemNameKey === nextNameKey;
    return !samePhone && !sameName;
  });

  const saved = [nextContact, ...filtered].slice(0, 24);
  localStorage.setItem(SAVED_CONTACTS_KEY, JSON.stringify(saved));
  return nextContact;
};

export const isContactPickerSupported = () =>
  typeof navigator !== 'undefined' &&
  Boolean(navigator.contacts) &&
  typeof navigator.contacts.select === 'function';

export const pickPhoneContact = async () => {
  if (!isContactPickerSupported()) {
    return { status: 'unsupported' };
  }

  try {
    const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: false });
    const contact = Array.isArray(contacts) ? contacts[0] : null;
    const rawPhone = Array.isArray(contact?.tel) ? contact.tel.find(Boolean) : contact?.tel;
    const rawName = Array.isArray(contact?.name) ? contact.name.find(Boolean) : contact?.name;

    if (!rawPhone) {
      return { status: 'no-phone' };
    }

    return {
      status: 'selected',
      name: rawName ? String(rawName) : '',
      phone: String(rawPhone),
    };
  } catch (error) {
    if (error?.name === 'AbortError' || error?.name === 'NotAllowedError') {
      return { status: 'cancelled' };
    }

    throw error;
  }
};
