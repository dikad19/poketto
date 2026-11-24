export const DEFAULT_CATEGORIES = [
  // Income
  { name: "Salary", type: "INCOME", icon: "briefcase", isEssential: false },
  {
    name: "Bonus & Allowances",
    type: "INCOME",
    icon: "gift",
    isEssential: false,
  },
  {
    name: "Business Income",
    type: "INCOME",
    icon: "storefront",
    isEssential: false,
  },
  {
    name: "Investment Returns",
    type: "INCOME",
    icon: "chart-line",
    isEssential: false,
  },
  { name: "Freelance", type: "INCOME", icon: "laptop", isEssential: false },
  { name: "Rental Income", type: "INCOME", icon: "house", isEssential: false },
  {
    name: "Other Income",
    type: "INCOME",
    icon: "cash-plus",
    isEssential: false,
  },

  // Essential Expenses
  { name: "Housing", type: "EXPENSE", icon: "home", isEssential: true },
  {
    name: "Groceries",
    type: "EXPENSE",
    icon: "shopping-cart",
    isEssential: true,
  },
  {
    name: "Bills & Utilities",
    type: "EXPENSE",
    icon: "zap",
    isEssential: true,
  },
  { name: "Transportation", type: "EXPENSE", icon: "bus", isEssential: true },
  {
    name: "Healthcare",
    type: "EXPENSE",
    icon: "stethoscope",
    isEssential: true,
  },
  {
    name: "Education",
    type: "EXPENSE",
    icon: "graduation-cap",
    isEssential: true,
  },
  {
    name: "Debt & Installments",
    type: "EXPENSE",
    icon: "receipt",
    isEssential: true,
  },
  {
    name: "Insurance",
    type: "EXPENSE",
    icon: "shield-check",
    isEssential: true,
  },

  // Non-Essential Expenses
  { name: "Dining Out", type: "EXPENSE", icon: "utensils", isEssential: false },
  {
    name: "Entertainment",
    type: "EXPENSE",
    icon: "clapperboard",
    isEssential: false,
  },
  {
    name: "Shopping",
    type: "EXPENSE",
    icon: "shopping-bag",
    isEssential: false,
  },
  { name: "Subscriptions", type: "EXPENSE", icon: "tv", isEssential: false },
  {
    name: "Gifts & Donations",
    type: "EXPENSE",
    icon: "hand-heart",
    isEssential: false,
  },
  { name: "Personal Care", type: "EXPENSE", icon: "heart", isEssential: false },
  {
    name: "Travel & Vacation",
    type: "EXPENSE",
    icon: "plane",
    isEssential: false,
  },
  { name: "Hobbies", type: "EXPENSE", icon: "gamepad-2", isEssential: false },
  {
    name: "Other Expenses",
    type: "EXPENSE",
    icon: "circle-ellipsis",
    isEssential: false,
  },
] as const;
