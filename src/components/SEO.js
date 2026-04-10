import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// SEO Component for dynamic meta tag management
const SEO = ({ 
  title, 
  description, 
  keywords, 
  image, 
  url, 
  type = 'website',
  author = 'E-Commerce',
  publishedTime,
  modifiedTime,
  section,
  tags = []
}) => {
  const location = useLocation();

  useEffect(() => {
    // Update document title
    if (title) {
      document.title = title;
    }

    // Update meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);
    updateMetaTag('author', author);

    // Update Open Graph tags
    updateMetaTag('og:title', title);
    updateMetaTag('og:description', description);
    updateMetaTag('og:image', image);
    updateMetaTag('og:url', url || window.location.href);
    updateMetaTag('og:type', type);

    // Update Twitter Card tags
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', image);

    // Update article specific tags
    if (type === 'article') {
      updateMetaTag('article:published_time', publishedTime);
      updateMetaTag('article:modified_time', modifiedTime);
      updateMetaTag('article:section', section);
      updateMetaTag('article:author', author);
      
      // Add article tags
      tags.forEach((tag, index) => {
        updateMetaTag(`article:tag:${index}`, tag);
      });
    }

    // Update canonical URL
    updateCanonicalUrl(url || window.location.href);

    // Add structured data for current page
    // eslint-disable-next-line no-use-before-define
    addStructuredData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, keywords, image, url, type, author, publishedTime, modifiedTime, section, tags, location]);

  const updateMetaTag = (name, content) => {
    if (!content) return;

    let meta = document.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.querySelector(`meta[property="${name}"]`);
    }
    
    if (!meta) {
      meta = document.createElement('meta');
      if (name.startsWith('og:') || name.startsWith('article:')) {
        meta.setAttribute('property', name);
      } else {
        meta.setAttribute('name', name);
      }
      document.head.appendChild(meta);
    }
    
    meta.setAttribute('content', content);
  };

  const updateCanonicalUrl = (url) => {
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);
  };

  const addStructuredData = () => {
    // Remove existing structured data
    const existingScripts = document.querySelectorAll('script[data-seo="true"]');
    existingScripts.forEach(script => script.remove());

    // Add new structured data based on page type
    const structuredData = getStructuredData();
    if (structuredData) {
      const script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('data-seo', 'true');
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }
  };

  const getStructuredData = () => {
    const baseUrl = 'https://yahia-dev-1.github.io/E-Commer-React';
    
    switch (type) {
      case 'product':
        return {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": title,
          "description": description,
          "image": image,
          "url": url,
          "brand": {
            "@type": "Brand",
            "name": "E-Commerce"
          },
          "offers": {
            "@type": "Offer",
            "url": url,
            "priceCurrency": "EGP",
            "availability": "https://schema.org/InStock",
            "seller": {
              "@type": "Organization",
              "name": "E-Commerce"
            }
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "reviewCount": "25"
          }
        };

      case 'article':
        return {
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": title,
          "description": description,
          "image": image,
          "author": {
            "@type": "Person",
            "name": author
          },
          "publisher": {
            "@type": "Organization",
            "name": "E-Commerce",
            "logo": {
              "@type": "ImageObject",
              "url": `${baseUrl}/Modern%20E-Shop%20Logo%20Design.png`
            }
          },
          "datePublished": publishedTime,
          "dateModified": modifiedTime,
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": url
          }
        };

      default:
        return {
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": title,
          "description": description,
          "url": url,
          "mainEntity": {
            "@type": "Organization",
            "name": "E-Commerce",
            "url": baseUrl
          }
        };
    }
  };

  return null; // This component doesn't render anything
};

// SEO configurations for different pages
export const SEOConfigs = {
  home: {
    title: 'E-Commerce Store - Clothing, Shoes, and Accessories',
    description: 'Advanced e-commerce store for clothing, shoes, and accessories. Safe and fast shopping with excellent customer service. Exclusive offers and discounts on all products',
    keywords: 'e-commerce store, clothing, shoes, accessories, online shopping, offers, discounts',
    type: 'website'
  },
  
  products: {
    title: 'Products - E-Commerce Store',
    description: 'Browse a wide range of high-quality products. Clothing, shoes, accessories and more',
    keywords: 'products, clothing, shoes, accessories, shopping, buy',
    type: 'website'
  },
  
  cart: {
    title: 'Shopping Cart - E-Commerce Store',
    description: 'Review your shopping cart and complete your purchase easily and securely',
    keywords: 'shopping cart, buy, payment, order',
    type: 'website'
  },
  
  login: {
    title: 'Login - E-Commerce Store',
    description: 'Sign in to your account to access all features and services',
    keywords: 'login, account, user, sign in',
    type: 'website'
  },
  
  about: {
    title: 'About Us - E-Commerce Store',
    description: 'Learn about our vision, mission, and values in providing the best shopping experience',
    keywords: 'about us, company, vision, mission, values',
    type: 'website'
  },
  
  contact: {
    title: 'Contact Us - E-Commerce Store',
    description: 'Contact our customer service team. We are here to help you with any inquiry',
    keywords: 'contact us, contact, customer service, support',
    type: 'website'
  },
  
  offers: {
    title: 'Offers and Discounts - E-Commerce Store',
    description: 'Discover the latest exclusive offers and discounts. Save money with the best prices',
    keywords: 'offers, discounts, sales, low prices',
    type: 'website'
  }
};

// Hook for easy SEO management
export const useSEO = (config) => {
  return {
    title: config.title,
    description: config.description,
    keywords: config.keywords,
    type: config.type,
    image: config.image,
    url: config.url
  };
};

export default SEO; 