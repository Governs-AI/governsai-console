export const NEXT_SEO_DEFAULT = {
  title: "Resume Bakers: Free Resume Builder that is ATS friendly",
  description:
    "Build a free resume that will get past the Applicant Tracking Systems (ATS) that employers use to filter prospective employees.",
  openGraph: {
    type: "website",
    locale: "en_IE",
    url: process.env.NEXT_PUBLIC_RESUME_URL || "https://yourdomain.com/",
    title: "Free Resume Builder that is ATS friendly - Resume Bakers",
    description:
      "Build a free resume that will get past the Applicant Tracking Systems (ATS) that employers use to filter prospective employees.",
    siteName: "Resume Bakers",
    image:
      process.env.NEXT_PUBLIC_OG_IMAGE_URL || "https://example.com/og-image.jpg",
  },
};
