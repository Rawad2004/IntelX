import { LanguageProvider } from "@/lib/i18n/LanguageProvider";

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
