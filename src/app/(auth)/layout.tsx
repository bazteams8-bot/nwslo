import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-creme px-4 py-12">
      <Link href="/" className="mb-8">
        <Logo taille={36} />
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-bord bg-white p-6 shadow-sm sm:p-8">
        {children}
      </div>
    </div>
  );
}
