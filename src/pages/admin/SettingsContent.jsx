import React, { useState } from 'react';
import { FaSave, FaKey, FaUser, FaPalette, FaBell, FaGlobe, FaShieldAlt } from 'react-icons/fa';

const SettingsContent = () => {
  const [activeTab, setActiveTab] = useState('account');
  const [notification, setNotification] = useState(null);
  
  const [accountSettings, setAccountSettings] = useState({
    name: "Admin User",
    email: "admin@beautyspace.com",
    phone: "+1 (555) 123-4567",
    role: "Administrator"
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: "light",
    accentColor: "#3b82f6",
    sidebarCollapsed: false,
    showWelcomeMessage: true
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    appointmentReminders: true,
    marketingEmails: false,
    browserNotifications: true
  });
  
  const [siteSettings, setSiteSettings] = useState({
    siteName: "BeautySpace",
    siteDescription: "Premium beauty services for everyone",
    contactEmail: "contact@beautyspace.com",
    contactPhone: "+1 (555) 987-6543",
    address: "123 Beauty St, New York, NY 10001",
    socialLinks: {
      facebook: "https://facebook.com/beautyspace",
      instagram: "https://instagram.com/beautyspace",
      twitter: "https://twitter.com/beautyspace"
    }
  });
  
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: 30,
    passwordExpiry: 90,
    loginNotifications: true
  });

  const handleAccountChange = (e) => {
    const { name, value } = e.target;
    setAccountSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAppearanceChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAppearanceSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleNotificationChange = (e) => {
    const { name, checked } = e.target;
    setNotificationSettings(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSiteChange = (e) => {
    const { name, value } = e.target;
    setSiteSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSocialLinkChange = (e) => {
    const { name, value } = e.target;
    setSiteSettings(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [name]: value
      }
    }));
  };

  const handleSecurityChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSecuritySettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveSettings = () => {
    // In a real app, we would make API calls to save each settings group
    showNotification("Settings saved successfully!");
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    
    // Password validation
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showNotification("New passwords do not match!", "error");
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      showNotification("Password must be at least 8 characters long!", "error");
      return;
    }
    
    // In a real app, we would make an API call to change the password
    showNotification("Password changed successfully!");
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    });
  };

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const renderTabContent = () => {
    switch(activeTab) {
      case 'account':
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">Account Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={accountSettings.name}
                  onChange={handleAccountChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={accountSettings.email}
                  onChange={handleAccountChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  value={accountSettings.phone}
                  onChange={handleAccountChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Role</label>
                <select
                  name="role"
                  value={accountSettings.role}
                  onChange={handleAccountChange}
                  className="w-full p-2 border rounded bg-white"
                >
                  <option value="Administrator">Administrator</option>
                  <option value="Manager">Manager</option>
                  <option value="Editor">Editor</option>
                </select>
              </div>
            </div>
            
            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">Change Password</h3>
              
              <form onSubmit={handleChangePassword}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-2">Current Password</label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2"></div>
                  
                  <div>
                    <label className="block text-gray-700 mb-2">New Password</label>
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  
                  <div>
                    <button
                      type="submit"
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mt-4"
                    >
                      Update Password
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        );
        
      case 'appearance':
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">Appearance Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-gray-700 mb-2">Theme</label>
                <select
                  name="theme"
                  value={appearanceSettings.theme}
                  onChange={handleAppearanceChange}
                  className="w-full p-2 border rounded bg-white"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System Default</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Accent Color</label>
                <div className="flex items-center">
                  <input
                    type="color"
                    name="accentColor"
                    value={appearanceSettings.accentColor}
                    onChange={handleAppearanceChange}
                    className="p-1 border rounded h-10 w-20"
                  />
                  <span className="ml-2 text-gray-500">{appearanceSettings.accentColor}</span>
                </div>
              </div>
              
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    id="sidebarCollapsed"
                    name="sidebarCollapsed"
                    checked={appearanceSettings.sidebarCollapsed}
                    onChange={handleAppearanceChange}
                    className="mr-2"
                  />
                  <label htmlFor="sidebarCollapsed">Collapse sidebar by default</label>
                </div>
              </div>
              
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    id="showWelcomeMessage"
                    name="showWelcomeMessage"
                    checked={appearanceSettings.showWelcomeMessage}
                    onChange={handleAppearanceChange}
                    className="mr-2"
                  />
                  <label htmlFor="showWelcomeMessage">Show welcome message on dashboard</label>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'notifications':
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <h4 className="font-medium">Email Notifications</h4>
                  <p className="text-sm text-gray-500">Receive system notifications via email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="emailNotifications"
                    checked={notificationSettings.emailNotifications}
                    onChange={handleNotificationChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <h4 className="font-medium">Appointment Reminders</h4>
                  <p className="text-sm text-gray-500">Get reminders about upcoming appointments</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="appointmentReminders"
                    checked={notificationSettings.appointmentReminders}
                    onChange={handleNotificationChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <h4 className="font-medium">Marketing Emails</h4>
                  <p className="text-sm text-gray-500">Receive promotions and marketing communications</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="marketingEmails"
                    checked={notificationSettings.marketingEmails}
                    onChange={handleNotificationChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <h4 className="font-medium">Browser Notifications</h4>
                  <p className="text-sm text-gray-500">Show notifications in your browser</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="browserNotifications"
                    checked={notificationSettings.browserNotifications}
                    onChange={handleNotificationChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        );
        
      case 'site':
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">Site Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-gray-700 mb-2">Site Name</label>
                <input
                  type="text"
                  name="siteName"
                  value={siteSettings.siteName}
                  onChange={handleSiteChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div className="col-span-1 md:col-span-2">
                <label className="block text-gray-700 mb-2">Site Description</label>
                <textarea
                  name="siteDescription"
                  value={siteSettings.siteDescription}
                  onChange={handleSiteChange}
                  className="w-full p-2 border rounded"
                  rows={2}
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Contact Email</label>
                <input
                  type="email"
                  name="contactEmail"
                  value={siteSettings.contactEmail}
                  onChange={handleSiteChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Contact Phone</label>
                <input
                  type="text"
                  name="contactPhone"
                  value={siteSettings.contactPhone}
                  onChange={handleSiteChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div className="col-span-1 md:col-span-2">
                <label className="block text-gray-700 mb-2">Business Address</label>
                <textarea
                  name="address"
                  value={siteSettings.address}
                  onChange={handleSiteChange}
                  className="w-full p-2 border rounded"
                  rows={2}
                />
              </div>
            </div>
            
            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">Social Media Links</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Facebook</label>
                  <input
                    type="url"
                    name="facebook"
                    value={siteSettings.socialLinks.facebook}
                    onChange={handleSocialLinkChange}
                    className="w-full p-2 border rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 mb-2">Instagram</label>
                  <input
                    type="url"
                    name="instagram"
                    value={siteSettings.socialLinks.instagram}
                    onChange={handleSocialLinkChange}
                    className="w-full p-2 border rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 mb-2">Twitter</label>
                  <input
                    type="url"
                    name="twitter"
                    value={siteSettings.socialLinks.twitter}
                    onChange={handleSocialLinkChange}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'security':
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">Security Settings</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <h4 className="font-medium">Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="twoFactorAuth"
                    checked={securitySettings.twoFactorAuth}
                    onChange={handleSecurityChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="p-3 bg-gray-50 rounded">
                <h4 className="font-medium mb-2">Session Timeout (minutes)</h4>
                <p className="text-sm text-gray-500 mb-3">Automatically log out after inactivity</p>
                <input
                  type="range"
                  name="sessionTimeout"
                  min="5"
                  max="120"
                  value={securitySettings.sessionTimeout}
                  onChange={handleSecurityChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>5 min</span>
                  <span>{securitySettings.sessionTimeout} min</span>
                  <span>120 min</span>
                </div>
              </div>
              
              <div className="p-3 bg-gray-50 rounded">
                <h4 className="font-medium mb-2">Password Expiry (days)</h4>
                <p className="text-sm text-gray-500 mb-3">Force password change after specified days</p>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    type="button"
                    onClick={() => setSecuritySettings(prev => ({ ...prev, passwordExpiry: 30 }))}
                    className={`py-1 border rounded ${securitySettings.passwordExpiry === 30 ? 'bg-blue-500 text-white' : 'bg-white'}`}
                  >
                    30 days
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSecuritySettings(prev => ({ ...prev, passwordExpiry: 60 }))}
                    className={`py-1 border rounded ${securitySettings.passwordExpiry === 60 ? 'bg-blue-500 text-white' : 'bg-white'}`}
                  >
                    60 days
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSecuritySettings(prev => ({ ...prev, passwordExpiry: 90 }))}
                    className={`py-1 border rounded ${securitySettings.passwordExpiry === 90 ? 'bg-blue-500 text-white' : 'bg-white'}`}
                  >
                    90 days
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <h4 className="font-medium">Login Notifications</h4>
                  <p className="text-sm text-gray-500">Get notified about new login activities</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="loginNotifications"
                    checked={securitySettings.loginNotifications}
                    onChange={handleSecurityChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col md:flex-row bg-white rounded-lg shadow">
      {/* Sidebar */}
      <div className="w-full md:w-64 border-b md:border-b-0 md:border-r">
        <nav className="p-4">
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => setActiveTab('account')}
                className={`flex items-center w-full p-3 rounded-lg ${activeTab === 'account' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
              >
                <FaUser className="mr-3" />
                <span>Account</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('appearance')}
                className={`flex items-center w-full p-3 rounded-lg ${activeTab === 'appearance' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
              >
                <FaPalette className="mr-3" />
                <span>Appearance</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`flex items-center w-full p-3 rounded-lg ${activeTab === 'notifications' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
              >
                <FaBell className="mr-3" />
                <span>Notifications</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('site')}
                className={`flex items-center w-full p-3 rounded-lg ${activeTab === 'site' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
              >
                <FaGlobe className="mr-3" />
                <span>Site Settings</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('security')}
                className={`flex items-center w-full p-3 rounded-lg ${activeTab === 'security' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
              >
                <FaShieldAlt className="mr-3" />
                <span>Security</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 p-6">
        {/* Notification */}
        {notification && (
          <div className={`p-3 rounded mb-4 ${notification.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {notification.message}
          </div>
        )}
        
        {/* Tab Content */}
        {renderTabContent()}
        
        {/* Save Button */}
        <div className="border-t pt-6 mt-6 flex justify-end">
          <button
            onClick={handleSaveSettings}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center"
          >
            <FaSave className="mr-2" />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsContent;