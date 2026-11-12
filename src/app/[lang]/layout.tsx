import { RootProvider } from "fumadocs-ui/provider/next";
import { i18nProvider } from "fumadocs-ui/i18n";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { lang as rootLang } from "next/root-params";
import "../global.css";
import { Inter } from "next/font/google";
import { appName } from "@/lib/shared";
import { isLanguage, LANGUAGE_META, LANGUAGES, type Language } from "@/lib/i18n";
import { getT, SITE_DESCRIPTION, translations } from "@/lib/translations";

const inter = Inter({
  subsets: ["latin"],
});

export function generateStaticParams() {
  return LANGUAGES.map((lang) => ({ lang }));
}

async function resolveLanguage(): Promise<Language> {
  const lang = await rootLang();
  if (!isLanguage(lang)) notFound();
  return lang;
}

export async function generateMetadata(): Promise<Metadata> {
  const lang = await resolveLanguage();
  const t = getT(lang);
  const siteName = t(appName, { note: "site name" });

  return {
    metadataBase: process.env.VERCEL_PROJECT_PRODUCTION_URL ? new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) : undefined,
    title: {
      template: `%s | ${siteName}`,
      default: siteName,
    },
    description: t(SITE_DESCRIPTION, { note: "site description" }),
  };
}

export default async function Layout({ children }: LayoutProps<"/[lang]">) {
  const lang = await resolveLanguage();

  return (
    <html lang={LANGUAGE_META[lang].htmlLang} className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider i18n={i18nProvider(translations, lang)}>{children}</RootProvider>
      </body>
    </html>
  );
}
