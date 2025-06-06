import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from '../context/ThemeContext';

function Header() {
  const { theme, currentTheme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isHomePage = location.pathname === '/' || location.pathname === '';

  const navLinks = [
    { name: 'About', href: '', sectionId: 'about' },
    { name: 'Services', href: '', sectionId: 'services' },
    { name: 'Testimonials', href: 'review' },
    {
      name: 'Research',
      dropdownItems: [
        { name: 'Publications', href: 'publications' },
        { name: 'Articles', href: 'articles' }
      ]
    },
  ];

  useEffect(() => {
    const handleScroll = () => {
      if (!isHomePage) {
        setIsScrolled(true);
        return;
      }

      const heroSection = document.getElementById('hero');
      if (heroSection) {
        const heroBottom = heroSection.offsetTop + heroSection.offsetHeight;
        setIsScrolled(window.scrollY);
      }
    };

    if (!isHomePage) {
      setIsScrolled(true);
    } else {
      setIsScrolled(false);
    }

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomePage]);

  const isTransparentHeader = isHomePage && !isScrolled;

  const handleNavClick = (href, sectionId) => {
    setIsMenuOpen(false); // Close mobile menu on click

    if (sectionId) {
      const header = document.querySelector('header');
      const headerHeight = header ? header.offsetHeight : 0;

      if (!isHomePage) {
        navigate('/');
        setTimeout(() => {
          const section = document.getElementById(sectionId);
          if (section) {
            const sectionTop = section.getBoundingClientRect().top + window.scrollY;
            window.scrollTo({
              top: sectionTop - headerHeight,
              behavior: 'smooth'
            });
          }
        }, 100);
        return;
      }

      const section = document.getElementById(sectionId);
      if (section) {
        const sectionTop = section.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({
          top: sectionTop - headerHeight,
          behavior: 'smooth'
        });
        return;
      }
    }

    window.scrollTo(0, 0);
    navigate(`/${href}`);
  };

  const handleNameClick = () => {
    setIsMenuOpen(false);
    if (!isHomePage) {
      navigate('/');
    }
    window.scrollTo(0, 0);
  };

  return (
    <>
      <style jsx="true">{`
        .home-header-transparent {
          background-color: transparent !important;
          border: none !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          z-index: 1 !important;
        }
        .header-colored  {
          background-color: ${currentTheme.surface};
          border-bottom: 1px solid ${currentTheme.border};
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          z-index: 50;
        }
      `}</style>
      
      <header 
        className={`px-4 md:px-8 py-4 fixed w-full top-0 ${isTransparentHeader && !isMenuOpen ? 'home-header-transparent' : 'header-colored'}`}
        style={{
          color: isTransparentHeader && !isMenuOpen ? '#ffffff' : currentTheme.text.primary,
          backgroundColor: isTransparentHeader && !isMenuOpen ? 'transparent' : currentTheme.surface, 
          transition: 'all 0.3s ease'
        }}
      >
        <div className="flex items-center justify-between">
          <Link 
            to="/" 
            className="text-xl md:text-2xl font-bold"
            onClick={handleNameClick}
          >
            Dr. Laxminadh Sivaraju
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              link.dropdownItems ? (
                <div key={link.name} className="relative group">
                  <button 
                    className="font-medium transition-colors duration-300 pb-1 flex items-center gap-1"
                    style={{ color: isTransparentHeader ? '#ffffff' : currentTheme.text.primary }}
                  >
                    {link.name}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div 
                    className="absolute left-0 mt-2 w-48 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300"
                    style={{ backgroundColor: currentTheme.surface, borderColor: currentTheme.border }}
                  >
                    {link.dropdownItems.map((item) => (
                      <Link
                        key={item.name}
                        to={`/${item.href}`}
                        className="block px-4 py-2 hover:opacity-80 transition-opacity"
                        style={{ color: currentTheme.text.primary }}
                        onClick={() => {
                          window.scrollTo(80,80);
                          navigate(`/${item.href}`);
                        }}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link
                  key={link.name}
                  to={isHomePage && link.sectionId ? '#' : `/${link.href}`}
                  className="relative font-medium transition-colors duration-300 pb-1"
                  style={{ color: isTransparentHeader ? '#ffffff' : currentTheme.text.primary }}
                  onClick={() => handleNavClick(link.href, link.sectionId)}
                >
                  {link.name}
                  <span
                    className="absolute inset-x-0 bottom-0 h-0.5 transform transition-transform duration-300 scale-x-0 group-hover:scale-x-100"
                    style={{ 
                      backgroundColor: currentTheme.primary,
                      transform: location.pathname === `/${link.href}` ? 'scaleX(1)' : 'scaleX(0)'
                    }}
                  ></span>
                </Link>
              )
            ))}
            <Link
              to="/bookappointment"
              style={{ backgroundColor: currentTheme.primary }}
              className="px-4 py-2 rounded-md text-white hover:opacity-90 transition-opacity"
              onClick={() => {
                window.scrollTo(0, 0);
                navigate('/bookappointment');
              }}
            >
              Book Appointment
            </Link>
            <button 
              style={{
                backgroundColor: currentTheme.surface,
                color: currentTheme.text.primary,
                border: `1px solid ${currentTheme.border}`,
              }}
              className="p-2 rounded-full transition-all duration-300 hover:opacity-80"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </nav>

          <div className="flex items-center gap-4 md:hidden">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full"
              style={{
                backgroundColor: currentTheme.surface,
                color: currentTheme.text.primary,
                border: `1px solid ${currentTheme.border}`,
              }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2"
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <nav className="md:hidden pt-4 pb-2" style={{ backgroundColor: currentTheme.surface }}>
            {navLinks.map((link) => (
              link.dropdownItems ? (
                <div key={link.name}>
                  <div className="px-4 py-2 font-medium" style={{ color: currentTheme.text.primary }}>
                    {link.name}
                  </div>
                  {link.dropdownItems.map((item) => (
                    <Link
                      key={item.name}
                      to={`/${item.href}`}
                      className="block py-2 px-8 transition-colors"
                      style={{ color: currentTheme.text.primary }}
                      onClick={() => {
                        setIsMenuOpen(false);
                        window.scrollTo(0, 0);
                        navigate(`/${item.href}`);
                      }}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  key={link.name}
                  to={isHomePage && link.sectionId ? '#' : `/${link.href}`}
                  className="block py-2 px-4 transition-colors"
                  style={{ color: currentTheme.text.primary }}
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleNavClick(link.href, link.sectionId);
                  }}
                >
                  {link.name}
                </Link>
              )
            ))}
            <Link
              to="/bookappointment"
              style={{ backgroundColor: currentTheme.primary }}
              className="block w-full mt-2 px-4 py-2 rounded-md text-white hover:opacity-90 transition-opacity text-center"
              onClick={() => {
                setIsMenuOpen(false);
                window.scrollTo(0, 0);
                navigate('/bookappointment');
              }}
            >
              Book Appointment
            </Link>
          </nav>
        )}
      </header>
    </>
  );
}

export default Header;