import { useMemo } from "react";

import { type InvoiceList } from "@/types";

export interface MonthGroup {
  monthKey: string; // "2026-02"
  monthLabel: string; // "Fevereiro de 2026"
  totalValue: number; // Sum of total_value
  invoiceCount: number; // Number of invoices
  invoices: InvoiceList[]; // Invoices for this month
}

export type VirtualItem =
  | { type: "header"; id: string; data: MonthGroup }
  | { type: "invoice"; id: string; data: InvoiceList };

/**
 * Groups invoices by month (YYYY-MM) extracted from issue_date.
 * Returns a flattened array suitable for virtualized rendering:
 * [header, invoice, invoice, header, invoice, ...]
 */
export function useGroupedInvoices(invoices: InvoiceList[]): VirtualItem[] {
  return useMemo(() => {
    if (!invoices || invoices.length === 0) {
      return [];
    }

    // Group invoices by month key (YYYY-MM)
    const monthMap = new Map<string, InvoiceList[]>();

    invoices.forEach((invoice) => {
      // Extract YYYY-MM from issue_date (handles ISO format with T separator)
      const dateStr = invoice.issue_date.split("T")[0];
      const [year, month] = dateStr.split("-");
      const monthKey = `${year}-${month}`;

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, []);
      }
      monthMap.get(monthKey)!.push(invoice);
    });

    // Convert to array of [monthKey, invoices] pairs and sort DESC by monthKey
    const sortedMonths = Array.from(monthMap.entries()).sort(
      (a, b) => b[0].localeCompare(a[0])
    );

    // Build flattened array with headers and invoices
    const items: VirtualItem[] = [];

    sortedMonths.forEach(([monthKey, monthInvoices]) => {
      // Create month label "Fevereiro de 2026"
      const [year, monthNum] = monthKey.split("-");
      const monthIndex = parseInt(monthNum, 10) - 1;
      const monthName = new Date(parseInt(year, 10), monthIndex, 1)
        .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
        .replace(/^\w/, (c) => c.toUpperCase()); // Capitalize first letter

      // Calculate totals for the month
      const totalValue = monthInvoices.reduce(
        (sum, inv) => sum + inv.total_value,
        0
      );
      const invoiceCount = monthInvoices.length;

      // Create month group
      const monthGroup: MonthGroup = {
        monthKey,
        monthLabel: monthName,
        totalValue,
        invoiceCount,
        invoices: monthInvoices,
      };

      // Add header
      items.push({
        type: "header",
        id: `header-${monthKey}`,
        data: monthGroup,
      });

      // Add invoices for this month
      monthInvoices.forEach((invoice) => {
        items.push({
          type: "invoice",
          id: invoice.id,
          data: invoice,
        });
      });
    });

    return items;
  }, [invoices]);
}
