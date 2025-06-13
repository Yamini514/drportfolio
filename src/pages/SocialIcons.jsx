import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Facebook, Linkedin, Instagram, Twitter, Youtube } from 'lucide-react';

function SocialIconsResponsive() {
  const { currentTheme } = useTheme();

  const socialLinks = [
    { 
      icon: <Facebook size={20} />, 
      url: 'https://www.facebook.com/profile.php?id=100071881127167&mibextid=ZbWKwL',
      bgColor: '#1877F2', // Facebook blue
    },
    { 
      icon: <Twitter size={20} />, 
      url: 'https://x.com/DrLaxminadh?t=npuU8mu-OOyht0HuTdjA2w&s=09',
      bgColor: '#000000', // X black
    },
    { 
      icon: <Linkedin size={20} />, 
      url: 'https://www.linkedin.com/in/dr-laxminadh-sivaraju-neurosurgeon-90022674',
      bgColor: '#0A66C2', // LinkedIn blue
    },
    { 
      icon: <Instagram size={20} />, 
      url: 'https://www.instagram.com/dr_laxminadhneuro?igsh=dmkzZ3VieHZnOWQz',
      bgColor: '#E4405F', // Instagram pink (simplified from gradient)
    },
    { 
      icon: <Youtube size={20} />, 
      url: 'https://www.youtube.com/channel/UClNNzst7yNACujYrsBtdZAQ',
      bgColor: '#FF0000', // YouTube red
    }
  ];

  return (
    <div className="flex flex-row space-x-4">
      {socialLinks.map((social, index) => (
        <a
          key={index}
          href={social.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center transition-transform duration-300 hover:scale-110"
          aria-label={`Visit Dr. Laxminadh Sivaraju's profile on ${social.url.split('.')[1]}`}
        >
          <div 
            className="p-2 rounded-full"
            style={{ 
              backgroundColor: social.bgColor,
              color: '#FFFFFF', // White icons to contrast with colored backgrounds
            }}
          >
            {social.icon}
          </div>
        </a>
      ))}
    </div>
  );
}

export default SocialIconsResponsive;