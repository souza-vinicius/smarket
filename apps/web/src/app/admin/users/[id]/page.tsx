import UserDetailClient from "./user-detail";

export const dynamicParams = true;

export async function generateStaticParams() {
  return [{ id: "_" }];
}

export default function UserDetailPage() {
  return <UserDetailClient />;
}
