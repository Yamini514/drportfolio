import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { PlusCircle, Edit, Trash2, Eye, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { FaBrain, FaXRay, FaNotesMedical, FaMicroscope, FaStethoscope, FaHospital, FaHeartbeat, FaLaptopMedical, FaBone } from 'react-icons/fa';
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

  const getIconComponent = (iconName) => {
    const iconMap = {
      FaBrain: <FaBrain size={16} />,
      FaXRay: <FaXRay size={16} />,
      FaNotesMedical: <FaNotesMedical size={16} />,
      FaMicroscope: <FaMicroscope size={16} />,
      FaStethoscope: <FaStethoscope size={16} />,
      FaHospital: <FaHospital size={16} />,
      FaHeartbeat: <FaHeartbeat size={16} />,
      FaLaptopMedical: <FaLaptopMedical size={16} />,
      FaBone: <FaBone size={16} />,
    };
    return <div className="inline-flex items-center justify-center w-4 h-4">{iconMap[iconName] || <FaBrain size={16} />}</div>;
  };

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const servicesCollection = collection(db, 'services');
        const servicesSnapshot = await getDocs(servicesCollection);
        const servicesList = servicesSnapshot.docs.map((doc) => ({
          id: doc.id,
          title: doc.data().title || '',
          description: doc.data().description || '',
          icon: doc.data().icon || 'FaBrain',
          status: doc.data().status || 'Active',
          createdAt: doc.data().createdAt || '',
          updatedAt: doc.data().updatedAt || '',
        }));
        const sortedServices = servicesList.sort((a, b) =>
          (a.title || '').toLowerCase().localeCompare((b.title || '').toLowerCase())
        );
        setServices(
          sortedServices.map((service, index) => ({
            ...service,
            serviceId: `SRV${String(index + 1).padStart(3, '0')}`,
          }))
        );
      } catch (error) {
        console.error('Error fetching services:', error);
        showNotification('Failed to load services. Please try again.', 'error');
      }
    };
    fetchServices();
  }, []);

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      (service.serviceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchTerm.toLowerCase())) ??
      false;
    const matchesStatus = statusFilter === 'All Status' || service.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const NotificationPopup = ({ message, type, onClose }) => (
    <div
      className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center transition-opacity duration-300 ${type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
        }`}
    >
      {type === 'error' ? <AlertTriangle size={20} className="mr-2" /> : <CheckCircle size={20} className="mr-2" />}
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

  NotificationPopup.propTypes = {
    message: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['success', 'error']).isRequired,
    onClose: PropTypes.func.isRequired,
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification((prev) => ({ ...prev, show: false })), 5000);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if ((name === 'title' && value.length > 100) || (name === 'description' && value.length > 300)) return;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearchChange = (e) => setSearchTerm(e.target.value);
  const handleStatusFilterChange = (e) => setStatusFilter(e.target.value);
  const handleViewClick = (service) => setViewingService(service);
  const handleEditClick = (service) => {
    setEditingService(service.id);
    setFormData({
      title: service.title || '',
      description: service.description || '',
      icon: service.icon || 'FaBrain',
      status: service.status || 'Active',
    });
    setShowForm(true);
  };

  const handleDeleteClick = (serviceId) => setDeleteConfirmation({ isOpen: true, serviceId });

  const handleDelete = async (serviceId) => {
    try {
      await deleteDoc(doc(db, 'services', serviceId));
      setServices((prev) =>
        prev
          .filter((service) => service.id !== serviceId)
          .sort((a, b) => (a.title || '').toLowerCase().localeCompare((b.title || '').toLowerCase()))
          .map((service, index) => ({ ...service, serviceId: `SRV${String(index + 1).padStart(3, '0')}` }))
      );
      setDeleteConfirmation({ isOpen: false, serviceId: null });
      showNotification('Service deleted successfully');
    } catch (error) {
      console.error('Error deleting service:', error);
      showNotification('Error deleting service. Please try again.', 'error');
    }
  };

  const handleBulkDelete = async (serviceIds) => {
    try {
      await Promise.all(serviceIds.map((id) => deleteDoc(doc(db, 'services', id))));
      setServices((prev) =>
        prev
          .filter((service) => !serviceIds.includes(service.id))
          .sort((a, b) => (a.title || '').toLowerCase().localeCompare((b.title || '').toLowerCase()))
          .map((service, index) => ({ ...service, serviceId: `SRV${String(index + 1).padStart(3, '0')}` }))
      );
      showNotification('Selected services deleted successfully');
    } catch (error) {
      console.error('Error deleting services:', error);
      showNotification('Error deleting services. Please try again.', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      showNotification('Please fill in all required fields.', 'error');
      return;
    }
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
    try {
      if (editingService) {
        await updateDoc(doc(db, 'services', editingService), { ...formData, updatedAt: currentDate });
        setServices((prev) =>
          prev
            .map((service) =>
              service.id === editingService ? { ...service, ...formData, updatedAt: currentDate } : service
            )
            .sort((a, b) => (a.title || '').toLowerCase().localeCompare((b.title || '').toLowerCase()))
            .map((service, index) => ({ ...service, serviceId: `SRV${String(index + 1).padStart(3, '0')}` }))
        );
        showNotification('Service updated successfully');
      } else {
        const docRef = await addDoc(collection(db, 'services'), {
          ...formData,
          createdAt: currentDate,
          updatedAt: currentDate,
        });
        setServices((prev) =>
          [
            ...prev,
            { id: docRef.id, ...formData, createdAt: currentDate, updatedAt: currentDate },
          ]
            .sort((a, b) => (a.title || '').toLowerCase().localeCompare((b.title || '').toLowerCase()))
            .map((service, index) => ({ ...service, serviceId: `SRV${String(index + 1).padStart(3, '0')}` }))
        );
        showNotification('Service added successfully');
      }
      setEditingService(null);
      setFormData({ title: '', description: '', icon: 'FaBrain', status: 'Active' });
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
          <h1 className="text-xl font-bold mb-4" style={{ color: currentTheme.text?.primary || '#000000' }}>
            Services Management
          </h1>
          {viewingService ? (
            <div
              className="rounded-lg shadow p-6 mx-auto"
              style={{ backgroundColor: 'transparent', border: `1px solid ${currentTheme.border || '#6B46C1'}`, width: '800px', maxWidth: '100%' }}
            >
              <div className="mb-6">
                <h2 className="text-lg font-bold" style={{ color: currentTheme.text?.primary || '#000000' }}>
                  {viewingService.title}
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: currentTheme.text?.primary || '#000000' }}>
                    Service Name
                  </label>
                  <p className="text-sm" style={{ color: currentTheme.text?.primary || '#000000' }}>
                    {viewingService.title}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: currentTheme.text?.primary || '#000000' }}>
                    Icon
                  </label>
                  <div className="flex items-center space-x-2">
                    <div style={{ color: currentTheme.primary || '#6B46C1' }}>{getIconComponent(viewingService.icon)}</div>
                    <p className="text-sm" style={{ color: currentTheme.text?.primary || '#000000' }}>
                      {viewingService.icon.replace('Fa', '')}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: currentTheme.text?.primary || '#000000' }}>
                    Status
                  </label>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${viewingService.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                  >
                    {viewingService.status}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: currentTheme.text?.primary || '#000000' }}>
                    Description
                  </label>
                  <p className="text-sm" style={{ color: currentTheme.text?.primary || '#000000' }}>
                    {viewingService.description}
                  </p>
                </div>
              </div>
              <div className="flex justify-center space-x-4">
                <CustomButton
                  variant="secondary"
                  onClick={() => setViewingService(null)}
                  className="border border-gray-500 hover:bg-gray-600 text-sm px-2 py-1"
                >
                  Cancel
                </CustomButton>
                <CustomButton
                  variant="primary"
                  onClick={() => {
                    handleEditClick(viewingService);
                    setViewingService(null);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-sm px-2 py-1"
                >
                  Edit
                </CustomButton>
              </div>
            </div>
          ) : showForm ? (
            <div
              id="service-form"
              className="rounded-lg shadow p-6 mx-auto"
              style={{ backgroundColor: 'transparent', border: `1px solid ${currentTheme.border || '#6B46C1'}`, width: '800px', maxWidth: '100%' }}
            >
              <h2 className="text-lg font-medium mb-4" style={{ color: currentTheme.text?.primary || '#000000' }}>
                {editingService ? 'Edit Service' : 'Add New Service'}
              </h2>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: currentTheme.text?.primary || '#000000' }}>
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
                    <p className="text-xs mt-1" style={{ color: currentTheme.text?.secondary || '#6B7280' }}>
                      {formData.title.length}/100 characters
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: currentTheme.text?.primary || '#000000' }}>
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
                        { value: 'FaHeartbeat', label: 'Neck Pain' },
                        { value: 'FaBone', label: 'Spine Surgery' },
                        { value: 'FaLaptopMedical', label: 'Laparoscopy' },
                      ]}
                      className="w-full border border-gray-500 rounded-md focus:ring focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: currentTheme.text?.primary || '#000000' }}>
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
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: currentTheme.text?.primary || '#000000' }}>
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
                    <p className="text-xs mt-1" style={{ color: currentTheme.text?.secondary || '#6B7280' }}>
                      {formData.description.length}/300 characters
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <CustomButton
                    variant="secondary"
                    onClick={() => {
                      setShowForm(false);
                      setEditingService(null);
                      setFormData({ title: '', description: '', icon: 'FaBrain', status: 'Active' });
                    }}
                    className="border border-gray-500 hover:bg-gray-600 w-full sm:w-auto"
                  >
                    Cancel
                  </CustomButton>
                  <CustomButton
                    type="submit"
                    variant="primary"
                    className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto"
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
                  <div className="flex flex-col lg:flex-row gap-4 items-center">
                    <div className="w-full lg:w-1/3">
                      <CustomSearch
                        placeholder="Search Services with Id and Service Name..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="w-full border border-gray-500 rounded-md focus:ring focus:ring-purple-500"
                      />
                    </div>
                    <div className="flex flex-row gap-2 w-full lg:w-auto">
                      <div className="w-full lg:w-40">
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
                          setFormData({ title: '', description: '', icon: 'FaBrain', status: 'Active' });
                          setShowForm(true);
                        }}
                        className="bg-purple-600 hover:bg-purple-700 w-full lg:w-auto"
                      >
                        Add New Service
                      </CustomButton>
                    </div>
                  </div>
                  <CustomTable
                    headers={['ID', 'ICON', 'SERVICE NAME', 'DESCRIPTION', 'STATUS', 'ACTIONS']}
                    onBulkDelete={handleBulkDelete}
                    enableBulkDelete={true}
                  >
                    {filteredServices.map((service) => (
                      <tr key={service.id} className="hover:bg-gray-50" style={{ backgroundColor: currentTheme.surface || '#FFFFFF' }}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm" style={{ color: currentTheme.text?.secondary || '#6B7280' }}>
                          {service.serviceId}
                        </td>
                        <td
                          className="px-4 py-2 whitespace-nowrap text-sm text-center flex items-center justify-center"
                          style={{ color: currentTheme.primary || '#6B46C1' }}
                        >
                          {getIconComponent(service.icon)}
                        </td>
                        <td
                          className="px-4 py-2 whitespace-nowrap text-sm font-medium"
                          style={{ color: currentTheme.text?.primary || '#000000' }}
                        >
                          {service.title}
                        </td>
                        <td className="px-4 py-2 text-sm" style={{ color: currentTheme.text?.secondary || '#6B7280' }}>
                          <div className="max-w-md truncate">{service.description}</div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-center">
                          <span
                            className="px-2 py-1 rounded-full text-xs"
                            style={{
                              backgroundColor:
                                service.status === 'Active'
                                  ? (currentTheme.success || '#10B981') + '20'
                                  : (currentTheme.error || '#EF4444') + '20',
                              color: service.status === 'Active' ? currentTheme.success || '#10B981' : currentTheme.error || '#EF4444',
                            }}
                          >
                            {service.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-center">
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => handleViewClick(service)}
                              className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                              title="View"
                              aria-label="View service"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleEditClick(service)}
                              className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                              title="Edit"
                              aria-label="Edit service"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(service.id)}
                              className="p-1 text-red-600 hover:text-red-800 transition-colors"
                              title="Delete"
                              aria-label="Delete service"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </CustomTable>
                  {filteredServices.length === 0 && (
                    <div className="text-center py-4">
                      <p style={{ color: currentTheme.text?.secondary || '#6B7280' }}>
                        No services found matching your filters.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <p style={{ color: currentTheme.text?.secondary || '#6B7280' }} className="mb-4">
                    No services available yet.
                  </p>
                  <CustomButton
                    variant="secondary"
                    icon={PlusCircle}
                    onClick={() => setShowForm(true)}
                    className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto"
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

ServicesContent.propTypes = {
  currentTheme: PropTypes.shape({
    text: PropTypes.shape({
      primary: PropTypes.string,
      secondary: PropTypes.string,
    }),
    primary: PropTypes.string,
    surface: PropTypes.string,
    border: PropTypes.string,
    success: PropTypes.string,
    error: PropTypes.string,
  }),
};

export default ServicesContent;