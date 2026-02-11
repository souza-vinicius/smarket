import InvoiceReviewClient from "./invoice-review";

export async function generateStaticParams() {
  return [{ processingId: "_" }];
}

export default function InvoiceReviewPage() {
  return <InvoiceReviewClient />;
}
