const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RELEVANT_PAYMENT_TYPES = new Set(["partial", "adjustment", "full"]);

const pad = (value) => String(value).padStart(2, "0");

const resolveLocale = (locale) => {
  if (locale) return locale;
  if (typeof window === "undefined") return "en-US";
  return localStorage.getItem("currencyLocale") || navigator.language || "en-US";
};

const getDateOnlyParts = (value) => {
  const match = DATE_ONLY_PATTERN.exec(String(value || "").trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(year, month - 1, day);
  if (
    Number.isNaN(candidate.getTime()) ||
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
};

const toUtcDayNumber = (value) => {
  const date = toDayStart(value);
  if (!date) return null;
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
};

export const isDateOnlyValue = (value) => Boolean(getDateOnlyParts(value));

export const formatDateInputValue = (value) => {
  if (!value && value !== 0) return "";

  const parts = getDateOnlyParts(value);
  if (parts) {
    return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
  }

  const date = toJSDate(value);
  if (!date) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

// Convert Firestore Timestamp | Date | string | number to a JS Date safely.
// Date-only strings are treated as local calendar days to avoid timezone shifts.
export const toJSDate = (value) => {
  if (!value && value !== 0) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value?.toDate === "function") {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parts = getDateOnlyParts(value);
  if (parts) {
    return new Date(parts.year, parts.month - 1, parts.day);
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const toDayStart = (value) => {
  const date = toJSDate(value);
  if (!date) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const getTodayDateValue = () => formatDateInputValue(new Date());

export const getDayDifference = (target, reference = new Date()) => {
  const targetDay = toUtcDayNumber(target);
  const referenceDay = toUtcDayNumber(reference);
  if (targetDay === null || referenceDay === null) return null;
  return Math.round((targetDay - referenceDay) / MS_PER_DAY);
};

export const formatDate = (value, locale) => {
  if (!value) return "N/A";
  const date = toJSDate(value);
  if (!date) return "N/A";
  return date.toLocaleDateString(resolveLocale(locale), {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Get status color function aligned with app statuses.
export const getStatusColor = (status) => {
  const normalized = (status || "").toLowerCase();
  const colors = {
    pending: "bg-yellow-100 text-yellow-800",
    "on-time": "bg-green-100 text-green-800",
    late: "bg-red-100 text-red-800",
    paid: "bg-green-100 text-green-800",
  };
  return colors[normalized] || "bg-gray-100 text-gray-800";
};

export const formatCurrency = (amount, currencyCode, locale) => {
  const code = currencyCode || "USD";
  const resolvedLocale = resolveLocale(locale);
  try {
    const formatted = new Intl.NumberFormat(resolvedLocale, {
      style: "currency",
      currency: code,
      currencyDisplay: "code",
      maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : Number(amount || 0));
    return formatted.replace(/\u00A0/g, " ");
  } catch (_) {
    return `${code} ${Number(amount || 0).toFixed(2)}`;
  }
};

export const sumPaymentHistory = (history) => {
  const entries = Array.isArray(history) ? history : [];
  return entries
    .filter((entry) => entry && RELEVANT_PAYMENT_TYPES.has(entry.type || "partial"))
    .reduce((sum, entry) => {
      const amount =
        typeof entry.amount === "number" ? entry.amount : parseFloat(entry.amount || 0);
      return sum + (Number.isNaN(amount) ? 0 : amount);
    }, 0);
};

// Calculate totals, remaining, and effective paid status for a loan.
export const calculateLoanPaymentState = (loan) => {
  if (!loan) {
    return {
      totalPaid: 0,
      remaining: 0,
      isEffectivelyPaid: false,
      effectivePaidAt: null,
      onTimeVsLate: null,
    };
  }

  const amountNum =
    typeof loan.amount === "number"
      ? loan.amount
      : parseFloat(loan.amount || 0) || 0;
  const history = Array.isArray(loan.paymentHistory) ? loan.paymentHistory : [];
  const relevant = history.filter(
    (entry) => entry && RELEVANT_PAYMENT_TYPES.has(entry.type || "partial")
  );

  const historyTotal = sumPaymentHistory(relevant);
  const hasRepaidAt = Boolean(loan.repaidAt);
  const totalPaid = hasRepaidAt
    ? amountNum
    : Math.min(Math.max(historyTotal, 0), amountNum);
  const remaining = Math.max(amountNum - totalPaid, 0);

  const paidAtTimes = relevant
    .map((entry) => toJSDate(entry.paidAt)?.getTime())
    .filter((time) => typeof time === "number" && !Number.isNaN(time));
  const latestRelevantPaidAt = paidAtTimes.length
    ? new Date(Math.max(...paidAtTimes))
    : null;

  const effectivePaidAt = loan.repaidAt || latestRelevantPaidAt;
  const isEffectivelyPaid = hasRepaidAt || remaining === 0;

  let onTimeVsLate = null;
  const due = toDayStart(loan.dueDate);
  const paid = toDayStart(effectivePaidAt);
  if (isEffectivelyPaid && due && paid) {
    onTimeVsLate = paid.getTime() <= due.getTime() ? "on-time" : "late";
  }

  return {
    totalPaid,
    remaining,
    isEffectivelyPaid,
    effectivePaidAt,
    onTimeVsLate,
  };
};

export const getLoanComputedState = (loan, referenceDate = new Date()) => {
  const paymentState = calculateLoanPaymentState(loan);
  const daysUntilDue = getDayDifference(loan?.dueDate, referenceDate);
  const isOverdue =
    !paymentState.isEffectivelyPaid &&
    typeof daysUntilDue === "number" &&
    daysUntilDue < 0;
  const isDueSoon =
    !paymentState.isEffectivelyPaid &&
    typeof daysUntilDue === "number" &&
    daysUntilDue >= 0 &&
    daysUntilDue <= 7;

  let status = "pending";
  if (paymentState.isEffectivelyPaid) {
    status = paymentState.onTimeVsLate || "paid";
  } else if (isOverdue || (!loan?.dueDate && loan?.status === "late")) {
    status = "late";
  }

  return {
    ...paymentState,
    status,
    daysUntilDue,
    isOverdue,
    isDueSoon,
  };
};
