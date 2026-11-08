import type { Metadata } from "next";

export const SITE_URL = "https://datocrimine.it";
export const SITE_NAME = "DatoCrimine";

const OG_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "DatoCrimine - Dati ISTAT sulla criminalità in Italia",
};

// Next sostituisce openGraph e twitter del layout invece di fonderli: ogni pagina li ha completi
export function pageMetadata(title: string, description: string, path: string): Metadata {
  const fullTitle = path === "/" ? title : `${title} | ${SITE_NAME}`;
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "it_IT",
      siteName: SITE_NAME,
      url: path,
      title: fullTitle,
      description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [OG_IMAGE.url],
    },
  };
}
