import React from 'react';
import { useTheme } from '../context/ThemeContext';
import SocialIconsResponsive from '../pages/SocialIcons'; // Import the updated component

function Footer() {
  const { currentTheme } = useTheme();

  return (
    <footer
      style={{
        backgroundColor: currentTheme.surface,
        color: currentTheme.text.primary,
        borderTop: `1px solid ${currentTheme.border}`
      }}
      className="pt-12 pb-6"
    >
      <div className="container mx-auto px-4">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* About Section */}
          <div className="w-full md:max-w-[300px]">
            <h3 className="text-xl font-bold mb-3 md:mb-4">Dr. Laxminadh Sivaraju</h3>
            <p className="text-sm text-justify md:text-left" style={{ color: currentTheme.text.secondary }}>
              Leading neurosurgical care in Hyderabad with a focus on innovation, 
              compassion, and patient-centered treatment.
            </p>
            {/* Add Social Icons Here */}
            <h3 className='text-lg font-semibold mb-4 mt-8'>Social Media</h3>
            <SocialIconsResponsive />
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {['Reviews', 'ContactMe'].map((link) => (
                <li key={link}>
                  <a 
                    href={`/${link.toLowerCase() === 'reviews' ? 'review' : link.toLowerCase().replace(' ', '-')}`}
                    className="text-sm hover:text-primary transition-colors"
                    style={{ color: currentTheme.text.secondary }}
                  >
                    {link === 'ContactMe' ? 'Contact' : link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Services</h3>
            <ul className="space-y-2">
              {[
                'Brain Tumor Surgery',
                'Spine Surgery',
                'Neurological Disorders',
                'Microsurgery'
              ].map((service) => (
                <li key={service}>
                  <a 
                    href="services"
                    className="text-sm hover:text-primary transition-colors"
                    style={{ color: currentTheme.text.secondary }}
                  >
                    {service}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Clinic Hours */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Consulting Hours</h3>
            <ul className="space-y-2">
              <li className="text-sm" style={{ color: currentTheme.text.secondary }}>
                <span className="font-medium" style={{ color: currentTheme.text.primary }}>CARE Hospitals</span><br />
                11:00 AM to 05:00 PM
              </li>
              <li className="text-sm" style={{ color: currentTheme.text.secondary }}>
                <span className="font-medium" style={{ color: currentTheme.text.primary }}>Clinic</span><br />
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
              © 2025 Dr. Laxminadh Sivaraju Neurosurgen | All Rights Reserved.
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