import React, { memo, useEffect } from 'react';
import Hero from './Hero';
import Video from './Video';
import Testimonials from './Testimonials';
import Services from './Services';
import About from './About';
import Gallery from './Gallery';
import ContactMe from './ContactMe';

const Home = () => {
  useEffect(() => {
    // Add structured data for SEO
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'Dr. Laxminadh Sivaraju - Neuro & Spine Surgeon',
      'description': 'Official website of Dr. Laxminadh Sivaraju, a renowned Consultant Neuro & Spine Surgeon at Care Hospital with over 12 years of experience.',
      'url': window.location.href,
      'publisher': {
        '@type': 'Person',
        'name': 'Dr. Laxminadh Sivaraju'
      }
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
        content="Official website of Dr. Laxminadh Sivaraju, a leading Consultant Neuro & Spine Surgeon at Care Hospital specializing in brain tumors and minimally invasive techniques."
      />
      <meta
        name="keywords"
        content="neurosurgeon, spine surgeon, Dr. Laxminadh Sivaraju, Care Hospital, brain tumors, minimally invasive surgery, neurology"
      />
      <meta name="author" content="Dr. Laxminadh Sivaraju" />

      {/* Open Graph Meta Tags for SMO */}
      <meta
        property="og:title"
        content="Dr. Laxminadh Sivaraju - Neuro & Spine Surgeon"
      />
      <meta
        property="og:description"
        content="Explore the expertise of Dr. Laxminadh Sivaraju, a leading neurosurgeon with over 2000 procedures and 30+ publications."
      />
      <meta property="og:image" content="/assets/drimg.png" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={window.location.href} />

      {/* Twitter Card Meta Tags for SMO */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta
        name="twitter:title"
        content="Dr. Laxminadh Sivaraju - Neuro & Spine Surgeon"
      />
      <meta
        name="twitter:description"
        content="Renowned neurosurgeon specializing in brain tumors and minimally invasive techniques."
      />
      <meta name="twitter:image" content="/assets/drimg.png" />

      <main aria-label="Home page content">
        <Hero id="hero" />
        <About id="about" />
        <Services id="services" />
        <Testimonials />
        <Gallery id="gallery" />
        <Video />
        <ContactMe id="contact" />
      </main>
    </>
  );
};

export default memo(Home);