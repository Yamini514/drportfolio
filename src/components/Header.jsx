import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { User, LogOut, Calendar } from 'lucide-react';

function Header() {
  const { theme, currentTheme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollToSection, setScrollToSection] = useState(null);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const userMenuRef = useRef(null);

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
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleScroll = () => {
      setIsUserMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    let currentUid = null;
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      console.log('Auth state changed, user:', currentUser?.uid, 'email:', currentUser?.email);
      
      if (currentUser && currentUid && currentUser.uid !== currentUid) {
        console.log('UID mismatch, ignoring auth state change. Expected:', currentUid, 'Received:', currentUser.uid);
        return;
      }

      setUser(currentUser);
      if (currentUser) {
        currentUid = currentUser.uid;
        const cachedRole = localStorage.getItem(`userRole_${currentUser.uid}`);
        if (cachedRole) {
          console.log('Using cached role for uid:', currentUser.uid, 'role:', cachedRole);
          setUserRole(cachedRole);
          return;
        }

        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const role = userData.role || 'user';
            console.log('Fetched role for uid:', currentUser.uid, 'role:', role);
            setUserRole(role);
            localStorage.setItem(`userRole_${currentUser.uid}`, role);
          } else {
            console.log('No user document for uid:', currentUser.uid);
            setUserRole('user');
            localStorage.setItem(`userRole_${currentUser.uid}`, 'user');
          }
        } catch (error) {
          console.error('Error fetching user role for uid:', currentUser.uid, error);
          setUserRole('user');
          localStorage.setItem(`userRole_${currentUser.uid}`, 'user');
        }
      } else {
        console.log('No user logged in');
        setUserRole(null);
        localStorage.removeItem(`userRole_${currentUid}`);
        currentUid = null;
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 0;
      console.log('Scroll detected, window.scrollY:', window.scrollY, 'isScrolled:', scrolled);
      setIsScrolled(scrolled);
    };

    setIsScrolled(window.scrollY > 0);
    console.log('Initial scroll check, isHomePage:', isHomePage, 'isScrolled:', window.scrollY > 0);

    if (!isHomePage) {
      setIsScrolled(true);
    }

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomePage]);

  useEffect(() => {
    if (isHomePage && scrollToSection) {
      const timer = setTimeout(() => {
        const section = document.getElementById(scrollToSection);
        if (section) {
          const sectionTop = section.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({
            top: sectionTop + 10,
            behavior: 'smooth'
          });
        }
        setScrollToSection(null);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, scrollToSection, isHomePage]);

  const isTransparentHeader = isHomePage && !isScrolled && !isMenuOpen;
  console.log('Header state:', { isHomePage, isScrolled, isMenuOpen, isTransparentHeader, theme, currentTheme });

  const getTextColor = () => {
    if (isTransparentHeader) {
      return currentTheme.textContrast || '#ffffff';
    }
    return theme === 'light' ? '#000000' : (currentTheme.text || '#e5e7eb');
  };

  const handleNavClick = (href, sectionId, e) => {
    if (sectionId) {
      e.preventDefault();
    }
    setIsMenuOpen(false);

    if (sectionId) {
      const header = document.querySelector('header');
      const headerHeight = header ? header.offsetHeight : 0;

      if (!isHomePage) {
        navigate('/');
        setScrollToSection(sectionId);
        return;
      }

      const section = document.getElementById(sectionId);
      if (section) {
        const sectionTop = section.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({
          top: sectionTop - 75,
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

  const handleLogout = async () => {
    try {
      console.log('Attempting logout...');
      await auth.signOut();
      setUser(null);
      setUserRole(null);
      setIsUserMenuOpen(false);
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleBookAppointmentClick = () => {
    if (!user) {
      localStorage.setItem('redirectAfterLogin', '/bookappointment');
      navigate('/login', { state: { redirectTo: '/bookappointment' } });
    } else {
      navigate('/bookappointment');
    }
    window.scrollTo(0, 0);
    setIsMenuOpen(false);
  };

  const userMenu = (
    <>
      {user ? (
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsUserMenuOpen(!isUserMenuOpen);
              console.log('User menu toggled, isUserMenuOpen:', !isUserMenuOpen);
            }}
            className="flex items-center justify-center gap-2 p-2 rounded-full hover:opacity-80 w-8 h-8"
            style={{ 
              backgroundColor: currentTheme.primary || '#7c3aed',
              color: currentTheme.textContrast || '#ffffff'
            }}
          >
            {user.email ? user.email[0].toUpperCase() : <User className="w-5 h-5" />}
          </button>
          
          {isUserMenuOpen && (
            <div
              className="absolute right-0 mt-2 w-48 rounded-md shadow-lg z-50"
              style={{ 
                backgroundColor: currentTheme.surface || (theme === 'dark' ? '#2d2d2d' : '#ffffff'),
                border: `1px solid ${currentTheme.border || (theme === 'dark' ? '#444444' : '#e5e7eb')}`,
                color: theme === 'light' ? '#000000' : (currentTheme.text || '#e5e7eb')
              }}
            >
              <div className="py-1">
                <div className="px-4 py-239 border-b" style={{ borderColor: currentTheme.border || (theme === 'dark' ? '#444444' : '#e5e7eb') }}>
                  <p className="text-sm truncate" style={{ color: theme === 'light' ? '#000000' : (currentTheme.text || '#e5e7eb') }}>
                    {user.email}
                  </p>
                  <p className="text-xs truncate" style={{ color: theme === 'light' ? '#000000' : (currentTheme.text || '#e5e7eb') }}>
                    {userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : 'User'}
                  </p>
                </div>
                {userRole !== 'admin' && (
                  <Link
                    to="/my-appointments"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-opacity-10 hover:bg-gray-500"
                    style={{ color: theme === 'light' ? '#000000' : (currentTheme.text || '#e5e7eb') }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsUserMenuOpen(false);
                    }}
                  >
                    <Calendar className="w-4 h-4" />
                    My Appointments
                  </Link>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLogout();
                    setIsUserMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 hover:bg-opacity-10 hover:bg-gray-500 text-left"
                  style={{ color: theme === 'light' ? '#000000' : (currentTheme.text || '#e5e7eb') }}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => navigate('/login')}
          className="px-4 py-2 rounded-md font-medium hover:opacity-90 transition-opacity"
          style={{ 
            backgroundColor: currentTheme.primary || '#7c3aed',
            color: currentTheme.textContrast || '#ffffff'
          }}
        >
          Login
        </button>
      )}
    </>
  );

  return (
    <>
      <style jsx="true">{`
        .home-header-transparent {
          background-color: transparent !important;
          border: none !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          z-index: 50 !important;
          pointer-events: auto !important;
        }
        .header-colored {
          background-color: ${currentTheme.background || (theme === 'dark' ? '#1a1a1a' : '#ffffff')} !important;
          border-bottom: 1px solid ${currentTheme.border || (theme === 'dark' ? '#444444' : '#e5e7eb')};
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          z-index: 50;
        }
      `}</style>
      
      <header 
        className={`px-4 md:px-8 py-4 fixed w-full top-0 ${isTransparentHeader ? 'home-header-transparent' : 'header-colored'}`}
        style={{
          color: getTextColor(),
          backgroundColor: isTransparentHeader ? 'transparent' : (currentTheme.background || (theme === 'dark' ? '#1a1a1a' : '#ffffff')),
          transition: 'all 0.3s ease'
        }}
      >
        <div className="flex items-center justify-between">
          <Link 
            to="/" 
            className="text-xl md:text-2xl font-bold"
            onClick={handleNameClick}
            style={{ color: getTextColor() }}
          >
            Dr. Laxminadh Sivaraju
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              link.dropdownItems ? (
                <div key={link.name} className="relative group">
                  <button 
                    className="font-medium transition-colors duration-300 pb-1 flex items-center gap-1"
                    style={{ color: getTextColor() }}
                    onMouseEnter={() => console.log('Research dropdown opened, theme:', theme)}
                  >
                    {link.name}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div 
                    className="absolute left-0 mt-2 w-48 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50"
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
                        style={{ color: theme === 'light' ? '#000000' : (currentTheme.text || '#e5e7eb') }}
                        onClick={() => {
                          window.scrollTo(0,0);
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
                  style={{ color: getTextColor() }}
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
            <button
              onClick={handleBookAppointmentClick}
              style={{ backgroundColor: currentTheme.primary || '#7c3aed', color: currentTheme.textContrast || '#ffffff' }}
              className="px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
            >
              Book Appointment
            </button>
            {userMenu}
            <button 
              style={{
                backgroundColor: currentTheme.surface || (theme === 'dark' ? '#2d2d2d' : '#ffffff'),
                color: getTextColor(),
                border: `1px solid ${currentTheme.border || (theme === 'dark' ? '#444444' : '#e5e7eb')}`
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
                backgroundColor: currentTheme.surface || (theme === 'dark' ? '#2d2d2d' : '#ffffff'),
                color: getTextColor(),
                border: `1px solid ${currentTheme.border || (theme === 'dark' ? '#444444' : '#e5e7eb')}`
              }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button
              onClick={() => {
                setIsMenuOpen(!isMenuOpen);
                console.log('Mobile menu toggled, isMenuOpen:', !isMenuOpen);
              }}
              className="p-2"
              style={{ color: getTextColor() }}
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
                  <div className="px-4 py-2 font-medium" style={{ color: theme === 'light' ? '#000000' : (currentTheme.text || '#e5e7eb') }}>
                    {link.name}
                  </div>
                  {link.dropdownItems.map((item) => (
                    <Link
                      key={item.name}
                      to={`/${item.href}`}
                      className="block py-2 px-8 hover:bg-opacity-10 hover:bg-gray-500"
                      style={{ color: theme === 'light' ? '#000000' : (currentTheme.text || '#e5e7eb') }}
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
                  style={{ color: theme === 'light' ? '#000000' : (currentTheme.text || '#e5e7eb') }}
                  onClick={(e) => handleNavClick(link.href, link.sectionId, e)}
                >
                  {link.name}
                </Link>
              )
            ))}
            {user ? (
              <div className="px-4 py-2">
                <p className="text-sm truncate" style={{ color: theme === 'light' ? '#000000' : (currentTheme.text || '#e5e7eb') }}>
                  {user.email}
                </p>
                <p className="text-xs truncate" style={{ color: theme === 'light' ? '#000000' : (currentTheme.text || '#e5e7eb') }}>
                  {userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : 'User'}
                </p>
                {userRole !== 'admin' && (
                  <Link
                    to="/my-appointments"
                    className="block py-2 px-4 hover:bg-opacity-10 hover:bg-gray-500"
                    style={{ color: theme === 'light' ? '#000000' : (currentTheme.text || '#e5e7eb') }}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    My Appointments
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="block py-2 px-4 hover:bg-opacity-10 hover:bg-gray-500"
                  style={{ color: theme === 'light' ? '#000000' : (currentTheme.text || '#e5e7eb') }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="block py-2 px-4 hover:bg-opacity-10 hover:bg-gray-500"
                style={{ color: theme === 'light' ? '#000000' : (currentTheme.text || '#e5e7eb') }}
                onClick={() => setIsMenuOpen(false)}
              >
                Login
              </Link>
            )}
            <button
              onClick={handleBookAppointmentClick}
              style={{ backgroundColor: currentTheme.primary || '#7c3aed', color: currentTheme.textContrast || '#ffffff' }}
              className="block w-full mt-2 px-4 py-2 rounded-md hover:opacity-90 transition-opacity text-center"
            >
              Book Appointment
            </button>
          </nav>
        )}
      </header>
    </>
  );
}

export default Header;