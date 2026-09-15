/**
 * Utility helper to format amounts in Kenyan Shillings (KSh) or arbitrary currency.
 */
export function formatCurrency(amount: number, currency = 'KSh'): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return `${currency} 0`;
  }
  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
