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
// ... (keep the existing formatDate and getStatusColor functions)

// ADD THIS NEW FUNCTION
export const formatCurrency = (amount, currencyCode) => {
  // Use a default currency if none is provided
  const code = currencyCode || "USD";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
  }).format(amount);
};
