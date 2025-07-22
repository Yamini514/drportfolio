import React, { useEffect } from 'react';
import Hero from './Hero';
import Video from './Video';
import Testimonials from './Testimonials';
import Services from './Services';
import About from './About';
import Gallery from './Gallery';
import ContactMe from './ContactMe';

const Home = () => {
  useEffect(() => {
    const metaTags = [
      { name: 'description', content: 'Official website of Dr. Laxminadh Sivaraju, a leading Consultant Neuro & Spine Surgeon at Care Hospital specializing in brain tumors and minimally invasive techniques.' },
      { name: 'keywords', content: 'neurosurgeon, spine surgeon, Dr. Laxminadh Sivaraju, Care Hospital, brain tumors, minimally invasive surgery, neurology' },
      { name: 'author', content: 'Dr. Laxminadh Sivaraju' },
      { property: 'og:title', content: 'Dr. Laxminadh Sivaraju - Neuro & Spine Surgeon' },
      { property: 'og:description', content: 'Explore the expertise of Dr. Laxminadh Sivaraju, a leading neurosurgeon with over 2000 procedures and 30+ publications.' },
      { property: 'og:image', content: '/assets/drimg.png' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: window.location.href },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'Dr. Laxminadh Sivaraju - Neuro & Spine Surgeon' },
      { name: 'twitter:description', content: 'Renowned neurosurgeon specializing in brain tumors and minimally invasive techniques.' },
      { name: 'twitter:image', content: '/assets/drimg.png' }
    ];

    // Add each meta tag to the head
    metaTags.forEach(tag => {
      const meta = document.createElement('meta');
      Object.entries(tag).forEach(([key, value]) => {
        meta.setAttribute(key, value);
      });
      document.head.appendChild(meta);
    });

    // Structured Data (Schema.org)
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

    // Cleanup on unmount
    return () => {
      metaTags.forEach(tag => {
        const selector = tag.name
          ? `meta[name="${tag.name}"]`
          : `meta[property="${tag.property}"]`;
        const el = document.head.querySelector(selector);
        if (el) document.head.removeChild(el);
      });
      document.head.removeChild(script);
    };
  }, []);

  return (
    <main aria-label="Home page content">
      <Hero id="hero" />
      <About id="about" />
      <Services id="services" />
      <Testimonials />
      <Gallery id="gallery" />
      <Video />
      <ContactMe id="contact" />
    </main>
  );
};

export default Home;
