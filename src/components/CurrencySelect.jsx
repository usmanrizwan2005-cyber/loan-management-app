import { useEffect, useMemo, useRef, useState } from 'react';

export default function CurrencySelect({
  currencies,
  value,
  valueCode,
  onChange,
  filter = '',
  onFilterChange,
  buttonClassName = 'input min-w-[10rem] w-full flex items-center justify-between gap-2 text-left cursor-pointer font-medium',
  listClassName = 'absolute z-30 mt-2 w-full max-h-64 overflow-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl',
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const items = useMemo(() => {
    const list = Array.isArray(currencies) ? currencies : [];
    if (!filter) return list;
    const query = filter.toLowerCase();
    return list.filter((currency) =>
      (currency.code + ' ' + (currency.name || '') + ' ' + (currency.symbol || ''))
        .toLowerCase()
        .includes(query)
    );
  }, [currencies, filter]);

  const selected = useMemo(() => {
    if (value) return value;
    return (currencies || []).find((currency) => currency.code === valueCode) || null;
  }, [currencies, value, valueCode]);

  useEffect(() => {
    const handleClick = (event) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className={buttonClassName}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">
          {selected
            ? `${selected.code}${selected.symbol ? ` (${selected.symbol})` : ''}`
            : 'Select currency'}
        </span>
        <span className="text-xs text-[var(--color-muted)]">{selected ? selected.name : ''}</span>
      </button>

      {open && (
        <div className={listClassName} role="listbox">
          <div className="sticky top-0 border-b border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <input
              type="text"
              value={filter}
              onChange={(event) => onFilterChange && onFilterChange(event.target.value)}
              placeholder="Search currency..."
              className="input"
              aria-label="Search currency"
            />
          </div>
          <ul className="divide-y divide-[var(--color-border)]">
            {items.map((currency) => (
              <li key={currency.code}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    valueCode === currency.code
                      ? 'bg-[var(--color-primary)]/10 text-[var(--color-heading)]'
                      : 'hover:bg-[var(--color-primary)]/5'
                  }`}
                  onClick={() => {
                    onChange && onChange(currency);
                    setOpen(false);
                  }}
                  role="option"
                  aria-selected={valueCode === currency.code}
                >
                  <span className="font-mono text-sm font-semibold">{currency.code}</span>
                  <span className="truncate text-sm text-[var(--color-muted)]">{currency.name}</span>
                  {currency.symbol && (
                    <span className="ml-auto text-xs text-[var(--color-muted)]">{currency.symbol}</span>
                  )}
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
