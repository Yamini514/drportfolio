import React, { useEffect, useState, memo } from 'react';
import { FaGraduationCap, FaAward, FaBrain, FaBook } from 'react-icons/fa';
import drImage from '../../assets/drimg.png';
import { useTheme } from '../../context/ThemeContext';
import HeaderComponent from '../../components/HeaderComponent';

const About = ({ id }) => {
  const { currentTheme } = useTheme();
  const [aboutData, setAboutData] = useState({
    title: "About Dr. Laxminadh Sivaraju",
    description: "Dr. Laxminadh Sivaraju is a Consultant Neuro & Spine Surgeon at Care Hospital - HITEC City Branch. Dr. Laxminadh did his five years neurosurgery residency from the Christian Medical College, Vellore which is renowned medical institute, training neurosurgeons across India for more than 7 decades. After his residency he joined and worked as consultant neurosurgeon in Sri Sathya Sai Institute of Higher Medical Sciences, Bangalore which is a well known tertiary centre for its yeoman service in health care. In his prominent career of over 12 years as a neuro surgery specialist, Dr. Laxminadh has performed more than 2000 neurosurgical procedures. He has a meritorious academic record with more than 30 publications in various international peer reviewed journals. He had given more than 10 podium presentations in national and international conferences. He was also NSI (Neurological Society of India) award winner for his work on Arnold-Chiari Malformation. He has membership in several professional and scientific societies. He had obtained trainee fellowship in Neuroendoscopy and minimal invasive neurosurgery from University of Greifswald, Germany under guidance of Prof. Henry Shroeder.",
    image: "../../assets/drimg.png",
    achievements: [
      {
        id: 1,
        icon: "FaGraduationCap",
        title: "Education",
        description: "MBBS, MCh (Neuro surgery), Fellowship in Neuroendoscopy and Minimal Invasive Neurosurgery"
      },
      {
        id: 2,
        icon: "FaAward",
        title: "Accolades",
        description: "National Award for Medical Excellence, Top Neurologist 2023"
      },
      {
        id: 3,
        icon: "FaBrain",
        title: "Specialization",
        description: "Brain Tumors, Spine Surgery, Minimally Invasive Techniques"
      },
      {
        id: 4,
        icon: "FaBook",
        title: "Publications",
        description: "30+ research papers in international medical journals"
      }
    ]
  });

  useEffect(() => {
    // Load data from localStorage only once on mount
    const savedData = localStorage.getItem('aboutPageData');
    if (savedData) {
      setAboutData(JSON.parse(savedData));
    }

    // Update header styles
    const header = document.querySelector('header');
    if (header) {
      header.style.backgroundColor = currentTheme.surface;
      header.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    }

    // Add structured data for SEO
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Person",
      "name": "Dr. Laxminadh Sivaraju",
      "jobTitle": "Consultant Neuro & Spine Surgeon",
      "affiliation": {
        "@type": "Organization",
        "name": "Care Hospital - HITEC City Branch"
      },
      "award": "National Award for Medical Excellence, Top Neurologist 2023",
      "alumniOf": {
        "@type": "EducationalOrganization",
        "name": "Christian Medical College, Vellore"
      }
    });
    document.head.appendChild(script);

    // Cleanup
    return () => {
      document.head.removeChild(script);
    };
  }, [currentTheme.surface]);

  const renderIcon = (iconName) => {
    switch (iconName) {
      case 'FaGraduationCap': return <FaGraduationCap className="w-6 h-6" aria-hidden="true" />;
      case 'FaAward': return <FaAward className="w-6 h-6" aria-hidden="true" />;
      case 'FaBrain': return <FaBrain className="w-6 h-6" aria-hidden="true" />;
      case 'FaBook': return <FaBook className="w-6 h-6" aria-hidden="true" />;
      default: return <FaGraduationCap className="w-6 h-6" aria-hidden="true" />;
    }
  };

  return (
    <>
      {/* SEO Meta Tags */}
      <meta name="description" content="Learn about Dr. Laxminadh Sivaraju, a renowned Consultant Neuro & Spine Surgeon at Care Hospital with over 12 years of experience and numerous accolades." />
      <meta name="keywords" content="neurosurgeon, spine surgeon, Dr. Laxminadh Sivaraju, Care Hospital, brain tumors, minimally invasive surgery" />
      <meta name="author" content="Dr. Laxminadh Sivaraju" />
      
      {/* Open Graph Meta Tags for SMO */}
      <meta property="og:title" content="About Dr. Laxminadh Sivaraju - Expert Neuro & Spine Surgeon" />
      <meta property="og:description" content="Discover the expertise of Dr. Laxminadh Sivaraju, a leading neurosurgeon with over 2000 procedures and 30+ publications." />
      <meta property="og:image" content={aboutData.image} />
      <meta property="og:type" content="profile" />
      <meta property="og:url" content={window.location.href} />
      
      {/* Twitter Card Meta Tags for SMO */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="About Dr. Laxminadh Sivaraju" />
      <meta name="twitter:description" content="Renowned neurosurgeon with expertise in brain tumors and minimally invasive techniques." />
      <meta name="twitter:image" content={aboutData.image} />

      <section id={id} aria-labelledby="about-heading">
        <div className="px-5 md:px-15 pb-12 mt-5 md:pb-10 lg:px-20 p-8" style={{ backgroundColor: currentTheme.background }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-start mb-8">
            <div className="relative">
              <div className="rounded-lg overflow-hidden">
                <img
                  src={aboutData.image}
                  alt="Portrait of Dr. Laxminadh Sivaraju"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = drImage;
                  }}
                />
              </div>
              <div
                className="absolute inset-0 rounded-lg"
                style={{ background: `linear-gradient(to bottom, transparent 50%, ${currentTheme.surface})` }}
              ></div>
            </div>

            <div>
              <HeaderComponent
                title={aboutData.title}
                description={aboutData.description}
                className="mb-8 text-justify"
                style={{ color: currentTheme.text.primary }}
                headingId="about-heading"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {aboutData.achievements.map((item) => (
              <article
                key={item.id}
                style={{
                  backgroundColor: currentTheme.surface,
                  borderColor: currentTheme.border,
                  borderWidth: '3px',
                }}
                className="p-4 rounded-lg border"
                aria-labelledby={`achievement-${item.id}`}
              >
                <div
                  className="mb-4 mt-4 text-center transition-transform duration-300 group-hover:scale-110 flex justify-center items-center"
                  style={{ color: currentTheme.primary }}
                >
                  {renderIcon(item.icon)}
                </div>
                <h3 id={`achievement-${item.id}`} className="text-xl font-semibold mb-3 text-center">
                  {item.title}
                </h3>
                <p style={{ color: currentTheme.text.secondary }}>
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default memo(About);