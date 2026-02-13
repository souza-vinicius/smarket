import CouponDetailClient from "./coupon-detail";

export const dynamicParams = true;

export async function generateStaticParams() {
  return [{ id: "_" }];
}

export default function CouponDetailPage() {
  return <CouponDetailClient />;
}
