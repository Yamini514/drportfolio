import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Calendar, 
  Video, 
  Image, 
  BarChart2, 
  Info, 
  ChevronDown,
  LogOut,
  BookOpen,
  FileText as FileTextIcon,
  MessageSquare,
  Mail  // Add this import
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getAuth, signOut } from 'firebase/auth';

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTheme } = useTheme();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [expandedMenus, setExpandedMenus] = useState({
    media: false,
    content: false
  });

  // Set active section based on current path
  useEffect(() => {
    const path = location.pathname.split('/').pop();
    setActiveSection(path);
    
    // Expand relevant menus based on path
    if (path === 'video') {
      setExpandedMenus(prev => ({ ...prev, media: true }));
    }
    if (path === 'about') {
      setExpandedMenus(prev => ({ ...prev, content: true }));
    }
  }, [location.pathname]);

  const menuItems = [
    // { id: 'dashboard', name: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'services', name: 'Services', icon: <FileText size={18} /> },
    { id: 'appointments', name: 'Appointments', icon: <Calendar size={18} /> },
    { id: 'media', name: 'Media', subItems: [
      { id: 'video', name: 'Video', icon: <Video size={18} /> },
    ], icon: <Image size={18} /> },
    { id: 'publications', name: 'Publications', icon: <BookOpen size={18} /> },
    { id: 'messages', name: 'Messages', icon: <Mail size={18} /> },  // Add this line
    { id: 'reviews', name: 'Reviews', icon: <MessageSquare size={18} /> },  // Add this line
    // { id: 'stats', name: 'Statistics', icon: <BarChart2 size={18} /> },
    // { id: 'content', name: 'Content', subItems: [
    //   { id: 'about', name: 'About', icon: <Info size={18} /> },
    // ], icon: <FileText size={18} /> },
  ];

  const toggleSubMenu = (id) => {
    setExpandedMenus(prev => {
      const isCurrentlyOpen = prev[id];
      const reset = Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {});
      return {
        ...reset,
        [id]: !isCurrentlyOpen
      };
    });
  };

  const handleSectionSelect = (id) => {
    setActiveSection(id);
    if (['video'].includes(id)) {
      setExpandedMenus(prev => ({ ...prev, media: true }));
    }
    if (['about'].includes(id)) {
      setExpandedMenus(prev => ({ ...prev, content: true }));
    }
    
    // Add navigation based on section ID
    switch(id) {
      // case 'dashboard':
      //   navigate('/admin/dashboard');
      //   break;
      case 'services':
        navigate('/admin/services');
        break;
      case 'appointments':
        navigate('/admin/appointments');
        break;
      case 'video':
        navigate('/admin/video');
        break;
      case 'publications':
        navigate('/admin/publications');
        break;
      case 'messages':
        navigate('/admin/messages');
        break;
      case 'reviews':
        navigate('/admin/reviews');
        break;
      case 'stats':
        navigate('/admin/stats');
        break;
      case 'about':
        navigate('/admin/about');
        break;
      default:
        navigate('/admin/services');  // Changed from dashboard to services
    }
  };

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      navigate('/admin');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div 
      className="w-64 h-[calc(100vh-64px)] flex flex-col z-30 fixed top-16"
      style={{ backgroundColor: currentTheme.surface, borderRight: `1px solid ${currentTheme.border}` }}
    >
      <nav className="flex-grow overflow-y-auto">
        <ul className="p-4 space-y-1">
          {menuItems.map(item => (
            <li key={item.id} className="mb-1 relative">
              {item.subItems ? (
                <div>
                  <button 
                    className="w-full flex items-center justify-between px-4 py-2 rounded hover:opacity-80"
                    style={{ 
                      backgroundColor: expandedMenus[item.id] ? currentTheme.primary + '20' : 'transparent',
                      color: currentTheme.text.primary
                    }}
                    onClick={() => toggleSubMenu(item.id)}
                  >
                    <span className="flex items-center">
                      <span className="mr-3" style={{ color: currentTheme.primary }}>{item.icon}</span>
                      {item.name}
                    </span>
                    <ChevronDown 
                      size={16} 
                      style={{ 
                        transform: expandedMenus[item.id] ? 'rotate(180deg)' : 'rotate(0)',
                        transition: 'transform 0.3s ease',
                        color: currentTheme.text.primary
                      }} 
                    />
                  </button>
                  
                  {expandedMenus[item.id] && (
                    <ul className="pl-8 space-y-1 mt-1">
                      {item.subItems.map(subItem => (
                        <li key={subItem.id}>
                          <button 
                            className="w-full flex items-center px-4 py-2 rounded hover:opacity-80 transition-colors duration-200"
                            style={{ 
                              backgroundColor: activeSection === subItem.id ? currentTheme.primary : currentTheme.surface,
                              color: activeSection === subItem.id ? 'white' : currentTheme.text.primary
                            }}
                            onClick={() => handleSectionSelect(subItem.id)}
                          >
                            <span className="mr-3">{subItem.icon}</span>
                            {subItem.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <button 
                  className="w-full flex items-center px-4 py-2 rounded hover:opacity-80 transition-colors duration-200"
                  style={{ 
                    backgroundColor: activeSection === item.id ? currentTheme.primary : currentTheme.surface,
                    color: activeSection === item.id ? 'white' : currentTheme.text.primary
                  }}
                  onClick={() => handleSectionSelect(item.id)}
                >
                  <span className="mr-3" style={{ color: activeSection === item.id ? 'white' : currentTheme.primary }}>{item.icon}</span>
                  {item.name}
                </button>
              )}
            </li>
          ))}
        </ul>
      </nav>
      
      {/* Logout Button */}
      <div className="p-4 border-t" style={{ borderColor: currentTheme.border }}>
        <button 
          className="w-full flex items-center px-4 py-2 rounded hover:opacity-80 transition-colors duration-200"
          style={{ 
            backgroundColor: currentTheme.surface,
            color: currentTheme.text.primary
          }}
          onClick={handleLogout}
        >
          <span className="mr-3" style={{ color: currentTheme.primary }}>
            <LogOut size={18} />
          </span>
          Logout
        </button>
      </div>
    </div>
  );
}

export default Sidebar;