import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="relative z-50">
        <Header onMenuClick={toggleSidebar} />
      </div>
      <div className="flex flex-1 overflow-hidden relative">
        <div
          className={`fixed inset-0 z-20 transition-opacity duration-300 lg:hidden ${
            sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
        <aside
          className={`
            fixed lg:relative w-64 h-[calc(100vh-64px)] z-30 transform transition-transform duration-300 ease-in-out lg:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </aside>
        <main
          className="flex-1 overflow-x-hidden overflow-y-auto relative"
          role="main"
        >
          <div className="container  mt-16 mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;