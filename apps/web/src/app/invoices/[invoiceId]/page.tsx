import InvoiceDetailClient from "./invoice-detail";

export async function generateStaticParams() {
  return [{ invoiceId: "_" }];
}

export default function InvoiceDetailPage() {
  return <InvoiceDetailClient />;
}
