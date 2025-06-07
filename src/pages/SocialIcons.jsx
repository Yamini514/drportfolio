import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Facebook, Linkedin, Instagram, Share2, X, Youtube, Users, Network, Globe, Globe2, Globe2Icon, GlobeIcon, Rss, UserPlus, UserPlus2 } from 'lucide-react';

// Custom X (Twitter) icon component
const XIcon = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

function SocialIconsResponsive() {
  const { currentTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const socialLinks = [
    { 
      // name: 'Facebook', 
      icon: <Facebook size={20} />, 
      url: 'https://www.facebook.com/profile.php?id=100071881127167&mibextid=ZbWKwL',
      bgColor: '#1877F2' 
    },
    { 
      // name: 'Twitter', 
      icon: <XIcon size={20} />, 
      url: 'https://x.com/DrLaxminadh?t=npuU8mu-OOyht0HuTdjA2w&s=09',
      bgColor: '#000000' 
    },
    { 
      // name: 'LinkedIn', 
      icon: <Linkedin size={20} />, 
      url: 'https://www.linkedin.com/in/dr-laxminadh-sivaraju-neurosurgeon-90022674',
      bgColor: '#0A66C2' 
    },
    { 
      // name: 'Instagram', 
      icon: <Instagram size={20} />, 
      url: 'https://www.instagram.com/dr_laxminadhneuro?igsh=dmkzZ3VieHZnOWQz',
      bgColor: '#E4405F' 
    },
    { 
      // name: 'YouTube', 
      icon: <Youtube size={20} />, 
      url: 'https://www.youtube.com/channel/UClNNzst7yNACujYrsBtdZAQ'
    }
  ];

  const toggleSocialBar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Desktop version - visible on medium screens and up */}
      <div 
        // className="fixed right-0 top-1/2 transform -translate-y-1/2 z-50 hidden md:block"
        
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        <div>
          <div className="flex flex-row">
            {socialLinks.map((social, index) => (
              <a
                key={index}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center group relative"
                aria-label={`Visit Dr. Laxminadh Sivaraju's ${social.name} profile`}
              >
                <div 
                  className="p-1 hover:pr-4 transition-all duration-300 backdrop-blur-sm"
                  style={{ color: currentTheme.primary }}
                >
                  {social.icon}
                </div>
                
              </a>
            ))}
          </div>
        </div>
  
      </div>
    </>
  );
}

export default SocialIconsResponsive;