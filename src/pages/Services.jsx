import React, { useEffect, useState, memo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  FaBrain, 
  FaXRay, 
  FaNotesMedical, 
  FaMicroscope, 
  FaStethoscope, 
  FaHospital, 
  FaHeartbeat, 
  FaLaptopMedical 
} from 'react-icons/fa';
import { db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';

const Services = ({ id }) => {
  const { currentTheme } = useTheme();
  const [services, setServices] = useState([]);

  // Get the icon component based on the icon name string
  const getIconComponent = (iconName) => {
    switch (iconName) {
      case 'FaBrain': return <FaBrain className="w-12 h-12" aria-hidden="true" />;
      case 'FaXRay': return <FaXRay className="w-12 h-12" aria-hidden="true" />;
      case 'FaNotesMedical': return <FaNotesMedical className="w-12 h-12" aria-hidden="true" />;
      case 'FaMicroscope': return <FaMicroscope className="w-12 h-12" aria-hidden="true" />;
      case 'FaStethoscope': return <FaStethoscope className="w-12 h-12" aria-hidden="true" />;
      case 'FaHospital': return <FaHospital className="w-12 h-12" aria-hidden="true" />;
      case 'FaHeartbeat': return <FaHeartbeat className="w-12 h-12" aria-hidden="true" />;
      case 'FaLaptopMedical': return <FaLaptopMedical className="w-12 h-12" aria-hidden="true" />;
      default: return null;
    }
  };

  // Load services from Firebase
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const servicesCollection = collection(db, 'services');
        const servicesSnapshot = await getDocs(servicesCollection);
        const servicesList = servicesSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(service => service.status === 'Active')
          .sort((a, b) => a.title.localeCompare(b.title));
        setServices(servicesList);
      } catch (error) {
        console.error('Error fetching services:', error);
        setServices([]);
      }
    };

    fetchServices();

    // Add structured data for SEO
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Service',
      'provider': {
        '@type': 'Person',
        'name': 'Dr. Laxminadh Sivaraju',
        'jobTitle': 'Consultant Neuro & Spine Surgeon'
      },
      'serviceType': 'Neurosurgery and Spine Surgery',
      'description': 'Comprehensive neurosurgical care including brain tumor surgery, spine surgery, and minimally invasive techniques.'
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
        content="Explore the neurosurgical services offered by Dr. Laxminadh Sivaraju, including brain tumor surgery, spine surgery, and minimally invasive techniques at Care Hospital."
      />
      <meta
        name="keywords"
        content="neurosurgery, spine surgery, brain tumor surgery, minimally invasive surgery, Dr. Laxminadh Sivaraju, Care Hospital"
      />
      <meta name="author" content="Dr. Laxminadh Sivaraju" />

      {/* Open Graph Meta Tags for SMO */}
      <meta
        property="og:title"
        content="Neurosurgical Services by Dr. Laxminadh Sivaraju"
      />
      <meta
        property="og:description"
        content="Discover expert neurosurgical care, including brain tumor surgery and minimally invasive spine procedures, by Dr. Laxminadh Sivaraju."
      />
      <meta property="og:image" content="/assets/drimg.png" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={window.location.href} />

      {/* Twitter Card Meta Tags for SMO */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta
        name="twitter:title"
        content="Neurosurgical Services by Dr. Laxminadh Sivaraju"
      />
      <meta
        name="twitter:description"
        content="Expert neurosurgical care for brain tumors and spine conditions by Dr. Laxminadh Sivaraju."
      />
      <meta name="twitter:image" content="/assets/drimg.png" />

      <section id={id} aria-labelledby="services-heading">
        <div className="px-5 pb-10 md:px-15 md:pb-20 p-8" style={{ backgroundColor: currentTheme.background }}>
          {/* Header Section */}
          <header className="text-center mb-12">
            <h1 id="services-heading" className="text-3xl md:text-4xl font-bold mb-4">
              My Services
            </h1>
            <p className="text-lg" style={{ color: currentTheme.text.secondary }}>
              I provide comprehensive neurosurgical care using the latest technologies and techniques to ensure optimal patient outcomes.
            </p>
          </header>

          {/* Services Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.length > 0 ? (
              services.map((service) => (
                <article
                  key={service.id}
                  style={{
                    backgroundColor: currentTheme.surface,
                    borderColor: currentTheme.border,
                    borderWidth: '3px',
                  }}
                  className="rounded-lg border-2 p-6 flex flex-col items-center text-center group hover:shadow-xl transition-all duration-300"
                  aria-labelledby={`service-${service.id}`}
                >
                  <div
                    className="mb-4 mt-4 transition-transform duration-300 group-hover:scale-110"
                    style={{ color: currentTheme.primary }}
                  >
                    {getIconComponent(service.icon)}
                  </div>
                  <h2 id={`service-${service.id}`} className="text-xl font-semibold mb-3">
                    {service.title}
                  </h2>
                  <p
                    className="mb-4 flex-grow text-left"
                    style={{ color: currentTheme.text.secondary }}
                  >
                    {service.description}
                  </p>
                </article>
              ))
            ) : (
              <p className="text-center col-span-full" style={{ color: currentTheme.text.secondary }}>
                No services available at the moment.
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default memo(Services);