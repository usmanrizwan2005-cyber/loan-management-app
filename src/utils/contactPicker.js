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
