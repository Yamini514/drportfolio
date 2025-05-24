import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit, Trash2, Eye, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { FaBrain, FaXRay, FaNotesMedical, FaMicroscope, FaStethoscope, FaHospital, FaHeartbeat, FaLaptopMedical } from 'react-icons/fa';
import { db } from '../../firebase/config';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import CustomInput from '../../components/CustomInput';
import CustomSearch from '../../components/CustomSearch';
import CustomSelect from '../../components/CustomSelect';
import CustomTable from '../../components/CustomTable';
import CustomButton from '../../components/CustomButton';
import CustomDeleteConfirmation from '../../components/CustomDeleteConfirmation';

function ServicesContent() {
  const { currentTheme } = useTheme();
  const [services, setServices] = useState([]);
  const [editingService, setEditingService] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewingService, setViewingService] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    serviceId: null
  });

  // Move getIconComponent inside the component
  const getIconComponent = (iconName) => {
    switch(iconName) {
      case 'FaBrain': return <FaBrain size={16} />;
      case 'FaXRay': return <FaXRay size={16} />;
      case 'FaNotesMedical': return <FaNotesMedical size={16} />;
      case 'FaMicroscope': return <FaMicroscope size={16} />;
      case 'FaStethoscope': return <FaStethoscope size={16} />;
      case 'FaHospital': return <FaHospital size={16} />;
      case 'FaHeartbeat': return <FaHeartbeat size={16} />;
      case 'FaLaptopMedical': return <FaLaptopMedical size={16} />;
      default: return <FaBrain size={16} />;
    }
  };
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    icon: 'FaBrain',
    status: 'Active'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');

  // Load services from Firebase
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const servicesCollection = collection(db, 'services');
        const servicesSnapshot = await getDocs(servicesCollection);
        const servicesList = servicesSnapshot.docs.map((doc, index) => ({
          id: doc.id,
          serviceId: `SRV${String(index + 1).padStart(3, '0')}`,  // Create and store a stable ID
          ...doc.data()
        }));
        setServices(servicesList);
      } catch (error) {
        console.error("Error fetching services:", error);
      }
    };

    fetchServices();
  }, []);

  // Filter services based on search term and status
  const filteredServices = services.filter(service => {
    const matchesSearch = 
      service.serviceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      service.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All Status' || service.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleViewClick = (service) => {
    setViewingService(service);
  };

  const handleEditClick = (service) => {
    setEditingService(service);
    setFormData({
      title: service.title,
      description: service.description,
      icon: service.icon,
      status: service.status
    });
    setShowForm(true);
  };

  const handleDeleteClick = (serviceId) => {
    setDeleteConfirmation({
      isOpen: true,
      serviceId: serviceId
    });
  };

  const handleDelete = async (serviceId) => {
    try {
      // Delete from Firebase
      const serviceRef = doc(db, 'services', serviceId);
      await deleteDoc(serviceRef);

      // Update local state
      setServices(prev => prev.filter(service => service.id !== serviceId));
      
      // Close confirmation dialog
      setDeleteConfirmation({ isOpen: false, serviceId: null });
      
      // Show success notification
      showNotification('Service deleted successfully');
    } catch (error) {
      console.error("Error deleting service:", error);
      showNotification('Error deleting service. Please try again.', 'error');
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: 'success' // 'success', 'error', or 'warning'
  });

  // Add notification component
  const NotificationPopup = ({ message, type, onClose }) => (
    <div 
      className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center transition-opacity duration-300 ${
        type === 'error' ? 'bg-red-500 text-white' :
        type === 'warning' ? 'bg-yellow-500 text-white' :
        'bg-green-500 text-white'
      }`}
    >
      {type === 'error' ? (
        <AlertTriangle size={20} className="mr-2" />
      ) : type === 'warning' ? (
        <AlertTriangle size={20} className="mr-2" />
      ) : (
        <CheckCircle size={20} className="mr-2" />
      )}
      <span>{message}</span>
      <button 
        onClick={onClose} 
        className="ml-4 text-white hover:text-gray-200 transition-colors"
      >
        <X size={18} />
      </button>
    </div>
  );

  // Add showNotification helper function
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  // Modify handleSubmit to use the new notification
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Check for empty fields
      if (!formData.title.trim() || !formData.description.trim()) {
        showNotification('Please fill in all fields', 'error');
        return;
      }

      // Check for duplicate title
      const isDuplicate = services.some(service => 
        service.title.toLowerCase() === formData.title.toLowerCase() &&
        (!editingService || service.id !== editingService)
      );

      if (isDuplicate) {
        showNotification('A service with this title already exists', 'error');
        return;
      }

      const currentDate = new Date().toISOString();

      if (editingService) {
        // Update existing service
        const serviceRef = doc(db, 'services', editingService);
        await updateDoc(serviceRef, {
          ...formData,
          updatedAt: currentDate
        });
        setServices(prev => 
          prev.map(service => 
            service.id === editingService 
              ? { ...service, ...formData, updatedAt: currentDate }
              : service
          )
        );
        showNotification('Service updated successfully');
      } else {
        // Add new service
        const servicesCollection = collection(db, 'services');
        const docRef = await addDoc(servicesCollection, {
          ...formData,
          createdAt: currentDate,
          updatedAt: currentDate
        });
        
        const newServiceId = `SRV${String(services.length + 1).padStart(3, '0')}`;
        
        const newService = {
          id: docRef.id,
          serviceId: newServiceId,
          ...formData,
          createdAt: currentDate,
          updatedAt: currentDate
        };
        setServices(prev => [newService, ...prev]); // Add new service at the beginning
      }
      
      setEditingService(null);
      setFormData({
        title: '',
        description: '',
        icon: 'FaBrain',
        status: 'Active'
      });
      setShowForm(false);
    } catch (error) {
      console.error("Error saving service:", error);
      showNotification('Error saving service. Please try again.', 'error');
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Add notification popup */}
      {notification.show && (
        <NotificationPopup
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(prev => ({ ...prev, show: false }))}
        />
      )}
      {/* Add CustomDeleteConfirmation component */}
      <CustomDeleteConfirmation
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, serviceId: null })}
        onConfirm={() => handleDelete(deleteConfirmation.serviceId)}
        title="Delete Service"
        message="Are you sure you want to delete this service? This action cannot be undone."
      />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
        <h1 className="text-xl sm:text-2xl font-bold" style={{ color: currentTheme.text.primary }}>Services Management</h1>
        {!showForm && !viewingService && (
          <CustomButton 
            variant="primary"
            icon={PlusCircle}
            onClick={() => {
              setEditingService(null);
              setFormData({
                title: '',
                description: '',
                icon: 'FaBrain',
                status: 'Active'
              });
              setShowForm(true);
            }}
          >
            Add New Service
          </CustomButton>
        )}
      </div>

      {viewingService ? (
        <div className="rounded-lg shadow p-6" style={{ backgroundColor: currentTheme.surface }}>
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-full" style={{ backgroundColor: currentTheme.primary }}>
                {getIconComponent(viewingService.icon)}
              </div>
              <h2 className="text-2xl font-bold" style={{ color: currentTheme.text.primary }}>
                {viewingService.title}
              </h2>
            </div>
            <button
            onClick={() => {
              handleEditClick(viewingService);
              setViewingService(null);
            }}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Edit size={22} />
          </button>
            <button
              onClick={() => setViewingService(null)}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-1" style={{ color: currentTheme.text.secondary }}>Service ID</h3>
                <p className="text-lg" style={{ color: currentTheme.text.primary }}>{viewingService.serviceId}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1" style={{ color: currentTheme.text.secondary }}>Status</h3>
                <span 
                  className={`px-3 py-1 rounded-full text-sm ${viewingService.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                >
                  {viewingService.status}
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2" style={{ color: currentTheme.text.secondary }}>Description</h3>
              <p className="text-base leading-relaxed" style={{ color: currentTheme.text.primary }}>
                {viewingService.description}
              </p>
            </div>
          </div>
        </div>
      ) : showForm ? (
        <div id="service-form" className="rounded-lg shadow p-3 sm:p-6" style={{ backgroundColor: currentTheme.surface }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium" style={{ color: currentTheme.text.primary }}>
              {editingService ? 'Edit Service' : 'Add New Service'}
            </h2>
            <CustomButton
              variant="secondary"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </CustomButton>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: currentTheme.text.primary }}>
                  Service Name
                </label>
                <CustomInput
                  name="title"
                  placeholder="Enter service name"
                  value={formData.title}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: currentTheme.text.primary }}>
                  Icon
                </label>
                <CustomSelect
                  name="icon"
                  value={formData.icon}
                  onChange={handleFormChange}
                  options={[
                    { value: 'FaBrain', label: 'Brain' },
                    { value: 'FaXRay', label: 'X-Ray' },
                    { value: 'FaNotesMedical', label: 'Medical Notes' },
                    { value: 'FaMicroscope', label: 'Microscope' },
                    { value: 'FaStethoscope', label: 'Stethoscope' },
                    { value: 'FaHospital', label: 'Hospital' },
                    { value: 'FaHeartbeat', label: 'Heartbeat' },
                    { value: 'FaLaptopMedical', label: 'Laparoscopy' }
                  ]}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: currentTheme.text.primary }}>
                Description
              </label>
              <CustomInput
                type="textarea"
                name="description"
                placeholder="Enter service description"
                value={formData.description}
                onChange={handleFormChange}
                required
                className="h-24"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: currentTheme.text.primary }}>
                Status
              </label>
              <CustomSelect
                name="status"
                value={formData.status}
                onChange={handleFormChange}
                options={[
                  { value: 'Active', label: 'Active' },
                  { value: 'Inactive', label: 'Inactive' }
                ]}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <CustomButton type="submit" variant="primary">
                {editingService ? 'Save Changes' : 'Add Service'}
              </CustomButton>
            </div>
          </form>
        </div>
      ) : (
        <>
          {services.length > 0 ? (
            <>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="w-full sm:w-auto flex-grow">
                  <CustomSearch
                    placeholder="Search Services with Id and Service Name..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="w-full"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <CustomSelect
                    options={[
                      { value: 'All Status', label: 'All Status' },
                      { value: 'Active', label: 'Active' },
                      { value: 'Inactive', label: 'Inactive' }
                    ]}
                    value={statusFilter}
                    onChange={handleStatusFilterChange}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-lg shadow mt-4" style={{ backgroundColor: currentTheme.surface, borderColor: currentTheme.border }}>
                <CustomTable headers={['ID', 'Icon', 'Service Name', 'Description', 'Status', 'Actions']}>
                  {filteredServices.map((service) => (
                    <tr key={service.id} className="hover:bg-gray-50" style={{ backgroundColor: currentTheme.surface }}>
                      <td className="w-[10%] px-2 sm:px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm" style={{ color: currentTheme.text.secondary }}>
                        {service.serviceId}
                      </td>
                      <td className="w-[10%] px-2 sm:px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-center">
                        <div className="flex justify-center" style={{ color: currentTheme.primary }}>
                          {getIconComponent(service.icon)}
                        </div>
                      </td>
                      <td className="w-[20%] px-2 sm:px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm font-medium" style={{ color: currentTheme.text.primary }}>
                        {service.title}
                      </td>
                      <td className="w-[30%] px-2 sm:px-4 md:px-6 py-3 md:py-4 text-xs sm:text-sm" style={{ color: currentTheme.text.secondary }}>
                        <div className="max-w-xs truncate">{service.description}</div>
                      </td>
                      <td className="w-[15%] px-2 sm:px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-center">
                        <span 
                          className={`px-2 py-1 rounded-full text-xs`}
                          style={{
                            backgroundColor: service.status === 'Active' ? currentTheme.success + '20' : currentTheme.error + '20',
                            color: service.status === 'Active' ? currentTheme.success : currentTheme.error
                          }}
                        >
                          {service.status}
                        </span>
                      </td>
                      <td className="w-[15%] px-2 sm:px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm text-center">
                        <div className="flex justify-center space-x-1 sm:space-x-2">
                          <button
                            onClick={() => handleViewClick(service)}
                            className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                          >
                            <Eye size={20} />
                          </button>
                          <button
                            onClick={() => handleEditClick(service)}
                            className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            <Edit size={20} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(service.id)}
                            className="p-1 text-red-600 hover:text-red-800 transition-colors"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </CustomTable>
              </div>
              
              {filteredServices.length === 0 && (
                <div className="text-center py-4 sm:py-6">
                  <p style={{ color: currentTheme.text.secondary }}>No services found matching your filters.</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p style={{ color: currentTheme.text.secondary }} className="mb-4">No services available yet.</p>
              <CustomButton
                variant="primary"
                icon={PlusCircle}
                onClick={() => setShowForm(true)}
              >
                Create Your First Service
              </CustomButton>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ServicesContent;