// @ts-nocheck
import { NextSeo } from "next-seo";

import { NEXT_SEO_DEFAULT } from "../../next-seo-config"; // your path will vary
import Script from "next/script";

export default async function Head() {
  return (
    <>
      <title>Free Resume Builder that is ATS friendly - Resume Bakers</title>
      <meta
        name="description"
        content="Build a free resume that will get past the Applicant Tracking Systems (ATS) that employers use to filter prospective employees."
      />

      <meta property="og:url" content={process.env.NEXT_PUBLIC_RESUME_URL || "https://yourdomain.com/"} />
      <meta property="og:type" content="website" />
      <meta
        property="og:title"
        content="Free Resume Builder that is ATS friendly - Resume Bakers"
      />
      <meta
        property="og:description"
        content="Build a free resume that will get past the Applicant Tracking Systems (ATS) that employers use to filter prospective employees."
      />
      <meta
        property="og:image"
        content={process.env.NEXT_PUBLIC_OG_IMAGE_URL || "https://example.com/og-image.jpg"}
      />

      <meta name="twitter:card" content="summary_large_image" />
      <meta property="twitter:domain" content={process.env.NEXT_PUBLIC_TWITTER_DOMAIN || "yourdomain.com"} />
      <meta property="twitter:url" content={process.env.NEXT_PUBLIC_RESUME_URL || "https://yourdomain.com/"} />
      <meta
        name="twitter:title"
        content="Free Resume Builder that is ATS friendly - Resume Bakers"
      />
      <meta
        name="twitter:description"
        content="Build a free resume that will get past the Applicant Tracking Systems (ATS) that employers use to filter prospective employees."
      />
      <meta
        name="twitter:image"
        content={process.env.NEXT_PUBLIC_OG_IMAGE_URL || "https://example.com/og-image.jpg"}
      />
        <Script src="https://gumroad.com/js/gumroad.js" defer></Script>
      <NextSeo {...NEXT_SEO_DEFAULT} useAppDir={true} />
    </>
  );
}
