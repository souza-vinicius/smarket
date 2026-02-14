import { type MonthGroup } from "@/hooks/use-grouped-invoices";
import { formatCurrency } from "@/lib/utils";

interface MonthSeparatorProps {
  monthGroup: MonthGroup;
  isSticky?: boolean;
}

export function MonthSeparator({
  monthGroup,
  isSticky = true,
}: MonthSeparatorProps) {
  const { monthLabel, totalValue, invoiceCount } = monthGroup;
  const invoiceLabel = invoiceCount === 1 ? "nota" : "notas";

  return (
    <div
      className={`border-b border-gray-200 bg-gray-50 px-4 py-3 ${
        isSticky ? "sticky top-0 z-10" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{monthLabel}</h3>
        <span className="text-xs text-gray-600">
          {formatCurrency(totalValue)} • {invoiceCount} {invoiceLabel}
        </span>
      </div>
    </div>
  );
}
