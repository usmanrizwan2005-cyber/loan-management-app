// Seed subset for immediate UI; replaced at runtime by usePhoneCountries when online
export const phoneCountries = [
  { code: "PK", name: "Pakistan", dialCode: "92", flag: "🇵🇰" },
  { code: "IN", name: "India", dialCode: "91", flag: "🇮🇳" },
  { code: "BD", name: "Bangladesh", dialCode: "880", flag: "🇧🇩" },
  { code: "LK", name: "Sri Lanka", dialCode: "94", flag: "🇱🇰" },
  { code: "NP", name: "Nepal", dialCode: "977", flag: "🇳🇵" },
  { code: "AF", name: "Afghanistan", dialCode: "93", flag: "🇦🇫" },

  { code: "US", name: "United States", dialCode: "1", flag: "🇺🇸" },
  { code: "CA", name: "Canada", dialCode: "1", flag: "🇨🇦" },
  { code: "MX", name: "Mexico", dialCode: "52", flag: "🇲🇽" },
  { code: "BR", name: "Brazil", dialCode: "55", flag: "🇧🇷" },
  { code: "AR", name: "Argentina", dialCode: "54", flag: "🇦🇷" },
  { code: "CL", name: "Chile", dialCode: "56", flag: "🇨🇱" },

  { code: "GB", name: "United Kingdom", dialCode: "44", flag: "🇬🇧" },
  { code: "IE", name: "Ireland", dialCode: "353", flag: "🇮🇪" },
  { code: "DE", name: "Germany", dialCode: "49", flag: "🇩🇪" },
  { code: "FR", name: "France", dialCode: "33", flag: "🇫🇷" },
  { code: "ES", name: "Spain", dialCode: "34", flag: "🇪🇸" },
  { code: "IT", name: "Italy", dialCode: "39", flag: "🇮🇹" },
  { code: "NL", name: "Netherlands", dialCode: "31", flag: "🇳🇱" },
  { code: "BE", name: "Belgium", dialCode: "32", flag: "🇧🇪" },
  { code: "SE", name: "Sweden", dialCode: "46", flag: "🇸🇪" },
  { code: "NO", name: "Norway", dialCode: "47", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", dialCode: "45", flag: "🇩🇰" },
  { code: "FI", name: "Finland", dialCode: "358", flag: "🇫🇮" },
  { code: "CH", name: "Switzerland", dialCode: "41", flag: "🇨🇭" },
  { code: "AT", name: "Austria", dialCode: "43", flag: "🇦🇹" },
  { code: "PT", name: "Portugal", dialCode: "351", flag: "🇵🇹" },
  { code: "PL", name: "Poland", dialCode: "48", flag: "🇵🇱" },
  { code: "RO", name: "Romania", dialCode: "40", flag: "🇷🇴" },

  { code: "SA", name: "Saudi Arabia", dialCode: "966", flag: "🇸🇦" },
  { code: "AE", name: "United Arab Emirates", dialCode: "971", flag: "🇦🇪" },
  { code: "QA", name: "Qatar", dialCode: "974", flag: "🇶🇦" },
  { code: "KW", name: "Kuwait", dialCode: "965", flag: "🇰🇼" },
  { code: "BH", name: "Bahrain", dialCode: "973", flag: "🇧🇭" },
  { code: "OM", name: "Oman", dialCode: "968", flag: "🇴🇲" },

  { code: "SG", name: "Singapore", dialCode: "65", flag: "🇸🇬" },
  { code: "MY", name: "Malaysia", dialCode: "60", flag: "🇲🇾" },
  { code: "TH", name: "Thailand", dialCode: "66", flag: "🇹🇭" },
  { code: "PH", name: "Philippines", dialCode: "63", flag: "🇵🇭" },
  { code: "ID", name: "Indonesia", dialCode: "62", flag: "🇮🇩" },
  { code: "VN", name: "Vietnam", dialCode: "84", flag: "🇻🇳" },
  { code: "CN", name: "China", dialCode: "86", flag: "🇨🇳" },
  { code: "HK", name: "Hong Kong", dialCode: "852", flag: "🇭🇰" },
  { code: "JP", name: "Japan", dialCode: "81", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", dialCode: "82", flag: "🇰🇷" },

  { code: "NG", name: "Nigeria", dialCode: "234", flag: "🇳🇬" },
  { code: "KE", name: "Kenya", dialCode: "254", flag: "🇰🇪" },
  { code: "GH", name: "Ghana", dialCode: "233", flag: "🇬🇭" },
  { code: "TZ", name: "Tanzania", dialCode: "255", flag: "🇹🇿" },
  { code: "ZA", name: "South Africa", dialCode: "27", flag: "🇿🇦" },
];

export const findCountryByDialPrefix = (phone) => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  // Match the longest dial code prefix
  const sorted = [...phoneCountries].sort(
    (a, b) => b.dialCode.length - a.dialCode.length
  );
  return sorted.find((c) => digits.startsWith(c.dialCode)) || null;
};

export const formatWithDialCode = (country, raw) => {
  const digits = String(raw || "").replace(/\D/g, "");
  const withoutPrefix = country
    ? digits.replace(new RegExp("^" + country.dialCode), "")
    : digits;
  return country
    ? `+${country.dialCode}${withoutPrefix ? " " + withoutPrefix : ""}`
    : raw || "";
};

export const validateInternationalPhone = (country, value) => {
  if (!value) return { ok: true };
  const cleaned = String(value).replace(/\s+/g, "");
  const startsWith = country
    ? cleaned.startsWith("+" + country.dialCode)
    : /^\+\d+$/.test(cleaned);
  const digits = cleaned.replace(/\D/g, "");
  const len = digits.length;
  const ok = startsWith && len >= 8 && len <= 15;
  return { ok, reason: ok ? "" : "Invalid phone number format" };
};
