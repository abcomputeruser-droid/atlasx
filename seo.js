const seoQuery = (selector, scope = document) => scope.querySelector(selector);
const seoQueryAll = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const SEO_BRAND = "Atlas";
const SEO_SITE_URL = "https://www.atlascomparts.com";
const SEO_LOGO = "/assets/images/brand/atlas-logo.svg";
const SEO_PHONE = "+880 9600 123 456";
const SEO_EMAIL = "support@atlas.com";
const SEO_ADDRESS = {
  "@type": "PostalAddress",
  streetAddress: "Level 6, 123 Tech Avenue",
  addressLocality: "Dhaka",
  postalCode: "1205",
  addressCountry: "BD",
};

function seoAbsoluteUrl(path) {
  if (!path) return SEO_SITE_URL + "/";
  if (path.startsWith("http")) return path;
  return new URL(path, window.location.origin).toString();
}

function seoEnsureMeta(attribute, key, content) {
  if (!content) return null;

  let meta = seoQuery(`meta[${attribute}="${key}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attribute, key);
    document.head.appendChild(meta);
  }

  meta.setAttribute("content", content);
  return meta;
}

function seoResolveCanonical() {
  const existing = seoQuery('link[rel="canonical"]');
  const href = existing?.getAttribute("href") || window.location.pathname || "/";
  const absolute = href.startsWith("http") ? href : seoAbsoluteUrl(href);

  if (existing) {
    existing.setAttribute("href", absolute);
    return absolute;
  }

  const link = document.createElement("link");
  link.rel = "canonical";
  link.href = absolute;
  document.head.appendChild(link);
  return absolute;
}

function seoText(selector) {
  return seoQuery(selector)?.textContent?.trim() || "";
}

function seoPageName() {
  return (
    seoText("h1") ||
    document.title.replace(/^[\w\s]+ [–\-] /i, "").replace(/\s*\|.*$/, "").trim()
  );
}

function seoPageDescription() {
  return (
    seoQuery('meta[name="description"]')?.getAttribute("content") ||
    seoText("main p") ||
    ""
  );
}

function seoPageImage() {
  const image =
    seoQuery('meta[property="og:image"]')?.getAttribute("content") ||
    seoQuery("main img")?.getAttribute("src") ||
    SEO_LOGO;

  return seoAbsoluteUrl(image);
}

function seoPathName() {
  const path = window.location.pathname || "/";
  return path.toLowerCase();
}

function seoIsHomePage(path) {
  return path === "/" || path.endsWith("/index.html");
}

function seoPageType(path) {
  if (path.includes("/404")) return "404";
  if (path.includes("/support")) return "contact";
  if (path.includes("/about-atlas") || path.includes("/company")) return "about";
  if (path.includes("/monitor") || path.includes("/motherboard") || path.includes("/all-products")) {
    return "collection";
  }
  if (seoIsHomePage(path)) return "home";
  if (seoQuery('meta[property="og:type"]')?.getAttribute("content") === "product") return "product";
  return "page";
}

function seoProductCategory(path) {
  if (path.includes("monitor")) return { name: "Monitors", url: seoAbsoluteUrl("/monitors") };
  if (path.includes("motherboard") || path.includes("raven")) return { name: "Motherboards", url: seoAbsoluteUrl("/motherboards") };
  return null;
}

function seoExtractSpecs() {
  const specs = {};

  seoQueryAll(".specs-table tbody tr").forEach((row) => {
    const cells = seoQueryAll("td", row);
    if (cells.length < 2) return;
    specs[cells[0].textContent.trim()] = cells[1].textContent.trim();
  });

  return specs;
}

function seoParsePrice(value) {
  const match = value.match(/([\d,.]+)/);
  return match ? match[1].replace(/,/g, "") : "";
}

function seoWarrantyDuration(specs) {
  const fragments = Object.entries(specs).flatMap(([key, value]) => [key, value]);
  fragments.push(seoPageDescription());
  const text = fragments.join(" ");

  if (/1\s*to\s*3\s*year/i.test(text)) return "";
  if (/3[-\s]?year/i.test(text)) return "P3Y";
  if (/2[-\s]?year/i.test(text)) return "P2Y";
  if (/1[-\s]?year/i.test(text)) return "P1Y";
  return "";
}

function seoProductSchema(url, image, path) {
  const specs = seoExtractSpecs();
  const images = seoQueryAll(".gallery-grid img, .product-hero-card img")
    .map((img) => img.getAttribute("src"))
    .filter(Boolean)
    .map((src) => seoAbsoluteUrl(src));

  const priceText =
    specs.Price ||
    seoQueryAll(".hero-float span").find((node) => /BDT/i.test(node.textContent))?.textContent ||
    "";

  const availabilityText = specs.Availability || "In stock";
  const availability = /in stock/i.test(availabilityText)
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";

  const category = seoProductCategory(path);
  const warrantyDuration = seoWarrantyDuration(specs);
  const offers = {
    "@type": "Offer",
    url,
    priceCurrency: "BDT",
    price: seoParsePrice(priceText),
    availability,
    itemCondition: "https://schema.org/NewCondition",
    seller: {
      "@type": "Organization",
      name: SEO_BRAND,
    },
  };

  if (warrantyDuration) {
    offers.warranty = {
      "@type": "WarrantyPromise",
      durationOfWarranty: warrantyDuration,
      warrantyScope: "https://schema.org/LaborsAndParts",
    };
  }

  return {
    "@type": "Product",
    name: seoPageName(),
    description: seoPageDescription(),
    sku: specs.SKU || "",
    category: specs.Category || (category ? category.name : seoText(".eyebrow")),
    image: images.length ? images : [image],
    brand: {
      "@type": "Brand",
      name: SEO_BRAND,
    },
    offers,
  };
}

function seoBreadcrumbSchema(url, path, pageType) {
  const items = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: seoAbsoluteUrl("/"),
    },
  ];

  if (!seoIsHomePage(path) && pageType !== "404") {
    const category = pageType === "product" ? seoProductCategory(path) : null;

    if (category) {
      items.push({
        "@type": "ListItem",
        position: 2,
        name: category.name,
        item: category.url,
      });
      items.push({
        "@type": "ListItem",
        position: 3,
        name: seoPageName(),
        item: url,
      });
    } else {
      items.push({
        "@type": "ListItem",
        position: 2,
        name: seoPageName(),
        item: url,
      });
    }
  }

  return {
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

function seoWebPageSchema(url, image, pageType) {
  const base = {
    name: seoPageName(),
    description: seoPageDescription(),
    url,
    image,
    inLanguage: "en",
    isPartOf: { "@id": SEO_SITE_URL + "/#website" },
  };

  if (pageType === "home" || pageType === "collection") {
    return { "@type": "CollectionPage", ...base };
  }
  if (pageType === "about") {
    return { "@type": "AboutPage", ...base };
  }
  if (pageType === "contact") {
    return { "@type": "ContactPage", ...base };
  }

  return { "@type": "WebPage", ...base };
}

function seoOrganizationSchema() {
  return {
    "@type": "Organization",
    "@id": SEO_SITE_URL + "/#organization",
    name: SEO_BRAND,
    url: SEO_SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: seoAbsoluteUrl(SEO_LOGO),
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: SEO_PHONE,
      email: SEO_EMAIL,
      contactType: "customer support",
      availableLanguage: ["English", "Bengali"],
      areaServed: "BD",
    },
    address: SEO_ADDRESS,
    areaServed: "BD",
    sameAs: [],
  };
}

function seoInjectStructuredData(url, path, pageType) {
  const graph = [
    seoOrganizationSchema(),
    seoWebPageSchema(url, seoPageImage(), pageType),
    seoBreadcrumbSchema(url, path, pageType),
  ];

  if (pageType === "home") {
    graph.push({
      "@type": "WebSite",
      "@id": SEO_SITE_URL + "/#website",
      name: SEO_BRAND,
      url: SEO_SITE_URL,
      publisher: { "@id": SEO_SITE_URL + "/#organization" },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: SEO_SITE_URL + "/all-products?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    });
  }

  if (pageType === "product") {
    graph.push(seoProductSchema(url, seoPageImage(), path));
  }

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": graph,
  });
  document.head.appendChild(script);
}

document.addEventListener("DOMContentLoaded", () => {
  const path = seoPathName();
  const pageType = seoPageType(path);
  const url = seoResolveCanonical();
  const image = seoPageImage();
  const pageName = seoPageName();

  seoEnsureMeta("property", "og:url", url);
  seoEnsureMeta("property", "og:site_name", SEO_BRAND);
  seoEnsureMeta("property", "og:locale", "en_US");
  seoEnsureMeta("property", "og:image", image);
  seoEnsureMeta("property", "og:image:alt", pageName);
  seoEnsureMeta("name", "twitter:site", "@atlascomparts");
  seoEnsureMeta("name", "twitter:image", image);
  seoEnsureMeta("name", "twitter:image:alt", pageName);

  if (pageType === "404" || path.includes("/dashboard")) {
    seoEnsureMeta("name", "robots", "noindex, nofollow");
  }

  seoInjectStructuredData(url, path, pageType);
});
