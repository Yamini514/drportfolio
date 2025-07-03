import React, { memo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import SocialIconsResponsive from '../pages/SocialIcons';

const Footer = () => {
  const { currentTheme } = useTheme();
  const navigate = useNavigate();
  const accountHolderName = 'Dr. Laxminadh Sivaraju';

  // Handle scroll to services section
  const handleServicesClick = (e) => {
    e.preventDefault();
    if (window.location.pathname === '/') {
      const section = document.getElementById('services');
      if (section) {
        const headerHeight = document.querySelector('header')?.offsetHeight || 75;
        const sectionTop = section.getBoundingClientRect().top + window.scrollY - headerHeight;
        window.scrollTo({
          top: sectionTop,
          behavior: 'smooth',
        });
      }
    } else {
      navigate('/', { state: { scrollTo: 'services' } });
    }
  };

  // Handle navigation to contact page
  const handleContactClick = (e) => {
    e.preventDefault();
    navigate('/contactme', { state: { scrollToTop: true } });
  };

  // Add structured data for SEO
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': 'Dr. Laxminadh Sivaraju',
      'url': window.location.origin,
      'description': 'Official website of Dr. Laxminadh Sivaraju, a leading Consultant Neuro & Spine Surgeon at Care Hospital.',
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
        content="Official footer for Dr. Laxminadh Sivaraju's website, providing neurosurgical services and contact information."
      />
      <meta
        name="keywords"
        content="neurosurgeon, spine surgeon, Dr. Laxminadh Sivaraju, Care Hospital, footer, contact"
      />
      <meta name="author" content="Dr. Laxminadh Sivaraju" />

      {/* Open Graph Meta Tags for SMO */}
      <meta
        property="og:title"
        content="Dr. Laxminadh Sivaraju - Neurosurgeon Footer"
      />
      <meta
        property="og:description"
        content="Connect with Dr. Laxminadh Sivaraju, a leading neurosurgeon in Hyderabad, for expert neurosurgical care."
      />
      <meta property="og:image" content="/assets/drimg.png" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={window.location.href} />

      {/* Twitter Card Meta Tags for SMO */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta
        name="twitter:title"
        content="Dr. Laxminadh Sivaraju - Neurosurgeon Footer"
      />
      <meta
        name="twitter:description"
        content="Contact Dr. Laxminadh Sivaraju for expert neurosurgical care in Hyderabad."
      />
      <meta name="twitter:image" content="/assets/drimg.png" />

      <footer
        style={{
          backgroundColor: currentTheme.surface,
          color: currentTheme.text.primary,
          borderTop: `1px solid ${currentTheme.border}`,
        }}
        className="pt-12 pb-6"
        aria-label="Website footer"
      >
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mb-12 place-items-center">
            <div className="w-full md:max-w-[300px] text-center">
              <h2 className="text-xl font-bold mb-3 md:mb-4">{accountHolderName}</h2>
              <p className="text-sm" style={{ color: currentTheme.text.secondary }}>
                Leading neurosurgical care in Hyderabad with a focus on innovation,
                compassion, and patient-centered treatment.
              </p>
            </div>

            <div className="flex flex-col items-center">
              <h2 className="text-lg font-semibold mb-3">Social Media</h2>
              <SocialIconsResponsive size={18} aria-label="Social media links" />
            </div>
          </div>

          <div className="border-t" style={{ borderColor: currentTheme.border }}>
            <div className="pt-6 flex flex-col md:flex-row justify-between items-center">
              <p
                className="text-sm mb-4 md:mb-0 text-center"
                style={{ color: currentTheme.text.secondary }}
              >
                © 2025 {accountHolderName} Neurosurgeon | All Rights Reserved. |{' '}
                <Link
                  to="/terms-and-conditions"
                  className="text-sm"
                  style={{
                    color: currentTheme.text.disabled || '#9ca3af',
                    pointerEvents: 'none',
                    cursor: 'not-allowed',
                  }}
                  aria-disabled="true"
                >
                  Terms and Conditions
                </Link>
              </p>
              <a
                href="https://srinishtha.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-purple-600 hover:to-blue-600 transition-all duration-300"
                aria-label="Visit Srinishtha Technologies LLP website"
              >
                Powered by Srinishtha Technologies LLP
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default memo(Footer);