"use client";

import { useRef, useCallback, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { useVirtualizer } from "@tanstack/react-virtual";

import { type VirtualItem } from "@/hooks/use-grouped-invoices";
import { dynamicRoute } from "@/lib/dynamic-params";

import { InvoiceCard } from "./invoice-card";
import { MonthSeparator } from "./month-separator";


interface VirtualizedInvoiceListProps {
  items: VirtualItem[];
}

export function VirtualizedInvoiceList({ items }: VirtualizedInvoiceListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [containerHeight, setContainerHeight] = useState(600);

  // Update container height on mount and resize
  useEffect(() => {
    const updateHeight = () => {
      if (parentRef.current) {
        // Calculate available height within the page
        const parentElement = parentRef.current;
        const viewportHeight = window.innerHeight;
        const elementTop = parentElement.getBoundingClientRect().top;
        const availableHeight = Math.max(400, viewportHeight - elementTop - 80); // 80px for padding
        setContainerHeight(availableHeight);
      }
    };

    updateHeight();
    const timer = setTimeout(updateHeight, 100);
    window.addEventListener("resize", updateHeight);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  // Initialize virtualizer with estimated sizes
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = items[index];
      // Headers are 56px + padding, invoices are 88px + padding
      return item.type === "header" ? 68 : 100;
    },
    overscan: 5, // Render 5 items above/below viewport for smoothness
  });

  const virtualItems = virtualizer.getVirtualItems();

  const handleInvoiceClick = useCallback(
    (invoiceId: string) => {
      router.push(dynamicRoute("/invoices", invoiceId));
    },
    [router]
  );

  // Early return for empty list
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      ref={parentRef}
      className="w-full overflow-y-auto rounded-lg border border-border"
      style={{
        height: `${containerHeight}px`,
        contain: "layout style paint",
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index];

          return (
            <div
              key={item.id}
              style={{
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className="absolute inset-x-0 top-0 w-full"
            >
              {item.type === "header" ? (
                <MonthSeparator
                  monthGroup={item.data}
                  isSticky={true}
                />
              ) : (
                <div className="px-2 py-1 sm:px-4 sm:py-2">
                  <InvoiceCard
                    invoice={item.data}
                    onClick={() => { handleInvoiceClick(item.data.id); }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
