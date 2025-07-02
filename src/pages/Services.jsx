import React, { useEffect, useState } from 'react';
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

function Services({id}) {
  const { currentTheme } = useTheme();
  const [services, setServices] = useState([]);

  // Get the icon component based on the icon name string
  const getIconComponent = (iconName) => {
    switch(iconName) {
      case 'FaBrain': return <FaBrain className="w-12 h-12" />;
      case 'FaXRay': return <FaXRay className="w-12 h-12" />;
      case 'FaNotesMedical': return <FaNotesMedical className="w-12 h-12" />;
      case 'FaMicroscope': return <FaMicroscope className="w-12 h-12" />;
      case 'FaStethoscope': return <FaStethoscope className="w-12 h-12" />;
      case 'FaHospital': return <FaHospital className="w-12 h-12" />;
      case 'FaHeartbeat': return <FaHeartbeat className="w-12 h-12" />;
      case 'FaLaptopMedical': return <FaLaptopMedical className="w-12 h-12" />;
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
          .sort((a, b) => a.title.localeCompare(b.title)); // Sort services alphabetically by title
        setServices(servicesList);
      } catch (error) {
        console.error("Error fetching services:", error);
        // In case of error, set services to empty array
        setServices([]);
      }
    };

    fetchServices();
  }, []);

  return (
    <section id="services" >
    <div className=" px-5  pb-10 md:px-15 md:pb-20 p-8" style={{ backgroundColor: currentTheme.background }}>
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">My Services</h1>
          <p className="text-lg" style={{ color: currentTheme.text.secondary }}>
            I provide comprehensive neurosurgical care using the latest technologies and techniques to ensure optimal patient outcomes.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div
              key={service.id}
              style={{
                backgroundColor: currentTheme.surface, 
                borderColor: currentTheme.border,
                borderWidth: '3px',  
              }}
              className="rounded-lg border-2 p-6 flex flex-col items-center text-center group hover:shadow-xl transition-all duration-300"
            >
              <div 
                className="mb-4  mt-4 transition-transform duration-300 group-hover:scale-110"
                style={{ color: currentTheme.primary }}
              >
                {getIconComponent(service.icon)}
              </div>
              <h3 className="text-xl font-semibold mb-3">{service.title}</h3>
              <p 
                className="mb-4 flex-grow text-left"
                style={{ color: currentTheme.text.secondary }}
              >
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Services;