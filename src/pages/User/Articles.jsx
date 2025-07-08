import React, { memo, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';

const Articles = () => {
  const { currentTheme } = useTheme();

  useEffect(() => {
    // Add structured data for SEO
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'Articles by Dr. Laxminadh Sivaraju',
      'description': 'Explore articles authored by Dr. Laxminadh Sivaraju, a leading Consultant Neuro & Spine Surgeon, covering advancements in neurosurgery.',
      'url': window.location.href,
      'publisher': {
        '@type': 'Person',
        'name': 'Dr. Laxminadh Sivaraju',
      },
    });
    document.head.appendChild(script);

    // Cleanup
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <>
      {/* SEO Meta Tags */}
      <meta
        name="description"
        content="Explore articles by Dr. Laxminadh Sivaraju, a renowned neurosurgeon, focusing on neurosurgery and spine surgery advancements."
      />
      <meta
        name="keywords"
        content="neurosurgery articles, Dr. Laxminadh Sivaraju, spine surgery, brain tumor articles, medical research"
      />
      <meta name="author" content="Dr. Laxminadh Sivaraju" />

      {/* Open Graph Meta Tags for SMO */}
      <meta
        property="og:title"
        content="Articles by Dr. Laxminadh Sivaraju"
      />
      <meta
        property="og:description"
        content="Read articles by Dr. Laxminadh Sivaraju, a leading neurosurgeon, on advancements in neurosurgery and spine surgery."
      />
      <meta property="og:image" content="/assets/drimg.png" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={window.location.href} />

      {/* Twitter Card Meta Tags for SMO */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta
        name="twitter:title"
        content="Articles by Dr. Laxminadh Sivaraju"
      />
      <meta
        name="twitter:description"
        content="Discover articles by Dr. Laxminadh Sivaraju on neurosurgery and spine surgery."
      />
      <meta name="twitter:image" content="/assets/drimg.png" />

      <section
        className="min-h-screen px-5 pb-10 md:px-15 lg:px-20 pt-5 md:pt-5"
        style={{ backgroundColor: currentTheme.background }}
        aria-labelledby="articles-heading"
      >
        <div className="max-w-4xl mx-auto">
          <h1
            id="articles-heading"
            className="text-2xl md:text-3xl font-bold mb-8 text-center"
            style={{ color: currentTheme.primary }}
          >
            Articles
          </h1>

          <div
            className="border rounded-lg shadow-lg overflow-hidden"
            style={{ backgroundColor: currentTheme.surface, borderColor: currentTheme.border }}
          >
            <iframe
              src="/article.pdf"
              className="w-full h-[80vh]"
              frameBorder="0"
              title="Article PDF Viewer"
              loading="lazy"
              aria-label="PDF viewer for neurosurgery articles by Dr. Laxminadh Sivaraju"
            ></iframe>
          </div>
        </div>
      </section>
    </>
  );
};

export default memo(Articles);