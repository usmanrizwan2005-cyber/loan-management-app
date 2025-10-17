// Format date function
export const formatDate = (timestamp) => {
  if (!timestamp) return "N/A";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Convert Firestore Timestamp | Date | string | number to a JS Date safely
export const toJSDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === "function") {
    return value.toDate();
  }
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
};

// Get status color function aligned with app statuses
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
  let resolvedLocale = locale;
  if (!resolvedLocale && typeof window !== "undefined") {
    resolvedLocale = localStorage.getItem("currencyLocale") || undefined;
  }
  try {
    const formatted = new Intl.NumberFormat(resolvedLocale || "en-US", {
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

// Calculate totals, remaining, and effective paid status for a loan
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
    (p) => p && (p.type === "partial" || p.type === "adjustment")
  );
  const parseDate = (d) =>
    typeof d?.toDate === "function" ? d.toDate() : new Date(d);

  const partialsTotal = relevant.reduce((sum, p) => {
    const amt =
      typeof p.amount === "number" ? p.amount : parseFloat(p.amount || 0);
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  const hasRepaidAt = !!loan.repaidAt;
  const totalPaid = hasRepaidAt
    ? amountNum
    : Math.min(partialsTotal, amountNum);
  const remaining = Math.max(amountNum - totalPaid, 0);

  const latestPartialPaidAt = relevant.length
    ? new Date(Math.max(...relevant.map((p) => parseDate(p.paidAt).getTime())))
    : null;

  const effectivePaidAt = loan.repaidAt || latestPartialPaidAt;
  const isEffectivelyPaid = hasRepaidAt || remaining === 0;

  let onTimeVsLate = null;
  try {
    const due = parseDate(loan.dueDate);
    const paid = effectivePaidAt ? parseDate(effectivePaidAt) : null;
    if (isEffectivelyPaid && paid && due) {
      onTimeVsLate = paid <= due ? "on-time" : "late";
    }
  } catch (_) {
    onTimeVsLate = null;
  }

  return {
    totalPaid,
    remaining,
    isEffectivelyPaid,
    effectivePaidAt,
    onTimeVsLate,
  };
};
