import InvoiceEditClient from "./invoice-edit";

export async function generateStaticParams() {
  return [{ invoiceId: "_" }];
}

export default function InvoiceEditPage() {
  return <InvoiceEditClient />;
}
