import { useEffect, useMemo, useState } from "react";
import { phoneCountries as seed } from "./phoneCountries";

const CACHE_KEY = "phoneCountries:v1";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

const toFlagEmoji = (countryCode) => {
  try {
    const codePoints = countryCode
      .toUpperCase()
      .split("")
      .map((c) => 127397 + c.charCodeAt());
    return String.fromCodePoint(...codePoints);
  } catch (_) {
    return "🏳️";
  }
};

export function usePhoneCountries() {
  const [countries, setCountries] = useState(seed);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // cache
        const cachedRaw = localStorage.getItem(CACHE_KEY);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (
            cached?.timestamp &&
            Date.now() - cached.timestamp < CACHE_TTL_MS &&
            Array.isArray(cached.data) &&
            cached.data.length > 0
          ) {
            if (!cancelled) setCountries(cached.data);
            return;
          }
        }

        setLoading(true);
        const res = await fetch(
          "https://restcountries.com/v3.1/all?fields=cca2,name,idd,flag"
        );
        if (!res.ok) throw new Error("Failed to load country list");
        const json = await res.json();
        const mapped = json
          .map((c) => {
            const code = c.cca2;
            const root = c?.idd?.root || "";
            const suffixes =
              Array.isArray(c?.idd?.suffixes) && c.idd.suffixes.length
                ? c.idd.suffixes
                : [""];
            const dial = (root + (suffixes[0] || "")).replace(/^\+/, "");
            if (!code || !dial) return null;
            return {
              code,
              name: c?.name?.common || code,
              dialCode: dial,
              flag: c?.flag || toFlagEmoji(code),
            };
          })
          .filter(Boolean)
          .sort((a, b) => a.name.localeCompare(b.name));

        if (!cancelled && mapped.length) {
          setCountries(mapped);
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ timestamp: Date.now(), data: mapped })
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

  const byDialCodeDesc = useMemo(() => {
    return [...countries].sort(
      (a, b) => (b.dialCode || "").length - (a.dialCode || "").length
    );
  }, [countries]);

  return { countries, loading, error, byDialCodeDesc };
}

