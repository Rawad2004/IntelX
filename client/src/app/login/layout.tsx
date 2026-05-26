import { LanguageProvider } from "@/lib/i18n/LanguageProvider";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
