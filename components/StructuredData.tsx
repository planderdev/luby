import { getSiteUrl } from "@/lib/seo/site";
import { dictionaries, htmlLangAttr, type Locale } from "@/lib/i18n";

/**
 * JSON-LD structured data — helps Google understand the site and produce
 * rich results (sitelinks, knowledge panel, software card).
 *
 * Render once per landing page. Don't include on dashboard/auth.
 */
export function StructuredData({ locale }: { locale: Locale }) {
  const url = getSiteUrl();
  const dict = dictionaries[locale];
  const name = dict.meta.brand;
  const description = dict.meta.description;
  const inLanguage = htmlLangAttr[locale];

  // Organization — appears in knowledge panel + sitelinks
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    legalName: name,
    url,
    logo: `${url}/logo.png`,
    image: `${url}/og.png`,
    description,
    email: "contact@plander.io",
    sameAs: [] as string[],
  };

  // WebSite — enables sitelinks search box
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    alternateName: ["Luby", "Luby AI", "루비AI", "루비 AI"],
    url,
    description,
    inLanguage,
    publisher: {
      "@type": "Organization",
      name,
      logo: `${url}/logo.png`,
    },
  };

  // SoftwareApplication — describes the SaaS itself
  const software = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "MarketingApplication",
    operatingSystem: "Web",
    description,
    url,
    inLanguage,
    offers: [
      {
        "@type": "Offer",
        name: "FREE",
        price: "0",
        priceCurrency: "KRW",
        description: dict.pricing.plans[0].desc,
      },
      {
        "@type": "Offer",
        name: "BUSINESS",
        price: "1800000",
        priceCurrency: "KRW",
        description: dict.pricing.plans[1].desc,
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: "1800000",
          priceCurrency: "KRW",
          billingDuration: "P1M",
          unitText: "MONTH",
        },
      },
      {
        "@type": "Offer",
        name: "ENTERPRISE",
        priceCurrency: "KRW",
        description: dict.pricing.plans[2].desc,
      },
    ],
    audience: {
      "@type": "BusinessAudience",
      audienceType: dict.audience,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(software) }}
      />
    </>
  );
}
