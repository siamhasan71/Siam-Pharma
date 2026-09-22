/**
 * Global Helper Function for Taka Format
 *
 * Formats any numeric value or string amount into standardized Bangladeshi Taka (৳).
 *
 * Usage Example:
 * Before: `$${item.price}`  --> Output: $10.50
 * After:  `৳${item.price}` or formatCurrency(item.price) --> Output: ৳10.50
 */
export const formatCurrency = (amount: number | string | null | undefined): string => {
  const numericAmount = Number(amount) || 0;
  return `৳${numericAmount.toFixed(2)}`;
};

export default formatCurrency;
