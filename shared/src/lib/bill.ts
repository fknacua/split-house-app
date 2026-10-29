/**
 * The utility bill line items View bill shows, in display order. The parser only reads
 * lines whose label is in this list; everything else on the bill is ignored.
 */
export const UTIL_BILL_LINE_LABELS = ['Electricity', 'Gas', 'Water'] as const;
