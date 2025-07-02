
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { auth, db } from "../firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { User, UserCircle } from "lucide-react";
import CustomButton from "./CustomButton";

function Header() {
  const { theme, currentTheme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [pid, setPid] = useState(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showLogoutSuccess, setShowLogoutSuccess] = useState(false);
  const [isResearchDropdownOpen, setIsResearchDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const userMenuRef = useRef(null);
  const headerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const isScrollingRef = useRef(false);

  const isHomePage = location.pathname === "/" || location.pathname === "";
  const isTransparentHeader = isHomePage && !isScrolled && !isMenuOpen;

  console.log(
    "isTransparentHeader:",
    isTransparentHeader,
    "isScrolled:",
    isScrolled,
    "isMenuOpen:",
    isMenuOpen,
    "theme:",
    theme,
    "currentTheme.background:",
    currentTheme.background,
    "isResearchDropdownOpen:",
    isResearchDropdownOpen
  );

  const navLinks = [
    { name: "Home", href: "/", sectionId: "hero" },
    { name: "About", href: "/#about", sectionId: "about" },
    { name: "Services", href: "/#services", sectionId: "services" },
    { name: "Testimonials", href: "/review", sectionId: null },
    { name: "Gallery", href: "/#gallery", sectionId: "gallery" },
    { name: "Contact", href: "/#contact", sectionId: "contact" }, // Change to "reach-us" if section ID is <section id="reach-us">
    {
      name: "Research",
      dropdownItems: [
        { name: "Publications", href: "/publications", sectionId: null },
        { name: "Articles", href: "/articles", sectionId: null },
      ],
    },
  ];

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
            const userPid = userDoc.data().pid || null;
            setPid(userPid);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
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
    const handleScroll = () => {
      const scrolled = window.scrollY > 0;
      setIsScrolled(scrolled);
      console.log("Scroll detected, isScrolled:", scrolled);
    };
    setIsScrolled(window.scrollY > 0);
    if (!isHomePage) setIsScrolled(true);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHomePage]);

  const scrollToSection = useCallback((sectionId, maxRetries = 30, retryDelay = 100) => {
    if (isScrollingRef.current) {
      console.log(`Scroll to ${sectionId} blocked: another scroll is in progress`);
      return;
    }

    isScrollingRef.current = true;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    let attempts = 0;

    const attemptScroll = () => {
      const section = document.getElementById(sectionId);
      if (section) {
        const headerHeight = headerRef.current?.offsetHeight || 75;
        // Prioritize "Reach Us" heading or form, log for debugging
        const reachUsHeading = section.querySelector("h2, h3")?.textContent === "Reach Us" ? section.querySelector("h2, h3") : null;
        const contentElement = reachUsHeading || section.querySelector("form, [class*='contact'], [class*='reach']") || section;
        console.log(`Targeting element for ${sectionId}:`, contentElement.tagName, contentElement.className, "Text:", reachUsHeading?.textContent || "N/A");
        const contentTop = contentElement.getBoundingClientRect().top + window.scrollY + headerHeight - 125; // Increased offset to -100

        window.history.replaceState(null, null, `#${sectionId}`);
        window.scrollTo({ top: contentTop, behavior: "smooth" });

        scrollTimeoutRef.current = setTimeout(() => {
          const currentPosition = window.scrollY;
          const targetRange = contentTop;
          if (Math.abs(currentPosition - targetRange) > 20) {
            console.warn(`Scroll to ${sectionId} not at correct position. Current: ${currentPosition}, Target: ${targetRange}`);
            if (attempts < maxRetries) {
              attempts++;
              attemptScroll();
            } else {
              console.error(`Failed to scroll to ${sectionId} after ${maxRetries} retries`);
              isScrollingRef.current = false;
            }
          } else {
            console.log(`Successfully scrolled to ${sectionId}, contentTop: ${contentTop}, headerHeight: ${headerHeight}`);
            isScrollingRef.current = false;
          }
        }, 1000);

        return true;
      }
      console.warn(`Section ${sectionId} not found, retrying... (Attempt ${attempts + 1}/${maxRetries})`);
      return false;
    };

    const tryScroll = () => {
      if (attempts < maxRetries) {
        if (!attemptScroll()) {
          attempts++;
          scrollTimeoutRef.current = setTimeout(tryScroll, retryDelay);
        }
      } else {
        console.error(`Failed to find section ${sectionId} after ${maxRetries} retries`);
        isScrollingRef.current = false;
      }
    };

    tryScroll();
  }, []);

  useEffect(() => {
    if (isHomePage && location.hash) {
      const sectionId = location.hash.replace("#", "");
      console.log("Hash detected, triggering scroll to:", sectionId);
      window.scrollTo(0, 0);
      const timer = setTimeout(() => {
        scrollToSection(sectionId);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, location.hash, isHomePage, scrollToSection]);

  const handleNavClick = useCallback((href, sectionId, e) => {
    e.preventDefault();
    setIsMenuOpen(false);
    setIsResearchDropdownOpen(false);

    if (href.startsWith("/#") && sectionId) {
      console.log("Navigating to section:", sectionId);
      if (!isHomePage) {
        navigate("/", { scrollRestoration: "manual" });
        setTimeout(() => {
          window.history.replaceState(null, null, `#${sectionId}`);
          scrollToSection(sectionId);
        }, 600);
      } else {
        window.history.replaceState(null, null, `#${sectionId}`);
        scrollToSection(sectionId);
      }
    } else {
      navigate(href, { scrollRestoration: "manual" });
      window.scrollTo(0, 0);
    }
  }, [navigate, isHomePage, scrollToSection]);

  const handleNameClick = () => {
    setIsMenuOpen(false);
    setIsResearchDropdownOpen(false);
    navigate("/", { scrollRestoration: "manual" });
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
      navigate("/", { replace: true, scrollRestoration: "manual" });
      window.scrollTo(0, 0);
      setTimeout(() => setShowLogoutSuccess(false), 2000);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleBookAppointmentClick = () => {
    if (!user) {
      localStorage.setItem("redirectAfterLogin", "/bookappointment");
      navigate("/login", { state: { redirectTo: "/bookappointment" }, scrollRestoration: "manual" });
    } else {
      navigate("/bookappointment", { scrollRestoration: "manual" });
    }
    window.scrollTo(0, 0);
    setIsMenuOpen(false);
    setIsResearchDropdownOpen(false);
  };

  const userMenu = user ? (
    <div className="relative group" ref={userMenuRef}>
      <button
        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
        className="flex items-center gap-2 font-medium transition-colors duration-300 text-sm sm:text-base"
        style={{ color: getTextColor() }}
      >
        <User className="w-4 sm:w-5 h-5" style={{ color: theme === "light" ? "#1f2937" : "#ffffff" }} />
      </button>
      {isUserMenuOpen && (
        <div
          className="absolute right-0 mt-2 w-48 rounded-md shadow-lg dropdown-menu z-50 animate-fadeIn"
          style={{
            backgroundColor: currentTheme.surface || (theme === "dark" ? "#2d2d2d" : "#ffffff"),
            borderColor: currentTheme.border || (theme === "dark" ? "#444444" : "#e5e7eb"),
            color: theme === "dark" ? "#ffffff" : "#000000",
          }}
        >
          <div className="py-1">
            <div className="px-4 py-2 text-sm">PID: {pid || "Not Available"}</div>
            <Link
              to="/my-appointments"
              className="block px-4 py-2 hover:bg-opacity-10 hover:bg-gray-500 transition-all duration-200 text-sm"
              onClick={() => setIsUserMenuOpen(false)}
            >
              My Appointments
            </Link>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 hover:bg-opacity-10 hover:bg-gray-500 transition-all duration-200 text-left text-sm"
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
      className="flex items-center gap-2 font-medium transition-colors duration-300 hover:underline text-sm sm:text-base"
      style={{ color: getTextColor() }}
      onClick={() => setIsMenuOpen(false)}
    >
      <UserCircle className="w-4 sm:w-5 h-5" style={{ color: theme === "light" ? "#1f2937" : "#ffffff" }} />
    </Link>
  );

  const handleResearchToggle = () => {
    setIsResearchDropdownOpen(!isResearchDropdownOpen);
    console.log("Toggled Research dropdown, isResearchDropdownOpen:", !isResearchDropdownOpen);
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
          background-color: ${currentTheme.background || (theme === "dark" ? "#1a1a1a" : "#ffffff")} !important;
          border-bottom: 1px solid ${currentTheme.border || (theme === "dark" ? "#444444" : "#e5e7eb")} !important;
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
        .group:hover .dropdown-menu {
          opacity: 1 !important;
          visibility: visible !important;
          transform: translateY(0);
        }
        .research-dropdown .dropdown-menu {
          display: ${isResearchDropdownOpen ? "block" : "none"};
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
      >
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="text-lg sm:text-xl md:text-2xl font-bold truncate"
            onClick={handleNameClick}
          >
            Dr. Laxminadh Sivaraju
          </Link>
          <nav className="hidden md:flex items-center gap-4 lg:gap-8">
            {navLinks.map((link) =>
              link.dropdownItems ? (
                <div key={link.name} className="relative group research-dropdown">
                  <button
                    onClick={handleResearchToggle}
                    className={`font-medium transition-colors duration-300 flex items-center gap-1 text-sm lg:text-base ${link.name === "Research" ? "research-button" : ""}`}
                  >
                    {link.name}
                    <svg className="w-3 lg:w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div
                    className="absolute left-0 mt-2 w-48 rounded-md shadow-lg dropdown-menu z-50 animate-fadeIn"
                    style={{
                      backgroundColor: currentTheme.surface || (theme === "dark" ? "#2d2d2d" : "#ffffff"),
                      borderColor: currentTheme.border || (theme === "dark" ? "#444444" : "#e5e7eb"),
                    }}
                  >
                    {link.dropdownItems.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className="block px-4 py-2 hover:bg-opacity-10 hover:bg-gray-500 text-sm"
                        onClick={(e) => handleNavClick(item.href, item.sectionId, e)}
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
                >
                  {link.name}
                  <span
                    className="absolute inset-x-0 bottom-0 h-0.5 transform transition-transform duration-300 scale-x-0 group-hover:scale-x-100"
                    style={{
                      backgroundColor: currentTheme.primary || "#7c3aed",
                      transform: location.pathname === link.href || (link.href.startsWith("/#") && location.hash === link.href.replace("/#", "")) ? "scaleX(1)" : "scaleX(0)",
                    }}
                  ></span>
                </Link>
              )
            )}
            <CustomButton
              variant="primary"
              onClick={handleBookAppointmentClick}
              className="text-sm lg:text-base"
            >
              Book Appointment
            </CustomButton>
            {userMenu}
            <span
              onClick={toggleTheme}
              className="cursor-pointer p-2 text-sm lg:text-base"
              style={{ color: getTextColor() }}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </span>
          </nav>
          <div className="flex items-center gap-2 sm:gap-4 md:hidden">
            <span
              onClick={toggleTheme}
              className="cursor-pointer p-1 sm:p-2 text-sm sm:text-base"
              style={{ color: getTextColor() }}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </span>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 sm:p-2"
              aria-label="Toggle menu"
            >
              <svg
                className="w-5 sm:w-6 h-6"
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
          <nav className="md:hidden pt-4 pb-2" style={{ backgroundColor: currentTheme.background || (theme === "dark" ? "#1a1a1a" : "#ffffff") }}>
            {navLinks.map((link) =>
              link.dropdownItems ? (
                <div key={link.name}>
                  <div
                    onClick={handleResearchToggle}
                    className="px-4 py-2 font-medium text-sm sm:text-base"
                    style={{ color: theme === "light" ? "#000000" : "#e5e7eb", cursor: "pointer" }}
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
                >
                  {link.name}
                </Link>
              )
            )}
            {user ? (
              <div className="px-4 py-2">
                <div className="px-4 py-2 text-sm" style={{ color: theme === "light" ? "#000000" : "#e5e7eb" }}>
                  PID: {pid || "Not Available"}
                </div>
                <Link
                  to="/my-appointments"
                  className="block py-2 px-4 hover:bg-opacity-10 hover:bg-gray-500 text-sm sm:text-base"
                  style={{ color: theme === "light" ? "#000000" : "#e5e7eb" }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  My Appointments
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full py-2 px-4 hover:bg-opacity-10 hover:bg-gray-500 text-left text-sm sm:text-base"
                  style={{ color: theme === "light" ? "#000000" : "#e5e7eb" }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 py-2 px-4 hover:bg-opacity-10 hover:bg-gray-500 text-sm sm:text-base"
                style={{ color: theme === "light" ? "#000000" : "#e5e7eb" }}
                onClick={() => setIsMenuOpen(false)}
              >
                <UserCircle className="w-4 sm:w-5 h-5" style={{ color: theme === "light" ? "#1f2937" : "#ffffff" }} />
                Login
              </Link>
            )}
            <CustomButton
              variant="primary"
              onClick={handleBookAppointmentClick}
              className="block w-auto justify-center mt-2 mx-4 text-sm sm:text-base"
            >
              Book Appointment
            </CustomButton>
          </nav>
        )}
        {showLogoutSuccess && (
          <div className="logout-toast">
            Successfully logged out
          </div>
        )}
      </header>
    </>
  );
}

export default Header;
