import { requireOwner } from "@/lib/owner";

export const metadata = { title: "Admin · LabIA" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireOwner();
  return children;
}
