"use client"

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { APP_CONFIG, getValidAppUrl } from '@/lib/constants'

interface PageSEOProps {
  title?: string
  description?: string
  keywords?: string[]
  image?: string
  type?: 'website' | 'article' | 'profile'
  publishedTime?: string
  modifiedTime?: string
  author?: string
  noindex?: boolean
  nofollow?: boolean
}

export function PageSEO({
  title,
  description,
  keywords = [],
  image,
  type = 'website',
  publishedTime,
  modifiedTime,
  author,
  noindex = false,
  nofollow = false
}: PageSEOProps) {
  const pathname = usePathname()
  const baseUrl = getValidAppUrl()
  const fullUrl = `${baseUrl}${pathname}`
  
  useEffect(() => {
    // Update document title
    if (title) {
      document.title = `${title} | ${APP_CONFIG.name}`
    }
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription && description) {
      metaDescription.setAttribute('content', description)
    }
    
    // Update meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]')
    if (metaKeywords && keywords.length > 0) {
      const allKeywords = [...APP_CONFIG.keywords, ...keywords].join(', ')
      metaKeywords.setAttribute('content', allKeywords)
    }
    
    // Update canonical URL
    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', fullUrl)
    
    // Update Open Graph tags
    const ogTitle = document.querySelector('meta[property="og:title"]')
    if (ogTitle && title) {
      ogTitle.setAttribute('content', title)
    }
    
    const ogDescription = document.querySelector('meta[property="og:description"]')
    if (ogDescription && description) {
      ogDescription.setAttribute('content', description)
    }
    
    const ogUrl = document.querySelector('meta[property="og:url"]')
    if (ogUrl) {
      ogUrl.setAttribute('content', fullUrl)
    }
    
    const ogImage = document.querySelector('meta[property="og:image"]')
    if (ogImage && image) {
      ogImage.setAttribute('content', `${baseUrl}${image}`)
    }
    
    const ogType = document.querySelector('meta[property="og:type"]')
    if (ogType) {
      ogType.setAttribute('content', type)
    }
    
    // Update Twitter tags
    const twitterTitle = document.querySelector('meta[name="twitter:title"]')
    if (twitterTitle && title) {
      twitterTitle.setAttribute('content', title)
    }
    
    const twitterDescription = document.querySelector('meta[name="twitter:description"]')
    if (twitterDescription && description) {
      twitterDescription.setAttribute('content', description)
    }
    
    const twitterImage = document.querySelector('meta[name="twitter:image"]')
    if (twitterImage && image) {
      twitterImage.setAttribute('content', `${baseUrl}${image}`)
    }
    
    // Handle robots meta tag
    let robots = document.querySelector('meta[name="robots"]')
    if (!robots) {
      robots = document.createElement('meta')
      robots.setAttribute('name', 'robots')
      document.head.appendChild(robots)
    }
    
    const robotsContent = []
    if (noindex) robotsContent.push('noindex')
    if (nofollow) robotsContent.push('nofollow')
    if (!noindex && !nofollow) robotsContent.push('index', 'follow')
    
    robots.setAttribute('content', robotsContent.join(', '))
    
    // Add structured data for the page
    const structuredData = {
      "@context": "https://schema.org",
      "@type": type === 'article' ? 'Article' : 'WebPage',
      "name": title || APP_CONFIG.name,
      "description": description || APP_CONFIG.description,
      "url": fullUrl,
      "publisher": {
        "@type": "Organization",
        "name": APP_CONFIG.name,
        "logo": {
          "@type": "ImageObject",
          "url": `${baseUrl}/logo-main.png`
        }
      },
      ...(publishedTime && { "datePublished": publishedTime }),
      ...(modifiedTime && { "dateModified": modifiedTime }),
      ...(author && { "author": { "@type": "Person", "name": author } })
    }
    
    // Remove existing structured data script
    const existingScript = document.querySelector('script[data-page-seo]')
    if (existingScript) {
      existingScript.remove()
    }
    
    // Add new structured data script
    const script = document.createElement('script')
    script.setAttribute('type', 'application/ld+json')
    script.setAttribute('data-page-seo', 'true')
    script.textContent = JSON.stringify(structuredData)
    document.head.appendChild(script)
    
  }, [title, description, keywords, image, type, publishedTime, modifiedTime, author, noindex, nofollow, pathname, fullUrl, baseUrl])
  
  return null
} 