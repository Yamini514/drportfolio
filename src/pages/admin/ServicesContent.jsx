import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit, Trash2, Eye, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { FaBrain, FaXRay, FaNotesMedical, FaMicroscope, FaStethoscope, FaHospital, FaHeartbeat, FaLaptopMedical } from 'react-icons/fa';
import { db } from '../../firebase/config'; // Assumes Firebase is initialized correctly
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
    serviceId: null,
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    icon: 'FaBrain',
    status: 'Active',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: 'success',
  });

  // Icon mapping function
  const getIconComponent = (iconName) => {
    switch (iconName) {
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

  // Fetch services from Firebase and sort alphabetically
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const servicesCollection = collection(db, 'services');
        const servicesSnapshot = await getDocs(servicesCollection);
        const servicesList = servicesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // Sort services by title (case-insensitive)
        const sortedServices = servicesList.sort((a, b) =>
          a.title.toLowerCase().localeCompare(b.title.toLowerCase())
        );
        // Generate serviceId based on sorted index
        const servicesWithIds = sortedServices.map((service, index) => ({
          ...service,
          serviceId: `SRV${String(index + 1).padStart(3, '0')}`,
        }));
        setServices(servicesWithIds);
      } catch (error) {
        console.error('Error fetching services:', error);
        showNotification('Failed to load services. Please try again.', 'error');
      }
    };

    fetchServices();
  }, []);

  // Filter services based on search term and status
  const filteredServices = services.filter((service) => {
    const matchesSearch =
      (service.serviceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       service.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       service.description?.toLowerCase().includes(searchTerm.toLowerCase())) ?? false;
    const matchesStatus = statusFilter === 'All Status' || service.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Notification component
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
        aria-label="Close notification"
      >
        <X size={18} />
      </button>
    </div>
  );

  // Show notification with auto-dismiss
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification((prev) => ({ ...prev, show: false }));
    }, 5000);
  };

  // Handle form input changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name === 'title' && value.length > 100) return;
    if (name === 'description' && value.length > 300) return;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle status filter change
  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
  };

  // Handle view service
  const handleViewClick = (service) => {
    setViewingService(service);
  };

  // Handle edit service
  const handleEditClick = (service) => {
    setEditingService(service.id);
    setFormData({
      title: service.title,
      description: service.description,
      icon: service.icon,
      status: service.status,
    });
    setShowForm(true);
  };

  // Handle delete service confirmation
  const handleDeleteClick = (serviceId) => {
    setDeleteConfirmation({
      isOpen: true,
      serviceId,
    });
  };

  // Delete service from Firebase
  const handleDelete = async (serviceId) => {
    try {
      const serviceRef = doc(db, 'services', serviceId);
      await deleteDoc(serviceRef);
      setServices((prev) => {
        const updatedServices = prev.filter((service) => service.id !== serviceId);
        // Reassign serviceIds after deletion
        return updatedServices
          .sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()))
          .map((service, index) => ({
            ...service,
            serviceId: `SRV${String(index + 1).padStart(3, '0')}`,
          }));
      });
      setDeleteConfirmation({ isOpen: false, serviceId: null });
      showNotification('Service deleted successfully');
    } catch (error) {
      console.error('Error deleting service:', error);
      showNotification('Error deleting service. Please try again.', 'error');
    }
  };

  // Handle form submission (add or update service)
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.title.trim() || !formData.description.trim()) {
        showNotification('Please fill in all required fields.', 'error');
        return;
      }

      // Check for duplicate title
      const isDuplicate = services.some(
        (service) =>
          service.title.toLowerCase() === formData.title.toLowerCase() &&
          (!editingService || service.id !== editingService)
      );
      if (isDuplicate) {
        showNotification('A service with this title already exists.', 'error');
        return;
      }

      const currentDate = new Date().toISOString();

      if (editingService) {
        // Update existing service
        const serviceRef = doc(db, 'services', editingService);
        await updateDoc(serviceRef, {
          ...formData,
          updatedAt: currentDate,
        });
        setServices((prev) => {
          const updatedServices = prev.map((service) =>
            service.id === editingService
              ? { ...service, ...formData, updatedAt: currentDate }
              : service
          );
          // Sort and reassign serviceIds
          return updatedServices
            .sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()))
            .map((service, index) => ({
              ...service,
              serviceId: `SRV${String(index + 1).padStart(3, '0')}`,
            }));
        });
        showNotification('Service updated successfully');
      } else {
        // Add new service
        const servicesCollection = collection(db, 'services');
        const docRef = await addDoc(servicesCollection, {
          ...formData,
          createdAt: currentDate,
          updatedAt: currentDate,
        });
        const newService = {
          id: docRef.id,
          ...formData,
          createdAt: currentDate,
          updatedAt: currentDate,
        };
        setServices((prev) => {
          const updatedServices = [...prev, newService];
          // Sort and assign serviceIds
          return updatedServices
            .sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()))
            .map((service, index) => ({
              ...service,
              serviceId: `SRV${String(index + 1).padStart(3, '0')}`,
            }));
        });
        showNotification('Service added successfully');
      }

      // Reset form
      setEditingService(null);
      setFormData({
        title: '',
        description: '',
        icon: 'FaBrain',
        status: 'Active',
      });
      setShowForm(false);
    } catch (error) {
      console.error('Error saving service:', error);
      showNotification('Error saving service. Please try again.', 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 h-full">
      {notification.show && (
        <NotificationPopup
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification((prev) => ({ ...prev, show: false }))}
        />
      )}
      <CustomDeleteConfirmation
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, serviceId: null })}
        onConfirm={() => handleDelete(deleteConfirmation.serviceId)}
        title="Delete Service"
        message="Are you sure you want to delete this service? This action cannot be undone."
      />

      <div className="lg:col-span-12">
        <div className="flex flex-col mb-4">
          <h1 className="text-xl font-bold mb-4" style={{ color: currentTheme.text.primary }}>
            Services Management
          </h1>

          {viewingService ? (
            <div
              className="rounded-lg shadow p-6 max-w-2xl mx-auto"
              style={{
                backgroundColor: 'transparent',
                border: `1px solid ${currentTheme.border}`,
                borderColor: '#6B46C1',
              }}
            >
              <div className="mb-6">
                <h2 className="text-lg font-bold" style={{ color: currentTheme.text.primary }}>
                  {viewingService.title}
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: currentTheme.text.primary }}>
                    Service Name
                  </label>
                  <p className="text-sm" style={{ color: currentTheme.text.primary }}>
                    {viewingService.title}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: currentTheme.text.primary }}>
                    Icon
                  </label>
                  <div className="flex items-center space-x-2">
                    <div style={{ color: currentTheme.primary }}>{getIconComponent(viewingService.icon)}</div>
                    <p className="text-sm" style={{ color: currentTheme.text.primary }}>
                      {viewingService.icon.replace('Fa', '')}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: currentTheme.text.primary }}>
                    Status
                  </label>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      viewingService.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {viewingService.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: currentTheme.text.primary }}>
                    Description
                  </label>
                  <p className="text-sm" style={{ color: currentTheme.text.primary }}>
                    {viewingService.description}
                  </p>
                </div>
              </div>
              <div className="flex justify-center space-x-4">
                <CustomButton
                  variant="secondary"
                  onClick={() => setViewingService(null)}
                  className="border border-gray-500 hover:bg-gray-600 text-sm px-4 py-2"
                >
                  Cancel
                </CustomButton>
                <CustomButton
                  variant="primary"
                  onClick={() => {
                    handleEditClick(viewingService);
                    setViewingService(null);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-sm px-4 py-2"
                >
                  Edit
                </CustomButton>
              </div>
            </div>
          ) : showForm ? (
            <div
              id="service-form"
              className="rounded-lg shadow p-4 max-w-2xl mx-auto border-purple-500"
              style={{ backgroundColor: 'transparent', borderWidth: '1px' }}
            >
              <h2 className="text-lg font-medium mb-4" style={{ color: currentTheme.text.primary }}>
                {editingService ? 'Edit Service' : 'Add New Service'}
              </h2>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-3 gap-4">
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
                        maxLength={100}
                        className="w-full border border-gray-500 rounded-md focus:ring focus:ring-purple-500"
                      />
                      <p className="text-xs mt-1" style={{ color: currentTheme.text.secondary }}>
                        {formData.title.length}/100 characters
                      </p>
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
                          { value: 'FaLaptopMedical', label: 'Laparoscopy' },
                        ]}
                        className="w-full border border-gray-500 rounded-md focus:ring focus:ring-purple-500"
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
                          { value: 'Inactive', label: 'Inactive' },
                        ]}
                        className="w-full border border-gray-500 rounded-md focus:ring focus:ring-purple-500"
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
                      maxLength={300}
                      className="h-20 w-full border border-gray-500 rounded-md focus:ring focus:ring-purple-500"
                    />
                    <p className="text-xs mt-1" style={{ color: currentTheme.text.secondary }}>
                      {formData.description.length}/300 characters
                    </p>
                  </div>
                </div>
                <div className="flex justify-center space-x-4">
                  <CustomButton
                    variant="secondary"
                    onClick={() => {
                      setShowForm(false);
                      setEditingService(null);
                      setFormData({
                        title: '',
                        description: '',
                        icon: 'FaBrain',
                        status: 'Active',
                      });
                    }}
                    className="border border-gray-500 hover:bg-gray-600"
                  >
                    Cancel
                  </CustomButton>
                  <CustomButton
                    type="submit"
                    variant="primary"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {editingService ? 'Save Changes' : 'Add Service'}
                  </CustomButton>
                </div>
              </form>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {services.length > 0 ? (
                <>
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="flex-1">
                      <CustomSearch
                        placeholder="Search Services with Id and Service Name..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="w-full border border-gray-500 rounded-md focus:ring focus:ring-purple-500"
                      />
                    </div>
                    <div className="w-40">
                      <CustomSelect
                        options={[
                          { value: 'All Status', label: 'All Status' },
                          { value: 'Active', label: 'Active' },
                          { value: 'Inactive', label: 'Inactive' },
                        ]}
                        value={statusFilter}
                        onChange={handleStatusFilterChange}
                        className="w-full border border-gray-500 rounded-md focus:ring focus:ring-purple-500"
                      />
                    </div>
                    <CustomButton
                      variant="primary"
                      icon={PlusCircle}
                      onClick={() => {
                        setEditingService(null);
                        setFormData({
                          title: '',
                          description: '',
                          icon: 'FaBrain',
                          status: 'Active',
                        });
                        setShowForm(true);
                      }}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Add New Service
                    </CustomButton>
                  </div>
                  <CustomTable headers={['ID', 'Icon', 'Service Name', 'Description', 'Status', 'Actions']}>
                    {filteredServices.map((service) => (
                      <tr
                        key={service.id}
                        className="hover:bg-gray-50"
                        style={{ backgroundColor: currentTheme.surface }}
                      >
                        <td
                          className="w-[10%] px-2 sm:px-4 py-3 whitespace-nowrap text-xs sm:text-sm"
                          style={{ color: currentTheme.text.secondary }}
                        >
                          {service.serviceId}
                        </td>
                        <td className="w-[10%] px-2 sm:px-4 py-3 whitespace-nowrap text-xs sm:text-sm text-center">
                          <div className="flex justify-center" style={{ color: currentTheme.primary }}>
                            {getIconComponent(service.icon)}
                          </div>
                        </td>
                        <td
                          className="w-[20%] px-2 sm:px-4 py-3 whitespace-nowrap text-xs sm:text-sm font-medium"
                          style={{ color: currentTheme.text.primary }}
                        >
                          {service.title}
                        </td>
                        <td
                          className="w-[30%] px-2 sm:px-4 py-3 text-xs sm:text-sm"
                          style={{ color: currentTheme.text.secondary }}
                        >
                          <div className="max-w-xs truncate">{service.description}</div>
                        </td>
                        <td className="w-[15%] px-2 sm:px-4 py-3 whitespace-nowrap text-xs sm:text-sm text-center">
                          <span
                            className="px-2 py-1 rounded-full text-xs"
                            style={{
                              backgroundColor:
                                service.status === 'Active'
                                  ? currentTheme.success + '20'
                                  : currentTheme.error + '20',
                              color: service.status === 'Active' ? currentTheme.success : currentTheme.error,
                            }}
                          >
                            {service.status}
                          </span>
                        </td>
                        <td className="w-[15%] px-2 sm:px-4 py-3 whitespace-nowrap text-xs sm:text-sm text-center">
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => handleViewClick(service)}
                              className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                              title="View"
                              aria-label="View service"
                            >
                              <Eye size={20} />
                            </button>
                            <button
                              onClick={() => handleEditClick(service)}
                              className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                              title="Edit"
                              aria-label="Edit service"
                            >
                              <Edit size={20} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(service.id)}
                              className="p-1 text-red-600 hover:text-red-800 transition-colors"
                              title="Delete"
                              aria-label="Delete service"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </CustomTable>
                  {filteredServices.length === 0 && (
                    <div className="text-center py-4">
                      <p style={{ color: currentTheme.text.secondary }}>
                        No services found matching your filters.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <p style={{ color: currentTheme.text.secondary }} className="mb-4">
                    No services available yet.
                  </p>
                  <CustomButton
                    variant="secondary"
                    icon={PlusCircle}
                    onClick={() => setShowForm(true)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Create Your First Service
                  </CustomButton>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ServicesContent;