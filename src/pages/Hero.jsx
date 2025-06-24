import React, { useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import {
  FaUserMd,
  FaBrain,
  FaUsers,
  FaTrophy,
  FaBook,
  FaChalkboardTeacher,
  FaGlobe,
  FaSmile,
  FaStar,
} from "react-icons/fa";
import bgImage from "../assets/bgimg11.jpg"; // Add this import
import bg from "../assets/brain-scan-image.jpg"

function Hero() {
  const { currentTheme } = useTheme();

  useEffect(() => {
    const header = document.querySelector("header");
    if (header) {
      // Make header transparent in Hero section
      header.style.backgroundColor = "transparent";
      header.style.boxShadow = "none";

      // Cleanup function
      return () => {
        header.style.backgroundColor = currentTheme.surface;
        header.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
      };
    }
  }, [currentTheme.surface]);

  const stats = [
    { icon: <FaUserMd />, count: "15+", label: "Years Experience" },
    { icon: <FaBrain />, count: "500+", label: "Brain Tumor Resections" },
    { icon: <FaUsers />, count: "1000+", label: "Patient Consultations" },
    { icon: <FaTrophy />, count: "3+", label: "National Awards" },
    { icon: <FaBook />, count: "30+", label: "Peer-Reviewed Publications" },
    {
      icon: <FaChalkboardTeacher />,
      count: "50+",
      label: "Trained Neurosurgeons",
    },
    { icon: <FaGlobe />, count: "15+", label: "International Conferences" },
    { icon: <FaSmile />, count: "100%", label: "Satisfied Patients" },
  ];

  return (
    <div
      id="hero"
      className="min-h-screen pt-20 pb-24 px-4 relative bg-gray-900 text-white"
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${bg})`,
          backgroundColor: "black",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: "0.2",
        }}
      />

      {/* Content */}
      <div className="container mx-auto relative z-10">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex items-center px-6 py-2 gap-3 rounded-full bg-purple-100/20">
              <FaStar
                className="w-8 h-8 fill-yellow-400 stroke-purple-950"
                style={{ strokeWidth: "10px" }}
              />

              <p className="text-lg md:text:xl font-medium text-gray-200">
              One of the leading Neurosurgeons in Hyderabad.
              </p>
            </div>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-8 text-white">
            Advanced Neurosurgical
            <br />
            <span className="text-purple-500">Care & Expertise</span>
          </h1>
          <p className="text-2xl max-w-4xl mx-auto text-gray-200 leading-relaxed">
            Providing innovative and compassionate neurological treatment with
            cutting-edge technology and personalized patient care.
          </p>
        </div>

        {/* Stats section */}
        <div className="overflow-hidden mt-16">
          <div className="flex animate-scroll">
            <div className="flex gap-8 md:gap-12 ">
              {[...stats, ...stats].map((stat, index) => (
                <div
                  key={index}
                  className="text-center min-w-[120px] md:min-w-[140px]"
                >
                  <div className="text-2xl md:text-3xl mb-4 flex justify-center text-purple-500">
                    {stat.icon}
                  </div>
                  <div className="text-xl md:text-2xl font-bold mb-2 text-white">
                    {stat.count}
                  </div>
                  <p className="text-xs md:text-sm text-gray-200">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Hero;
