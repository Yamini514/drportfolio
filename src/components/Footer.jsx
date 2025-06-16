import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import SocialIconsResponsive from '../pages/SocialIcons';

function Footer() {
  const { currentTheme } = useTheme();
  const navigate = useNavigate();

  const handleServicesClick = (e) => {
    e.preventDefault();
    if (window.location.pathname === '/') {
      // If already on homepage, scroll to services section
      const section = document.getElementById('services');
      if (section) {
        const sectionTop = section.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({
          top: sectionTop - 75, // Adjust for header height
          behavior: 'smooth',
        });
      }
    } else {
      // Navigate to homepage with state to scroll to services
      navigate('/', { state: { scrollTo: 'services' } });
    }
  };

  return (
    <footer
      style={{
        backgroundColor: currentTheme.surface,
        color: currentTheme.text.primary,
        borderTop: `1px solid ${currentTheme.border}`,
      }}
      className="pt-12 pb-6"
    >
      <div className="container mx-auto px-4">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {/* About Section */}
          <div className="w-full md:max-w-[300px]">
            <h3 className="text-xl font-bold mb-3 md:mb-4">Dr. Laxminadh Sivaraju</h3>
            <p className="text-sm text-justify md:text-left" style={{ color: currentTheme.text.secondary }}>
              Leading neurosurgical care in Hyderabad with a focus on innovation,
              compassion, and patient-centered treatment.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Quick Links</h3>
            <ul className="space-y-2">
              {['Reviews', 'ContactMe', 'Services', 'Terms and Conditions'].map((link) => (
                <li key={link}>
                  <a
                    href={
                      link === 'Services'
                        ? '#'
                        : `/${link.toLowerCase() === 'reviews' ? 'review' : link.toLowerCase().replace(' ', '-')}`
                    }
                    onClick={link === 'Services' ? handleServicesClick : undefined}
                    className="text-sm hover:underline transition-colors"
                    style={{
                      color: currentTheme.text.secondary,
                      '--hover-color': currentTheme.primary || '#9333ea',
                    }}
                  >
                    {link === 'ContactMe' ? 'Contact' : link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Social Media */}
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold mb-3">Social Media</h3>
            <SocialIconsResponsive size={18} />
          </div>

          {/* Clinic Hours */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Clinic Hours</h3>
            <ul className="space-y-2">
              <li className="text-sm" style={{ color: currentTheme.text.secondary }}>
                <span className="font-medium" style={{ color: currentTheme.text.primary }}>
                  CARE Hospitals
                </span>
                <br />
                11:00 AM to 05:00 PM
              </li>
              <li className="text-sm" style={{ color: currentTheme.text.secondary }}>
                <span className="font-medium" style={{ color: currentTheme.text.primary }}>
                  Clinic
                </span>
                <br />
                06:00 PM to 07:00 PM
              </li>
              <li className="text-sm" style={{ color: currentTheme.text.secondary }}>
                Sunday: Closed
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t" style={{ borderColor: currentTheme.border }}>
          <div className="pt-6 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm mb-4 md:mb-0" style={{ color: currentTheme.text.secondary }}>
              © 2025 Dr. Laxminadh Sivaraju Neurosurgeon | All Rights Reserved.
            </p>
            <a
              href="https://srinishtha.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-purple-600 hover:to-blue-600 transition-all duration-300 cursor-pointer"
            >
              Powered by Srinishtha Technologies LLP
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;