/**
 * Currency Utility Functions for Indian Rupee (INR) Formatting
 * 
 * This module provides comprehensive currency formatting utilities
 * specifically designed for the Indian market, replacing all $ symbols
 * with ₹ symbols and implementing proper INR formatting conventions.
 */

// Indian Rupee formatting configuration
const INR_LOCALE = 'en-IN';
const INR_CURRENCY = 'INR';

/**
 * Format amount as Indian Rupee with proper locale formatting
 * @param amount - The amount to format
 * @param options - Formatting options
 * @returns Formatted currency string with ₹ symbol
 */
export const formatCurrency = (
  amount: number | null | undefined,
  options: {
    showDecimals?: boolean;
    showSymbol?: boolean;
    compact?: boolean;
    style?: 'currency' | 'decimal';
  } = {}
): string => {
  const {
    showDecimals = false,
    showSymbol = true,
    compact = false,
    style = 'currency'
  } = options;

  // Handle null/undefined values
  if (amount === null || amount === undefined || isNaN(amount)) {
    return showSymbol ? '₹0' : '0';
  }

  // Handle compact formatting for large numbers
  if (compact && Math.abs(amount) >= 100000) {
    return formatCompactCurrency(amount, showSymbol);
  }

  try {
    const formatter = new Intl.NumberFormat(INR_LOCALE, {
      style: style,
      currency: INR_CURRENCY,
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0,
    });

    let formatted = formatter.format(amount);
    
    // If we don't want the symbol for decimal style, remove it
    if (style === 'decimal' && !showSymbol) {
      return formatted;
    }
    
    // If we want symbol but using decimal style, add it manually
    if (style === 'decimal' && showSymbol) {
      return `₹${formatted}`;
    }

    return formatted;
  } catch (error) {
    console.error('Currency formatting error:', error);
    return showSymbol ? `₹${amount}` : `${amount}`;
  }
};

/**
 * Format compact currency for large amounts (Lakhs/Crores)
 * @param amount - The amount to format
 * @param showSymbol - Whether to show ₹ symbol
 * @returns Compact formatted currency string
 */
export const formatCompactCurrency = (
  amount: number,
  showSymbol: boolean = true
): string => {
  const absAmount = Math.abs(amount);
  const symbol = showSymbol ? '₹' : '';
  const sign = amount < 0 ? '-' : '';

  if (absAmount >= 10000000) { // 1 Crore
    const crores = (absAmount / 10000000).toFixed(2);
    return `${sign}${symbol}${crores}Cr`;
  } else if (absAmount >= 100000) { // 1 Lakh
    const lakhs = (absAmount / 100000).toFixed(2);
    return `${sign}${symbol}${lakhs}L`;
  } else if (absAmount >= 1000) { // 1 Thousand
    const thousands = (absAmount / 1000).toFixed(1);
    return `${sign}${symbol}${thousands}K`;
  }

  return formatCurrency(amount, { showSymbol, showDecimals: false });
};

/**
 * Format currency with explicit decimals
 * @param amount - The amount to format
 * @returns Formatted currency string with 2 decimal places
 */
export const formatCurrencyWithDecimals = (amount: number | null | undefined): string => {
  return formatCurrency(amount, { showDecimals: true });
};

/**
 * Format currency without symbol (for calculations display)
 * @param amount - The amount to format
 * @returns Formatted number string without ₹ symbol
 */
export const formatAmount = (amount: number | null | undefined): string => {
  return formatCurrency(amount, { showSymbol: false });
};

/**
 * Format currency for compact display in cards/lists
 * @param amount - The amount to format
 * @returns Compact formatted currency string
 */
export const formatCompact = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '₹0';
  return formatCurrency(amount, { compact: true });
};

/**
 * Parse currency string back to number
 * @param currencyString - Currency string with or without ₹ symbol
 * @returns Parsed number value
 */
export const parseCurrency = (currencyString: string): number => {
  if (!currencyString) return 0;
  
  // Remove ₹ symbol, commas, and other formatting
  const cleanString = currencyString
    .replace(/₹/g, '')
    .replace(/,/g, '')
    .replace(/\s/g, '')
    .trim();
  
  const parsed = parseFloat(cleanString);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Validate if a string represents a valid currency amount
 * @param currencyString - Currency string to validate
 * @returns Boolean indicating if valid
 */
export const isValidCurrency = (currencyString: string): boolean => {
  if (!currencyString) return false;
  
  const cleaned = currencyString.replace(/[₹,\s]/g, '');
  const amount = parseFloat(cleaned);
  
  return !isNaN(amount) && amount >= 0;
};

/**
 * Format rent amount with appropriate frequency suffix
 * @param amount - Rent amount
 * @param frequency - Rent frequency ('monthly', 'quarterly', 'yearly')
 * @returns Formatted rent string with frequency
 */
export const formatRent = (
  amount: number | null | undefined,
  frequency: 'monthly' | 'quarterly' | 'yearly' | string = 'monthly'
): string => {
  const formattedAmount = formatCurrency(amount);
  
  const frequencyMap: Record<string, string> = {
    monthly: '/month',
    quarterly: '/quarter',
    yearly: '/year',
    other: ''
  };
  
  const suffix = frequencyMap[frequency] || '';
  return `${formattedAmount}${suffix}`;
};

/**
 * Format deposit amount with context
 * @param amount - Deposit amount
 * @param rentAmount - Monthly rent for comparison
 * @returns Formatted deposit string with context
 */
export const formatDeposit = (
  amount: number | null | undefined,
  rentAmount?: number | null
): string => {
  const formattedAmount = formatCurrency(amount);
  
  if (rentAmount && amount && rentAmount > 0) {
    const months = Math.round(amount / rentAmount);
    if (months === 1) {
      return `${formattedAmount} (1 month)`;
    } else if (months > 1 && months <= 12) {
      return `${formattedAmount} (${months} months)`;
    }
  }
  
  return formattedAmount;
};

/**
 * Format income with appropriate suffix
 * @param amount - Income amount
 * @param period - Income period ('monthly', 'yearly')
 * @returns Formatted income string
 */
export const formatIncome = (
  amount: number | null | undefined,
  period: 'monthly' | 'yearly' = 'monthly'
): string => {
  const formattedAmount = formatCurrency(amount);
  const suffix = period === 'monthly' ? '/month' : '/year';
  return `${formattedAmount}${suffix}`;
};

/**
 * Format maintenance fee
 * @param amount - Maintenance amount
 * @returns Formatted maintenance fee string
 */
export const formatMaintenanceFee = (amount: number | null | undefined): string => {
  if (!amount || amount === 0) {
    return 'Included';
  }
  return `${formatCurrency(amount)}/month`;
};

/**
 * Format payment status with amount
 * @param amount - Payment amount
 * @param status - Payment status
 * @returns Formatted payment status string
 */
export const formatPaymentStatus = (
  amount: number | null | undefined,
  status: 'pending' | 'paid' | 'overdue' | 'partial' | string
): string => {
  const formattedAmount = formatCurrency(amount);
  
  const statusMap: Record<string, string> = {
    pending: `${formattedAmount} (Pending)`,
    paid: `${formattedAmount} (Paid)`,
    overdue: `${formattedAmount} (Overdue)`,
    partial: `${formattedAmount} (Partial)`,
  };
  
  return statusMap[status] || formattedAmount;
};

/**
 * Convert dollar amounts to rupees (for migration purposes)
 * @param dollarAmount - Amount in dollars
 * @param exchangeRate - USD to INR exchange rate (default: 83)
 * @returns Amount in rupees
 */
export const convertDollarsToRupees = (
  dollarAmount: number,
  exchangeRate: number = 83
): number => {
  return Math.round(dollarAmount * exchangeRate);
};

/**
 * Format percentage as Indian style
 * @param percentage - Percentage value
 * @returns Formatted percentage string
 */
export const formatPercentage = (percentage: number | null | undefined): string => {
  if (percentage === null || percentage === undefined || isNaN(percentage)) {
    return '0%';
  }
  
  return new Intl.NumberFormat(INR_LOCALE, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(percentage / 100);
};

/**
 * Format number with Indian numbering system (Lakhs/Crores)
 * @param number - Number to format
 * @returns Formatted number string
 */
export const formatIndianNumber = (number: number | null | undefined): string => {
  if (number === null || number === undefined || isNaN(number)) {
    return '0';
  }
  
  return new Intl.NumberFormat(INR_LOCALE).format(number);
};

/**
 * Currency utility object for easy imports
 */
export const currency = {
  format: formatCurrency,
  formatWithDecimals: formatCurrencyWithDecimals,
  formatAmount,
  formatCompact,
  formatCompactCurrency,
  formatRent,
  formatDeposit,
  formatIncome,
  formatMaintenanceFee,
  formatPaymentStatus,
  formatPercentage,
  formatIndianNumber,
  parse: parseCurrency,
  isValid: isValidCurrency,
  convertFromDollars: convertDollarsToRupees,
};

export default currency; 