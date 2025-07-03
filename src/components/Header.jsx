import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { auth, db } from "../firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { User, UserCircle } from "lucide-react";
import CustomButton from "./CustomButton";

// Constants for navigation links (SEO: Improves maintainability)
const navLinks = [
  { name: "About", href: "/", sectionId: "about" },
  { name: "Services", href: "/", sectionId: "services" },
  { name: "Testimonials", href: "/review", sectionId: null },
  { name: "Gallery", href: "/", sectionId: "gallery" },
  { name: "Contact", href: "/", sectionId: "contact" },
  {
    name: "Research",
    dropdownItems: [
      { name: "Publications", href: "/publications", sectionId: null },
      { name: "Articles", href: "/articles", sectionId: null },
    ],
  },
];

// SEO: Structured data for JSON-LD
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Dr. Laxminadh Sivaraju",
  url: "https://www.drlaxminadhsivaraju.com",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://www.drlaxminadhsivaraju.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

function Header() {
  const { theme, currentTheme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [pid, setPid] = useState(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showLogoutSuccess, setShowLogoutSuccess] = useState(false);
  const [isResearchDropdownOpen, setIsResearchDropdownOpen] = useState(false);
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const userMenuRef = useRef(null);
  const headerRef = useRef(null);

  const isHomePage = location.pathname === "/" || location.pathname === "";
  const isTransparentHeader = isHomePage && !isScrolled && !isMenuOpen;

  // SEO: Dynamic meta tags for each page
  const getPageMeta = useCallback(() => {
    const meta = {
      title: "Dr. Laxminadh Sivaraju - Neurosurgeon",
      description: "Expert neurosurgery services by Dr. Laxminadh Sivaraju.",
      ogImage: "https://www.drlaxminadhsivaraju.com/og-image.jpg",
    };
    switch (location.pathname) {
      case "/bookappointment":
        meta.title = "Book Appointment with Dr. Laxminadh Sivaraju";
        meta.description = "Schedule your consultation with Dr. Laxminadh Sivaraju.";
        break;
      case "/review":
        meta.title = "Testimonials - Dr. Laxminadh Sivaraju";
        meta.description = "Read patient testimonials for Dr. Laxminadh Sivaraju.";
        break;
      case "/login":
        meta.title = "Login - Dr. Laxminadh Sivaraju";
        meta.description = "Access your account to book appointments.";
        break;
      case "/publications":
        meta.title = "Publications - Dr. Laxminadh Sivaraju";
        meta.description = "Explore research publications by Dr. Laxminadh Sivaraju.";
        break;
      case "/articles":
        meta.title = "Articles - Dr. Laxminadh Sivaraju";
        meta.description = "Read insightful articles by Dr. Laxminadh Sivaraju.";
        break;
      default:
        if (location.hash === "#contact") {
          meta.title = "Contact Dr. Laxminadh Sivaraju";
          meta.description = "Get in touch with Dr. Laxminadh Sivaraju for consultations.";
        }
        break;
    }
    return meta;
  }, [location.pathname, location.hash]);

  // SEO: Update document meta tags and scroll to top
  useEffect(() => {
    const { title, description, ogImage } = getPageMeta();
    document.title = title;
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = description;

    // SMO: Open Graph and Twitter Card tags
    const ogTags = [
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: window.location.href },
      { property: "og:image", content: ogImage },
      { property: "twitter:card", content: "summary_large_image" },
      { property: "twitter:title", content: title },
      { property: "twitter:description", content: description },
      { property: "twitter:image", content: ogImage },
    ];

    ogTags.forEach(({ property, content }) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("property", property);
        document.head.appendChild(tag);
      }
      tag.content = content;
    });

    // SEO: Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.href;

    // SEO: Structured data
    let script = document.querySelector('script[type="application/ld+json"]');
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(structuredData);

    // Scroll to top on page navigation
    window.scrollTo(0, 0);
  }, [getPageMeta, location.pathname]);

  const getTextColor = useCallback(() => {
    return isHomePage && !isScrolled && !isMenuOpen
      ? currentTheme.textContrast || "#ffffff"
      : currentTheme.text || (theme === "light" ? "#000000" : "#e5e7eb");
  }, [isHomePage, isScrolled, isMenuOpen, theme, currentTheme]);

  const getResearchTextColor = useCallback(() => {
    return theme === "dark" || (isHomePage && !isScrolled && !isMenuOpen)
      ? "#ffffff"
      : "#000000";
  }, [theme, isHomePage, isScrolled, isMenuOpen]);

  // Optimized debounce function
  const debounce = useCallback((func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
      if (!event.target.closest(".research-dropdown") && isResearchDropdownOpen) {
        setIsResearchDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isResearchDropdownOpen]);

  useEffect(() => {
    let currentUid = null;
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser && currentUid && currentUser.uid !== currentUid) return;
      setUser(currentUser);
      if (currentUser) {
        currentUid = currentUser.uid;
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setPid(userDoc.data().pid || null);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setError("Failed to load user data. Please try again.");
        }
      } else {
        setUser(null);
        setPid(null);
        currentUid = null;
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = debounce(() => {
      setIsScrolled(window.scrollY > 0);
    }, 100);

    setIsScrolled(window.scrollY > 0);
    if (!isHomePage) setIsScrolled(true);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHomePage, debounce]);

  const handleNavClick = useCallback(
    (href, sectionId, e) => {
      e.preventDefault();
      setIsMenuOpen(false);
      setIsResearchDropdownOpen(false);

      const scrollToSection = (retryCount = 0, maxRetries = 15, delay = 300) => {
        const section = document.getElementById(sectionId);
        if (section) {
          requestAnimationFrame(() => {
            const headerHeight = headerRef.current?.offsetHeight || 75;
            const contentTop = section.getBoundingClientRect().top + window.scrollY - headerHeight;
            window.scrollTo({ top: contentTop, behavior: "smooth" });
          });
        } else if (retryCount < maxRetries) {
          setTimeout(() => scrollToSection(retryCount + 1, maxRetries, delay), delay);
        } else {
          console.warn(`Section ${sectionId} not found after ${maxRetries} retries`);
        }
      };

      if (href === "/" && sectionId) {
        if (location.pathname !== "/") {
          navigate("/");
          setTimeout(() => scrollToSection(0, 15, 300), 1000);
        } else {
          scrollToSection();
        }
      } else {
        navigate(href);
        window.scrollTo(0, 0);
        if (sectionId) {
          setTimeout(() => scrollToSection(0, 15, 300), 1000);
        }
      }
    },
    [navigate, location.pathname]
  );

  const handleNameClick = () => {
    setIsMenuOpen(false);
    setIsResearchDropdownOpen(false);
    navigate("/");
    window.scrollTo(0, 0);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setPid(null);
      setIsUserMenuOpen(false);
      setIsResearchDropdownOpen(false);
      setShowLogoutSuccess(true);
      localStorage.removeItem("redirectAfterLogin");
      navigate("/");
      window.scrollTo(0, 0);
      setTimeout(() => setShowLogoutSuccess(false), 2000);
    } catch (error) {
      console.error("Logout error:", error);
      setError("Failed to log out. Please try again.");
    }
  };

  const handleBookAppointmentClick = () => {
    if (!user) {
      localStorage.setItem("redirectAfterLogin", "/bookappointment");
      navigate("/login", { state: { redirectTo: "/bookappointment" } });
    } else {
      navigate("/bookappointment");
    }
    window.scrollTo(0, 0);
    setIsMenuOpen(false);
    setIsResearchDropdownOpen(false);
  };

  const userMenu = user ? (
    <div className="relative group" ref={userMenuRef}>
      <button
        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
        className="flex items-center gap-2 font-medium transition-colors duration-300 text-sm sm:text-base cursor-pointer"
        style={{ color: getTextColor() }}
        aria-label="User menu"
      >
        <User
          className="w-4 sm:w-5 h-5"
          style={{ color: theme === "light" ? "#1f2937" : "#ffffff" }}
          aria-hidden="true"
          role="img"
          title="User profile"
        />
      </button>
      {isUserMenuOpen && (
        <div
          className="absolute right-0 mt-2 w-48 rounded-md shadow-lg dropdown-menu z-50 animate-fadeIn"
          style={{
            backgroundColor: currentTheme.surface || (theme === "dark" ? "#2d2d2d" : "#ffffff"),
            borderColor: currentTheme.border || (theme === "dark" ? "#444444" : "#e5e7eb"),
            color: theme === "dark" ? "#ffffff" : "#000000",
          }}
          role="menu"
          aria-labelledby="user-menu"
        >
          <div className="py-1">
            <div className="px-4 py-2 text-sm">PID: {pid || "Not Available"}</div>
            <Link
              to="/my-appointments"
              className="block px-4 py-2 hover:bg-opacity-10 hover:bg-gray-500 transition-all duration-200 text-sm"
              onClick={() => setIsUserMenuOpen(false)}
              role="menuitem"
            >
              My Appointments
            </Link>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 hover:bg-opacity-10 hover:bg-gray-500 transition-all duration-200 text-left text-sm"
              role="menuitem"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  ) : (
    <Link
      to="/login"
      className="flex items-center gap-2 font-medium transition-colors duration-300 hover:underline text-sm sm:text-base cursor-pointer"
      style={{ color: getTextColor() }}
      onClick={() => setIsMenuOpen(false)}
      aria-label="Login to your account"
    >
      <UserCircle
        className="w-4 sm:w-5 h-5"
        style={{ color: theme === "light" ? "#1f2937" : "#ffffff" }}
        aria-hidden="true"
        role="img"
        title="Login"
      />
    </Link>
  );

  const handleResearchToggle = () => {
    setIsResearchDropdownOpen(!isResearchDropdownOpen);
  };

  return (
    <>
      <style>{`
        header.home-header-transparent {
          background-color: transparent !important;
          border: none !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          z-index: 50 !important;
        }
        header.header-colored {
          background-color: ${
            currentTheme.background || (theme === "dark" ? "#1a1a1a" : "#ffffff")
          } !important;
          border-bottom: 1px solid ${
            currentTheme.border || (theme === "dark" ? "#444444" : "#e5e7eb")
          } !important;
          backdrop-filter: blur(10px) !important;
          z-index: 50 !important;
        }
        header a, header svg, header p {
          color: ${getTextColor()} !important;
        }
        header .group:hover > button {
          color: ${getTextColor()} !important;
        }
        header .group .absolute a {
          color: ${theme === "light" ? "#000000" : "#e5e7eb"} !important;
        }
        .dropdown-menu {
          z-index: 1000 !important;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s ease, visibility 0.3s ease, transform 0.3s ease;
          transform: translateY(-10px);
        }
        .group:hover .dropdown-menu:not(.research-dropdown .dropdown-menu) {
          opacity: 1 !important;
          visibility: visible !important;
          transform: translateY(0);
        }
        .research-dropdown .dropdown-menu {
          display: ${isResearchDropdownOpen ? "block" : "none"};
          opacity: ${isResearchDropdownOpen ? "1" : "0"};
          visibility: ${isResearchDropdownOpen ? "visible" : "hidden"};
          transform: ${isResearchDropdownOpen ? "translateY(0)" : "translateY(-10px)"};
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
        .logout-toast {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background-color: #10B981;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          z-index: 1000;
          animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .error-message {
          position: fixed;
          bottom: 20px;
          left: 20px;
          background-color: #EF4444;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          z-index: 1000;
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
      <header
        ref={headerRef}
        key={theme}
        className={`px-4 sm:px-6 md:px-8 py-3 sm:py-4 fixed w-full top-0 ${isTransparentHeader ? "home-header-transparent" : "header-colored"}`}
        style={{
          backgroundColor: isTransparentHeader
            ? "transparent"
            : currentTheme.background || (theme === "dark" ? "#1a1a1a" : "#ffffff"),
          transition: "all 0.3s ease",
        }}
        role="banner"
      >
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="text-lg sm:text-xl md:text-2xl font-bold truncate"
            onClick={handleNameClick}
            aria-label="Dr. Laxminadh Sivaraju Home"
          >
            Dr. Laxminadh Sivaraju
          </Link>
          <nav
            className="hidden md:flex items-center gap-4 lg:gap-8"
            role="navigation"
            aria-label="Main navigation"
          >
            {navLinks.map((link) =>
              link.dropdownItems ? (
                <div
                  key={link.name}
                  className="relative group research-dropdown"
                  role="menu"
                  aria-label="Research menu"
                >
                  <button
                    onClick={handleResearchToggle}
                    className={`font-medium transition-colors duration-300 flex items-center gap-1 text-sm lg:text-base ${
                      link.name === "Research" ? "research-button" : ""
                    }`}
                    aria-expanded={isResearchDropdownOpen}
                    aria-controls={`research-menu-${link.name}`}
                  >
                    {link.name}
                    <svg
                      className="w-3 lg:w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      role="img"
                      title="Dropdown arrow"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  <div
                    id={`research-menu-${link.name}`}
                    className="absolute left-0 mt-2 w-48 rounded-md shadow-lg dropdown-menu z-50 animate-fadeIn"
                    style={{
                      backgroundColor:
                        currentTheme.surface ||
                        (theme === "dark" ? "#2d2d2d" : "#ffffff"),
                      borderColor:
                        currentTheme.border ||
                        (theme === "dark" ? "#444444" : "#e5e7eb"),
                    }}
                    role="menu"
                  >
                    {link.dropdownItems.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className="block px-4 py-2 hover:bg-opacity-10 hover:bg-gray-500 text-sm"
                        onClick={(e) => handleNavClick(item.href, item.sectionId, e)}
                        role="menuitem"
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link
                  key={link.name}
                  to={link.href}
                  className="relative font-medium transition-colors duration-300 pb-1 text-sm lg:text-base"
                  onClick={(e) => handleNavClick(link.href, link.sectionId, e)}
                  role="menuitem"
                  aria-current={
                    location.pathname === link.href ||
                    (link.href === "/" && location.hash === `#${link.sectionId}`)
                      ? "page"
                      : undefined
                  }
                >
                  {link.name}
                  <span
                    className="absolute inset-x-0 bottom-0 h-0.5 transform transition-transform duration-300 scale-x-0 group-hover:scale-x-100"
                    style={{
                      backgroundColor: currentTheme.primary || "#7c3aed",
                      transform:
                        location.pathname === link.href ||
                        (link.href === "/" && location.hash === `#${link.sectionId}`)
                          ? "scaleX(1)"
                          : "scaleX(0)",
                    }}
                  ></span>
                </Link>
              )
            )}
            <CustomButton
              variant="primary"
              onClick={handleBookAppointmentClick}
              className="text-sm lg:text-base"
              aria-label="Book an appointment"
            >
              Book Appointment
            </CustomButton>
            {userMenu}
            <button
              onClick={toggleTheme}
              className="cursor-pointer p-2 text-sm lg:text-base"
              style={{ color: getTextColor() }}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </nav>
          <div className="flex items-center gap-2 sm:gap-4 md:hidden">
            <button
              onClick={toggleTheme}
              className="cursor-pointer p-1 sm:p-2 text-sm sm:text-base"
              style={{ color: getTextColor() }}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 sm:p-2"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              <svg
                className="w-5 sm:w-6 h-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
                role="img"
                title={isMenuOpen ? "Close menu" : "Open menu"}
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
          <nav
            className="md:hidden pt-4 pb-2"
            style={{
              backgroundColor:
                currentTheme.background ||
                (theme === "dark" ? "#1a1a1a" : "#ffffff"),
            }}
            role="navigation"
            aria-label="Mobile navigation"
          >
            {navLinks.map((link) =>
              link.dropdownItems ? (
                <div key={link.name}>
                  <div
                    onClick={handleResearchToggle}
                    className="px-4 py-2 font-medium text-sm sm:text-base"
                    style={{ color: theme === "light" ? "#000000" : "#e5e7eb" }}
                    role="button"
                    aria-expanded={isResearchDropdownOpen}
                    aria-controls={`mobile-research-menu-${link.name}`}
                  >
                    {link.name}
                  </div>
                  {isResearchDropdownOpen &&
                    link.dropdownItems.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className="block py-2 px-8 hover:bg-opacity-10 hover:bg-gray-500 text-sm sm:text-base"
                        style={{ color: theme === "light" ? "#000000" : "#e5e7eb" }}
                        onClick={(e) => handleNavClick(item.href, item.sectionId, e)}
                        role="menuitem"
                      >
                        {item.name}
                      </Link>
                    ))}
                </div>
              ) : (
                <Link
                  key={link.name}
                  to={link.href}
                  className="block py-2 px-4 hover:bg-opacity-10 hover:bg-gray-500 text-sm sm:text-base"
                  style={{ color: theme === "light" ? "#000000" : "#e5e7eb" }}
                  onClick={(e) => handleNavClick(link.href, link.sectionId, e)}
                  role="menuitem"
                  aria-current={
                    location.pathname === link.href ||
                    (link.href === "/" && location.hash === `#${link.sectionId}`)
                      ? "page"
                      : undefined
                  }
                >
                  {link.name}
                </Link>
              )
            )}
            {user ? (
              <div className="px-4 py-2">
                <div
                  className="px-4 py-2 text-sm"
                  style={{ color: theme === "light" ? "#000000" : "#e5e7eb" }}
                >
                  PID: {pid || "Not Available"}
                </div>
                <Link
                  to="/my-appointments"
                  className="block py-2 px-4 hover:bg-opacity-10 hover:bg-gray-500 text-sm sm:text-base"
                  style={{ color: theme === "light" ? "#000000" : "#e5e7eb" }}
                  onClick={() => setIsMenuOpen(false)}
                  role="menuitem"
                >
                  My Appointments
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full py-2 px-4 hover:bg-opacity-10 hover:bg-gray-500 text-left text-sm sm:text-base"
                  style={{ color: theme === "light" ? "#000000" : "#e5e7eb" }}
                  role="menuitem"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 py-2 px-4 hover:bg-opacity-10 hover:bg-gray-500 text-sm sm:text-base cursor-pointer"
                style={{ color: theme === "light" ? "#000000" : "#e5e7eb" }}
                onClick={() => setIsMenuOpen(false)}
                role="menuitem"
                aria-label="Login to your account"
              >
                <UserCircle
                  className="w-4 sm:w-5 h-5"
                  style={{ color: theme === "light" ? "#1f2937" : "#ffffff" }}
                  aria-hidden="true"
                  role="img"
                  title="Login"
                />
                Login
              </Link>
            )}
            <CustomButton
              variant="primary"
              onClick={handleBookAppointmentClick}
              className="block w-auto justify-center mt-2 mx-4 text-sm sm:text-base"
              aria-label="Book an appointment"
            >
              Book Appointment
            </CustomButton>
          </nav>
        )}
        {showLogoutSuccess && (
          <div className="logout-toast" role="alert">
            Successfully logged out
          </div>
        )}
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
      </header>
    </>
  );
}

export default memo(Header);