"use client"

import { APP_CONFIG, getValidAppUrl } from "@/lib/constants"

interface StructuredDataProps {
  type?: 'website' | 'organization' | 'webpage'
  title?: string
  description?: string
  url?: string
  image?: string
  publishedTime?: string
  modifiedTime?: string
  author?: string
}

export function StructuredData({
  type = 'website',
  title,
  description,
  url,
  image,
  publishedTime,
  modifiedTime,
  author
}: StructuredDataProps) {
  const baseUrl = getValidAppUrl()
  
  // Organization structured data
  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": APP_CONFIG.name,
    "description": APP_CONFIG.description,
    "url": baseUrl,
    "logo": `${baseUrl}/logo-main.png`,
    "image": `${baseUrl}/logo-main.png`,
    "sameAs": [
      process.env.NEXT_PUBLIC_TWITTER_URL || "https://twitter.com/governsai",
      process.env.NEXT_PUBLIC_LINKEDIN_URL || "https://linkedin.com/company/governs-ai",
      process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/governs-ai/governs-ai"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "email": process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@governs.ai"
    },
    "address": {
      "@type": "PostalAddress",
      "addressCountry": process.env.NEXT_PUBLIC_COUNTRY || "US"
    },
    "foundingDate": process.env.NEXT_PUBLIC_FOUNDING_DATE || "2024",
    "founder": {
      "@type": "Person",
      "name": APP_CONFIG.author
    }
  }

  // Website structured data
  const websiteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": APP_CONFIG.name,
    "description": APP_CONFIG.description,
    "url": baseUrl,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${baseUrl}/search?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  }

  // WebPage structured data
  const webpageData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": title || APP_CONFIG.name,
    "description": description || APP_CONFIG.description,
    "url": url || baseUrl,
    "image": image ? `${baseUrl}${image}` : `${baseUrl}/og-image.png`,
    "publisher": {
      "@type": "Organization",
      "name": APP_CONFIG.name,
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/logo-main.png`
      }
    },
    "mainEntity": {
      "@type": "SoftwareApplication",
      "name": APP_CONFIG.name,
      "description": APP_CONFIG.description,
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web Browser",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
    },
    ...(publishedTime && { "datePublished": publishedTime }),
    ...(modifiedTime && { "dateModified": modifiedTime }),
    ...(author && { "author": { "@type": "Person", "name": author } })
  }

  // Breadcrumb structured data
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": baseUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": title || "Page",
        "item": url || baseUrl
      }
    ]
  }

  // FAQ structured data
  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is GovernsAI?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "GovernsAI is a secure control plane for AI interactions that provides complete visibility, control, and compliance over AI usage through monitoring, budget enforcement, and policy management."
        }
      },
      {
        "@type": "Question",
        "name": "How does AI governance work?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "GovernsAI acts as a proxy gateway between your applications and AI providers, monitoring all interactions, enforcing budgets, and applying policies to ensure compliance and security."
        }
      },
      {
        "@type": "Question",
        "name": "Is GovernsAI free to use?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "We offer both free and premium features. Basic AI monitoring and budget control are available for free, with advanced policy management and compliance features available through premium subscriptions."
        }
      }
    ]
  }

  const getStructuredData = () => {
    switch (type) {
      case 'organization':
        return organizationData
      case 'webpage':
        return webpageData
      default:
        return websiteData
    }
  }

  return (
    <>
      {/* Main structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getStructuredData())
        }}
      />
      
      {/* Breadcrumb structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbData)
        }}
      />
      
      {/* FAQ structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqData)
        }}
      />
    </>
  )
} 