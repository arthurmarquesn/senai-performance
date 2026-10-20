
import { requireAcademicAccess } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAcademicAccess();

  return <>{children}</>;
}
