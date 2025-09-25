import { useEffect, useMemo, useState } from "react";
import { currencies as seed } from "./currencies";

const CACHE_KEY = "allCurrencies:v1";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export function useCurrencies() {
  const [list, setList] = useState(seed);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const cachedRaw = localStorage.getItem(CACHE_KEY);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (
            cached?.timestamp &&
            Date.now() - cached.timestamp < CACHE_TTL_MS &&
            Array.isArray(cached.data) &&
            cached.data.length > 0
          ) {
            if (!cancelled) setList(cached.data);
            return;
          }
        }

        setLoading(true);
        const res = await fetch(
          "https://restcountries.com/v3.1/all?fields=currencies"
        );
        if (!res.ok) throw new Error("Failed to load currencies");
        const json = await res.json();

        // Build unique set { code, name, symbol }
        const map = new Map();
        for (const c of json) {
          const curr = c?.currencies || {};
          for (const code of Object.keys(curr)) {
            if (!code) continue;
            const info = curr[code] || {};
            if (!map.has(code)) {
              map.set(code, {
                code,
                name: info?.name || code,
                symbol: info?.symbol || "",
              });
            }
          }
        }
        const arr = Array.from(map.values()).sort((a, b) =>
          a.code.localeCompare(b.code)
        );
        if (!cancelled && arr.length) {
          setList(arr);
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ timestamp: Date.now(), data: arr })
          );
        }
      } catch (e) {
        if (!cancelled) setError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const codes = useMemo(() => list.map((c) => c.code), [list]);

  return { currencies: list, codes, loading, error };
}

