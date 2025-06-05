import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { FaGraduationCap, FaAward, FaBrain, FaBook } from 'react-icons/fa';
import HeaderComponent from '../components/HeaderComponent';
import drImage from '../assets/drimg.png'; // Add this import

function About() {
  const { currentTheme } = useTheme();
  const [aboutData, setAboutData] = useState({
    title: "About Dr. Laxminadh Sivaraju",
    description: "Dr. Laxminadh Sivaraju is a Consultant Neuro & Spine Surgeon at Care Hospital - HITEC City Branch. Dr. Laxminadh did his five years neurosurgery residency from the Christian Medical College, Vellore which is renowned medical institute, training neurosurgeons across India for more than 7 decades. After his residency he joined and worked as consultant neurosurgeon in Sri Sathya Sai Institute of Higher Medical Sciences, Bangalore which is a well known tertiary centre for its yeoman service in health care. In his prominent career of over 12 years as a neuro surgery specialist, Dr. Laxminadh has performed more than 2000 neurosurgical procedures. He has a meritorious academic record with more than 30 publications in various international peer reviewed journals. He had given more than 10 podium presentations in national and international conferences. He was also NSI (Neurological Society of India) award winner for his work on Arnold-Chiari Malformation. He has membership in several professional and scientific societies. He had obtained trainee fellowship in Neuroendoscopy and minimal invasive neurosurgery from University of Greifswald, Germany under guidance of Prof. Henry Shroeder.",
    image: "../assets/drimg.png", // Default image path
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
    // Set header background
    const header = document.querySelector('header');
    if (header) {
      header.style.backgroundColor = currentTheme.surface;
      header.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    }
    
    // Load data from localStorage if available
    const savedData = localStorage.getItem('aboutPageData');
    if (savedData) {
      setAboutData(JSON.parse(savedData));
    }
  }, [currentTheme.surface]);

  // Function to render the correct icon component
  const renderIcon = (iconName) => {
    switch (iconName) {
      case 'FaGraduationCap': return <FaGraduationCap className="w-6 h-6" />;
      case 'FaAward': return <FaAward className="w-6 h-6" />;
      case 'FaBrain': return <FaBrain className="w-6 h-6" />;
      case 'FaBook': return <FaBook className="w-6 h-6" />;
      default: return <FaGraduationCap className="w-6 h-6" />;
    }
  };

  return (
    <div className="px-5 md:px-15 pb-12 mt-5 md:pb-10 lg:px-20" style={{ backgroundColor: currentTheme.background }}>
      {/* Image and Content Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-start mb-8">
        {/* Image Section */}
        <div className="relative">
          <div className="rounded-lg overflow-hidden">
            <img
              src={aboutData.image}
              alt="Dr. Laxminadh Sivaraju"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = drImage;
              }}
            />
          </div>
          <div className="absolute inset-0 rounded-lg"
            style={{ background: `linear-gradient(to bottom, transparent 50%, ${currentTheme.surface})` }}
          ></div>
        </div>

        {/* Content Section */}
        <div>
          <HeaderComponent 
            title={aboutData.title}
            description={aboutData.description}
            className="mb-8 text-justify"
            style={{ color: currentTheme.text.primary }}
          />
        </div>
      </div>

      {/* Achievements Grid - Responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {aboutData.achievements.map((item, index) => (
          <div
              key={index}
              style={{
                backgroundColor: currentTheme.surface, 
                borderColor: currentTheme.border,
                borderWidth: '3px',
              }}
              className="p-4 rounded-lg border"
          >
              <div 
                className="mb-4 mt-4 text-center transition-transform duration-300 group-hover:scale-110 flex justify-center items-center"
                style={{ color: currentTheme.primary }}
              >
                {renderIcon(item.icon)}
              </div>
              <h3 className="text-xl font-semibold mb-3 text-center">{item.title}</h3>
              <p style={{ color: currentTheme.text.secondary }}>
                {item.description}
              </p>
          </div>
      ))}
      </div>
    </div>
  );
}

export default About;