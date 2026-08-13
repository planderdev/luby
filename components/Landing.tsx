import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { SocialProof } from "@/components/SocialProof";
import { AICapability } from "@/components/AICapability";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { Global } from "@/components/Global";
import { UseCases } from "@/components/UseCases";
import { Trust } from "@/components/Trust";
import { Pricing } from "@/components/Pricing";
import { FAQ } from "@/components/FAQ";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";
import { StructuredData } from "@/components/StructuredData";
import { HtmlLang } from "@/components/HtmlLang";
import { dictionaries, type Locale } from "@/lib/i18n";
import { extraDictionaries } from "@/lib/i18n/landing-extra";

export function Landing({ locale }: { locale: Locale }) {
  const dict = dictionaries[locale];
  const extra = extraDictionaries[locale];
  return (
    <>
      <HtmlLang locale={locale} />
      <StructuredData locale={locale} />
      <main className="relative">
        <Nav dict={dict.nav} locale={locale} />
        <Hero dict={dict.hero} />
        <SocialProof dict={dict.socialProof} />
        <AICapability dict={extra.aiCapability} />
        <Features dict={dict.features} />
        <HowItWorks dict={dict.howItWorks} />
        <Global dict={dict.global} />
        <UseCases dict={extra.useCases} />
        <Trust dict={extra.trust} />
        <Pricing dict={dict.pricing} />
        <FAQ dict={dict.faq} />
        <CTA dict={dict.cta} />
        <Footer dict={dict.footer} locale={locale} />
      </main>
    </>
  );
}
