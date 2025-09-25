import { useEffect, useMemo, useRef, useState } from 'react';

export default function CountrySelect({
  countries,
  value,
  valueCode,
  onChange,
  filter = '',
  onFilterChange,
  buttonClassName = 'input min-w-[12rem] w-full flex items-center justify-between gap-2 text-left cursor-pointer',
  listClassName = 'absolute z-30 mt-2 w-full max-h-64 overflow-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl',
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const items = useMemo(() => {
    const list = Array.isArray(countries) ? countries : [];
    if (!filter) return list;
    const query = filter.toLowerCase();
    return list.filter((country) =>
      (country.name + ' +' + country.dialCode + ' ' + country.code).toLowerCase().includes(query)
    );
  }, [countries, filter]);

  const selected = useMemo(() => {
    if (value) return value;
    return (countries || []).find((country) => country.code === valueCode) || null;
  }, [countries, value, valueCode]);

  useEffect(() => {
    const handleClick = (event) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const flagUrl = (code) => `https://flagcdn.com/24x18/${String(code || '').toLowerCase()}.png`;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className={buttonClassName}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          {selected ? (
            <img
              src={flagUrl(selected.code)}
              alt={selected.name}
              width={20}
              height={14}
              className="rounded-sm shadow-sm"
              loading="lazy"
            />
          ) : (
            <span className="text-[var(--color-muted)]">??</span>
          )}
          <span className="truncate">
            {selected ? `+${selected.dialCode}` : 'Select country'}
          </span>
        </div>
        <span className="text-xs text-[var(--color-muted)]">
          {selected ? selected.code : ''}
        </span>
      </button>

      {open && (
        <div className={listClassName} role="listbox">
          <div className="sticky top-0 border-b border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <input
              type="text"
              value={filter}
              onChange={(event) => onFilterChange && onFilterChange(event.target.value)}
              placeholder="Search country..."
              className="input"
              aria-label="Search country"
            />
          </div>
          <ul className="divide-y divide-[var(--color-border)]">
            {items.map((country) => (
              <li key={country.code}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    valueCode === country.code
                      ? 'bg-[var(--color-primary)]/10 text-[var(--color-heading)]'
                      : 'hover:bg-[var(--color-primary)]/5'
                  }`}
                  onClick={() => {
                    onChange && onChange(country);
                    setOpen(false);
                  }}
                  role="option"
                  aria-selected={valueCode === country.code}
                >
                  <img
                    src={flagUrl(country.code)}
                    alt={country.name}
                    width={20}
                    height={14}
                    className="rounded-sm shadow-sm flex-shrink-0"
                    loading="lazy"
                  />
                  <span className="font-medium text-[var(--color-heading)]">+{country.dialCode}</span>
                  <span className="ml-auto text-xs text-[var(--color-muted)]">{country.code}</span>
                </button>
              </li>
            ))}
            {items.length === 0 && (
              <li className="px-4 py-3 text-sm text-[var(--color-muted)]">No results</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
