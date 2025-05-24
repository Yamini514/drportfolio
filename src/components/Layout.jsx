import React from 'react';
import Header from './Header';
import Footer from './Footer';
import { Outlet } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
 
const Layout = ({ children }) => {
  const location = useLocation();
  const isHomePage = location.pathname === '/' || location.pathname === '';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {!isHomePage && <div className="h-[72px] md:h-[80px]"></div>} {/* Spacer only for non-home pages */}
      <main className="flex-grow">
        <Outlet/>
      </main>
      <Footer />
    </div>
  );
};
 
export default Layout;