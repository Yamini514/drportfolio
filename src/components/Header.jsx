import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { User, LogOut, Calendar, UserCircle } from 'lucide-react';
import CustomButton from './CustomButton';

function Header() {
  const { theme, currentTheme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const userMenuRef = useRef(null);

  const isHomePage = location.pathname === '/' || location.pathname === '';

  const navLinks = [
    { name: 'Home', href: '' },
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

  const getTextColor = useCallback(() => {
    const color = isHomePage && !isScrolled && !isMenuOpen
      ? currentTheme.textContrast || '#ffffff'
      : currentTheme.text || (theme === 'light' ? '#000000' : '#e5e7eb');
    return color;
  }, [isHomePage, isScrolled, isMenuOpen, theme, currentTheme]);

  const getResearchTextColor = useCallback(() => {
    if (theme === 'dark' || (isHomePage && !isScrolled && !isMenuOpen)) {
      return '#ffffff'; // White for dark mode or transparent background
    }
    return '#000000'; // Black for white background
  }, [theme, isHomePage, isScrolled, isMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let currentUid = null;
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser && currentUid && currentUser.uid !== currentUid) {
        return;
      }
      setUser(currentUser);
      if (currentUser) {
        currentUid = currentUser.uid;
        const userRoleFromStorage = localStorage.getItem('userRole');
        if (userRoleFromStorage) {
          setUserRole(userRoleFromStorage);
        } else {
          const cachedRole = localStorage.getItem(`userRole_${currentUser.uid}`);
          if (cachedRole) {
            setUserRole(cachedRole);
          } else {
            try {
              const userDocRef = doc(db, 'users', currentUser.uid);
              const userDoc = await getDoc(userDocRef);
              const role = userDoc.exists() ? userDoc.data().role || 'user' : 'user';
              setUserRole(role);
              localStorage.setItem(`userRole_${currentUser.uid}`, role);
              localStorage.setItem('userRole', role);
            } catch (error) {
              console.error('Error fetching user role:', error);
              setUserRole('user');
              localStorage.setItem(`userRole_${currentUser.uid}`, 'user');
              localStorage.setItem('userRole', 'user');
            }
          }
        }
      } else {
        setUserRole(null);
        localStorage.removeItem('userRole');
        localStorage.removeItem(`userRole_${currentUid}`);
        currentUid = null;
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);
    setIsScrolled(window.scrollY > 0);
    if (!isHomePage) setIsScrolled(true);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomePage]);

  useEffect(() => {
    if (isHomePage && location.state?.scrollTo) {
      const sectionId = location.state.scrollTo;
      const scrollToSection = () => {
        const section = document.getElementById(sectionId);
        if (section) {
          const sectionTop = section.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: sectionTop - 75, behavior: 'smooth' });
        } else {
          setTimeout(scrollToSection, 100);
        }
      };
      scrollToSection();
    }
  }, [location.pathname, location.state, isHomePage]);

  const isTransparentHeader = isHomePage && !isScrolled && !isMenuOpen;

  const handleNavClick = (href, sectionId, e) => {
    if (sectionId) e.preventDefault();
    setIsMenuOpen(false);
    if (sectionId) {
      const headerHeight = document.querySelector('header')?.offsetHeight || 0;
      if (!isHomePage) {
        navigate('/', { state: { scrollTo: sectionId } });
        return;
      }
      const section = document.getElementById(sectionId);
      if (section) {
        const sectionTop = section.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: sectionTop - 75, behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo(0, 0);
    navigate(`/${href}`);
  };

  const handleNameClick = () => {
    setIsMenuOpen(false);
    if (!isHomePage) navigate('/');
    window.scrollTo(0, 0);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setUserRole(null);
      setIsUserMenuOpen(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleBookAppointmentClick = () => {
    if (!user) {
      localStorage.setItem('redirectAfterLogin', '/bookappointment');
      navigate('/login', { state: { redirectTo: '/book-appointment' } });
    } else {
      navigate('/bookappointment');
    }
    window.scrollTo(0, 0);
    setIsMenuOpen(false);
  };

  const userMenu = user ? (
    <div className="relative group">
      <button
        className="flex items-center gap-2 font-medium transition-colors duration-300"
        style={{ color: `${isTransparentHeader && theme === 'dark' ? '#000000' : getTextColor()} !important` }}
      >
        <User className="w-5 h-5" />
        <span>{user.email ? user.email[0].toUpperCase() : 'U'}</span>
      </button>
      <div
        className="absolute right-0 mt-2 w-48 rounded-md shadow-lg dropdown-menu"
        style={{
          backgroundColor: currentTheme.surface || (theme === 'dark' ? '#2d2d2d' : '#ffffff'),
          borderColor: currentTheme.border || (theme === 'dark' ? '#444444' : '#e5e7eb'),
          color: theme === 'dark' ? '#ffffff' : '#000000'
        }}
      >
        <div className="py-1">
          {userRole !== 'admin' && (
            <Link
              to="/my-appointments"
              className="flex items-center gap-2 px-4 py-2 hover:bg-opacity-10 hover:bg-gray-500 transition-all duration-200"
              onClick={() => setIsUserMenuOpen(false)}
            >
              <Calendar className="w-4 h-4" />
              My Appointments
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-opacity-10 hover:bg-gray-500 transition-all duration-200 text-left"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  ) : (
    <Link
      to="/login"
      className="flex items-center gap-2 font-medium transition-colors duration-300 hover:underline login-link"
      style={{ color: isTransparentHeader && theme === 'light' ? '#000000' : getTextColor() }}
      onClick={() => setIsMenuOpen(false)}
      title="Login"
    >
      <UserCircle className="w-5 h-5" />
    </Link>
  );

  return (
    <>
      <style jsx="true">{`
        .home-header-transparent {
          background-color: transparent !important;
          border: none !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          z-index: 50 !important;
          pointer-events: auto !important;
        }
        .header-colored {
          background-color: ${currentTheme.background || (theme === 'dark' ? '#1a1a1a' : '#ffffff')} !important;
          border-bottom: 1px solid ${currentTheme.border || (theme === 'dark' ? '#444444' : '#e5e7eb')};
          backdrop-filter: blur(10px);
          z-index: 50;
        }
        header a, header svg, header p {
          color: ${getTextColor()} !important;
        }
        header .group:hover > button {
          color: ${getTextColor()} !important;
        }
        header .group .absolute a {
          color: ${theme === 'light' ? '#000000' : '#e5e7eb'} !important;
        }
        .dropdown-menu {
          z-index: 100 !important;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s ease, visibility 0.3s ease, transform 0.3s ease;
          transform: translateY(-10px);
        }
        .group:hover .dropdown-menu {
          opacity: 1 !important;
          visibility: visible !important;
          transform: translateY(0);
        }
        .research-button {
          color: ${getResearchTextColor()} !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
      <header
        key={theme}
        className={`px-4 md:px-8 py-4 fixed w-full top-0 ${isTransparentHeader ? 'home-header-transparent' : 'header-colored'}`}
        style={{
          backgroundColor: isTransparentHeader ? 'transparent' : (currentTheme.background || (theme === 'dark' ? '#1a1a1a' : '#ffffff')),
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
                    className={`font-medium transition-colors duration-300 flex items-center gap-1 ${link.name === 'Research' ? 'research-button' : ''}`}
                  >
                    {link.name}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div
                    className="absolute left-0 mt-2 w-48 rounded-md shadow-lg dropdown-menu"
                    style={{
                      backgroundColor: currentTheme.surface || (theme === 'dark' ? '#2d2d2d' : '#ffffff'),
                      borderColor: currentTheme.border || (theme === 'dark' ? '#444444' : '#e5e7eb')
                    }}
                  >
                    {link.dropdownItems.map((item) => (
                      <Link
                        key={item.name}
                        to={`/${item.href}`}
                        className="block px-4 py-2 hover:bg-opacity-10 hover:bg-gray-500"
                        onClick={() => {
                          window.scrollTo(0, 0);
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
                  onClick={(e) => handleNavClick(link.href, link.sectionId, e)}
                >
                  {link.name}
                  <span
                    className="absolute inset-x-0 bottom-0 h-0.5 transform transition-transform duration-300 scale-x-0 group-hover:scale-x-100"
                    style={{
                      backgroundColor: currentTheme.primary || '#7c3aed',
                      transform: location.pathname === `/${link.href}` ? 'scaleX(1)' : 'scaleX(0)'
                    }}
                  ></span>
                </Link>
              )
            ))}
            <CustomButton
              variant="primary"
              onClick={handleBookAppointmentClick}
            >
              Book Appointment
            </CustomButton>
            {userMenu}
            <span
              onClick={toggleTheme}
              className="cursor-pointer p-2"
              style={{ color: getTextColor() }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </span>
          </nav>
          <div className="flex items-center gap-4 md:hidden">
            <span
              onClick={toggleTheme}
              className="cursor-pointer p-2"
              style={{ color: getTextColor() }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </span>
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
          <nav className="md:hidden pt-4 pb-2" style={{ backgroundColor: currentTheme.background || (theme === 'dark' ? '#1a1a1a' : '#ffffff') }}>
            {navLinks.map((link) => (
              link.dropdownItems ? (
                <div key={link.name}>
                  <div className="px-4 py-2 font-medium" style={{ color: theme === 'light' ? '#000000' : '#e5e7eb' }}>
                    {link.name}
                  </div>
                  {link.dropdownItems.map((item) => (
                    <Link
                      key={item.name}
                      to={`/${item.href}`}
                      className="block py-2 px-8 hover:bg-opacity-10 hover:bg-gray-500"
                      style={{ color: theme === 'light' ? '#000000' : '#e5e7eb' }}
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
                  className="block py-2 px-4 hover:bg-opacity-10 hover:bg-gray-500"
                  style={{ color: theme === 'light' ? '#000000' : '#e5e7eb' }}
                  onClick={(e) => handleNavClick(link.href, link.sectionId, e)}
                >
                  {link.name}
                </Link>
              )
            ))}
            {user ? (
              <div className="px-4 py-2">
                {userRole !== 'admin' && (
                  <Link
                    to="/my-appointments"
                    className="flex items-center gap-2 py-2 px-4 hover:bg-opacity-10 hover:bg-gray-500"
                    style={{ color: theme === 'light' ? '#000000' : '#e5e7eb' }}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Calendar className="w-4 h-4" />
                    My Appointments
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 py-2 px-4 hover:bg-opacity-10 hover:bg-gray-500 text-left"
                  style={{ color: theme === 'light' ? '#000000' : '#e5e7eb' }}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 py-2 px-4 hover:bg-opacity-10 hover:bg-gray-500"
                style={{ color: theme === 'light' ? '#000000' : '#e5e7eb' }}
                onClick={() => setIsMenuOpen(false)}
              >
                <UserCircle className="w-4 h-4" />
                Login
              </Link>
            )}
            <CustomButton
              variant="primary"
              onClick={handleBookAppointmentClick}
              className="block w-full mt-2 mx-4"
            >
              Book Appointment
            </CustomButton>
          </nav>
        )}
      </header>
    </>
  );
}

export default Header;