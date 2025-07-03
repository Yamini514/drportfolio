import React, { useState, useEffect, memo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { ExternalLink } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

const Publications = () => {
  const { currentTheme } = useTheme();
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublications = async () => {
      try {
        const publicationsCollection = collection(db, 'publications');
        const publicationsSnapshot = await getDocs(publicationsCollection);
        const publicationsList = publicationsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))
          .sort((a, b) => a.publishedYear - b.publishedYear);
        setPublications(publicationsList);
      } catch (error) {
        console.error('Error fetching publications:', error);
        setPublications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPublications();

    // Add structured data for SEO
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': 'Publications by Dr. Laxminadh Sivaraju',
      'description': 'A collection of peer-reviewed publications by Dr. Laxminadh Sivaraju, a leading Consultant Neuro & Spine Surgeon.',
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

  if (loading) {
    return (
      <section
        className="px-5 pt-20 pb-10 md:px-15 md:pt-10 lg:px-20 lg:pt-20 flex items-center justify-center"
        style={{ backgroundColor: currentTheme.background }}
        aria-live="polite"
      >
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 mx-auto mb-4"
            style={{ borderColor: currentTheme.primary }}
            aria-hidden="true"
          ></div>
          <p style={{ color: currentTheme.text.primary }}>Loading publications...</p>
        </div>
      </section>
    );
  }

  return (
    <>
      {/* SEO Meta Tags */}
      <meta
        name="description"
        content="Explore the peer-reviewed publications by Dr. Laxminadh Sivaraju, a renowned neurosurgeon, covering advancements in neurosurgery and spine surgery."
      />
      <meta
        name="keywords"
        content="neurosurgery publications, Dr. Laxminadh Sivaraju, peer-reviewed journals, spine surgery research, brain tumor research"
      />
      <meta name="author" content="Dr. Laxminadh Sivaraju" />

      {/* Open Graph Meta Tags for SMO */}
      <meta
        property="og:title"
        content="Publications by Dr. Laxminadh Sivaraju"
      />
      <meta
        property="og:description"
        content="Discover the research contributions of Dr. Laxminadh Sivaraju in neurosurgery and spine surgery through his peer-reviewed publications."
      />
      <meta property="og:image" content="/assets/drimg.png" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={window.location.href} />

      {/* Twitter Card Meta Tags for SMO */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta
        name="twitter:title"
        content="Publications by Dr. Laxminadh Sivaraju"
      />
      <meta
        name="twitter:description"
        content="View the peer-reviewed publications by Dr. Laxminadh Sivaraju, a leading neurosurgeon."
      />
      <meta name="twitter:image" content="/assets/drimg.png" />

      <section
        className="px-5 pt-5 pb-10 md:px-15 md:pt-5 lg:px-20"
        style={{ backgroundColor: currentTheme.background }}
        aria-labelledby="publications-heading"
      >
        <div className="max-w-4xl mx-auto">
          <h1
            id="publications-heading"
            className="text-2xl md:text-3xl font-bold mb-8 text-center pt-3"
            style={{ color: currentTheme.primary }}
          >
            Publications
          </h1>

          <div className="space-y-4">
            {publications.length > 0 ? (
              publications.map((publication) => (
                <article
                  key={publication.id}
                  className="p-4 rounded-lg transition-all hover:shadow-lg border"
                  style={{
                    backgroundColor: currentTheme.surface,
                    borderColor: currentTheme.border,
                    color: currentTheme.text.primary,
                  }}
                  aria-labelledby={`publication-${publication.id}`}
                >
                  <a
                    href={publication.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 group hover:opacity-80 transition-opacity"
                    style={{ color: currentTheme.text.primary }}
                    aria-labelledby={`publication-${publication.id}`}
                  >
                    <div className="flex-grow">
                      <h2
                        id={`publication-${publication.id}`}
                        className="text-base md:text-lg"
                      >
                        {publication.title}{' '}
                        <span style={{ color: currentTheme.text.secondary }}>
                          ({publication.publishedYear})
                        </span>
                      </h2>
                    </div>
                    <ExternalLink
                      size={20}
                      className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: currentTheme.primary }}
                      aria-hidden="true"
                    />
                  </a>
                </article>
              ))
            ) : (
              <p
                className="text-center"
                style={{ color: currentTheme.text.secondary }}
              >
                No publications available at the moment.
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default memo(Publications);