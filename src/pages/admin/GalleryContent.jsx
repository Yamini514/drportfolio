import React, { useState, useEffect } from 'react';
import { Trash2, Edit, Image, Plus, Search, Grid, List, Upload, X, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { db } from '../../firebase/config';  // Import both db and storage
import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import CustomButton from '../../components/CustomButton';
import CustomInput from '../../components/CustomInput';
import CustomSearch from '../../components/CustomSearch';
import CustomSelect from '../../components/CustomSelect';
import CustomTable from '../../components/CustomTable';
import CustomDeleteConfirmation from '../../components/CustomDeleteConfirmation';

function GalleryContent() {
  // Replace multiple states with a single gallery state
  const [galleryData, setGalleryData] = useState({
    albums: {},
    images: []
  });
  
  // Destructure galleryData for easier access
  const { albums, images } = galleryData;
  
  const [albumDeleteConfirmation, setAlbumDeleteConfirmation] = useState({
    isOpen: false,
    albumKey: null
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  
  const [showAddImageForm, setShowAddImageForm] = useState(false);
  const [showEditImageForm, setShowEditImageForm] = useState(false);
  const [showAddAlbumForm, setShowAddAlbumForm] = useState(false);
  const [showEditAlbumForm, setShowEditAlbumForm] = useState(false);
  
  const [currentImage, setCurrentImage] = useState(null);
  const [newImage, setNewImage] = useState({
    title: '',
    category: '',
    src: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [currentAlbum, setCurrentAlbum] = useState(null);
  const [newAlbum, setNewAlbum] = useState({
    title: '',
    description: ''
  });

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedImages = localStorage.getItem('galleryImages');
    const savedAlbums = localStorage.getItem('galleryAlbums');
    
    if (savedImages && savedAlbums) {
      setGalleryData({
        images: JSON.parse(savedImages),
        albums: JSON.parse(savedAlbums)
      });
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (images.length > 0) {
      localStorage.setItem('galleryImages', JSON.stringify(images));
    }
    
    if (Object.keys(albums).length > 0) {
      localStorage.setItem('galleryAlbums', JSON.stringify(albums));
    }
  }, [images, albums]);

  // Get all categories from albums
  const categories = ['all', ...Object.keys(albums)];

  // Filter images based on search and category
  const filteredImages = images.filter(image => {
    const matchesSearch = image.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = category === 'all' || image.category === category;
    return matchesSearch && matchesCategory;
  });

  // Reset form states
  const resetForms = () => {
    setShowAddImageForm(false);
    setShowEditImageForm(false);
    setShowAddAlbumForm(false);
    setShowEditAlbumForm(false);
    setCurrentImage(null);
    setCurrentAlbum(null);
    setNewImage({
      title: '',
      category: 'Facilities',
      src: '/api/placeholder/400/300',
      date: new Date().toISOString().split('T')[0]
    });
    setNewAlbum({
      title: '',
      description: ''
    });
  };

  // Add new image
  const handleAddImage = async () => {
    try {
      let imageUrl = newImage.src;
      let storageRefPath = null;
      
      if (newImage.file && newImage.file instanceof File) {
        const fileName = `gallery/${Date.now()}_${newImage.file.name}`;
        const storageRef = ref(db, fileName);
        await uploadBytes(storageRef, newImage.file);
        imageUrl = await getDownloadURL(storageRef);
        storageRefPath = fileName;
      }
  
      // Add image to Firestore gallery collection
      const galleryRef = collection(db, 'gallery');
      const imageDoc = await addDoc(collection(db, 'gallery'), {
        title: newImage.title,
        category: newImage.category,
        src: imageUrl,
        date: newImage.date,
        storageRef: storageRefPath,
        createdAt: new Date().toISOString()
      });
  
      // Update local state
      const imageToAdd = {
        id: imageDoc.id,
        title: newImage.title,
        category: newImage.category,
        src: imageUrl,
        date: newImage.date,
        storageRef: storageRefPath
      };
  
      setGalleryData(prev => ({
        ...prev,
        images: [...prev.images, imageToAdd]
      }));
      resetForms();
    } catch (error) {
      console.error("Error adding image:", error);
      alert("Error adding image. Please try again.");
    }
  };

  // Delete image
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    itemId: null
  });

  const handleDelete = async (id) => {
    setDeleteConfirmation({
      isOpen: true,
      itemId: id
    });
  };

  // Add these handlers for album operations
const handleAddAlbum = async () => {
  if (!newAlbum.title) {
    return;
  }
  
  try {
    const albumKey = newAlbum.title.replace(/\s+/g, '');
    
    // Add album to Firestore gallery collection
    const galleryRef = collection(db, 'gallery');
    const albumsRef = doc(galleryRef, 'albums');
    
    // Get existing albums or create new one
    const albumsDoc = await getDoc(albumsRef);
    const existingAlbums = albumsDoc.exists() ? albumsDoc.data() : {};
    
    await setDoc(albumsRef, {
      ...existingAlbums,
      [albumKey]: {
        title: newAlbum.title,
        description: newAlbum.description
      }
    });

    // Update local state
    setGalleryData(prev => ({
      ...prev,
      albums: {
        ...prev.albums,
        [albumKey]: {
          title: newAlbum.title,
          description: newAlbum.description
        }
      }
    }));
    
    resetForms();
  } catch (error) {
    console.error("Error adding album:", error);
  }
};

const handleEditAlbum = (albumKey) => {
  setCurrentAlbum(albumKey);
  setNewAlbum({
    title: albums[albumKey].title,
    description: albums[albumKey].description
  });
  setShowEditAlbumForm(true);
};

const handleDeleteAlbum = (albumKey) => {
  setAlbumDeleteConfirmation({
    isOpen: true,
    albumKey: albumKey
  });
};

const confirmAlbumDelete = () => {
  const albumKey = albumDeleteConfirmation.albumKey;
  setGalleryData(prev => {
    const updatedAlbums = { ...prev.albums };
    delete updatedAlbums[albumKey];
    return {
      ...prev,
      albums: updatedAlbums,
      images: prev.images.filter(image => image.category !== albumKey)
    };
  });
  
  setAlbumDeleteConfirmation({ isOpen: false, albumKey: null });
};
const handleSaveAlbum = () => {
  if (!currentAlbum || !newAlbum.title) {
    alert("Please enter an album title");
    return;
  }
  
  setGalleryData(prev => ({
    ...prev,
    albums: {
      ...prev.albums,
      [currentAlbum]: {
        title: newAlbum.title,
        description: newAlbum.description
      }
    }
  }));
  
  setShowEditAlbumForm(false);
  setCurrentAlbum(null);
  setNewAlbum({ title: '', description: '' });
};

const confirmDelete = async () => {
  const id = deleteConfirmation.itemId;
  try {
    const imageToDelete = images.find(img => img.id === id);
    
    // Delete from Firestore gallery collection
    const galleryRef = collection(db, 'gallery');
    const imagesRef = doc(galleryRef, 'images');
    
    const imagesDoc = await getDoc(imagesRef);
    const existingImages = imagesDoc.exists() ? imagesDoc.data().items : [];
    
    await setDoc(imagesRef, {
      items: existingImages.filter(img => img.id !== id)
    });
    
    // Delete from Storage if exists
    if (imageToDelete?.storageRef) {
      const storageRef = ref(storage, imageToDelete.storageRef);
      await deleteObject(storageRef);
    }
    
    setGalleryData(prev => ({
      ...prev,
      images: prev.images.filter(image => image.id !== id)
    }));
    setDeleteConfirmation({ isOpen: false, itemId: null });
  } catch (error) {
    console.error("Error deleting image:", error);
    // Remove the alert and handle the error silently
  }
};

  return (
    <div className="space-y-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 sm:gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold">Gallery Management</h1>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <CustomButton 
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => {
                resetForms();
                setShowAddAlbumForm(!showAddAlbumForm);
              }}
            >
              {showAddAlbumForm ? 'Cancel' : 'Add Album'}
            </CustomButton>
          </div>
        </div>

        {/* Add Album Form */}
        {showAddAlbumForm && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Add New Album</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">Album Title</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border rounded-md"
                  value={newAlbum.title}
                  onChange={(e) => setNewAlbum({...newAlbum, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Description</label>
                <textarea 
                  className="w-full px-3 py-2 border rounded-md"
                  rows="3"
                  value={newAlbum.description}
                  onChange={(e) => setNewAlbum({...newAlbum, description: e.target.value})}
                ></textarea>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-4">
              <button 
                className="px-4 py-2 border rounded-md order-2 sm:order-1"
                onClick={() => setShowAddAlbumForm(false)}
              >
                Cancel
              </button>
              <CustomButton 
                variant="primary"
                onClick={handleAddAlbum}
                icon={<Save size={16} />}
                className="ml-4"
              >
                Save Album
              </CustomButton>
            </div>
          </div>
        )}

        {/* Edit Album Form */}
        {showEditAlbumForm && currentAlbum && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Edit Album: {albums[currentAlbum].title}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">Album Title</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border rounded-md"
                  value={newAlbum.title}
                  onChange={(e) => setNewAlbum({...newAlbum, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Description</label>
                <textarea 
                  className="w-full px-3 py-2 border rounded-md"
                  rows="3"
                  value={newAlbum.description}
                  onChange={(e) => setNewAlbum({...newAlbum, description: e.target.value})}
                ></textarea>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-4">
              <button 
                className="px-4 py-2 border rounded-md order-2 sm:order-1"
                onClick={() => setShowEditAlbumForm(false)}
              >
                Cancel
              </button>
              <CustomButton 
                variant="primary"
                onClick={handleSaveAlbum}
                icon={<Save size={16} />}
              >
                Save Changes
              </CustomButton>
            </div>
          </div>
        )}

        {/* Album Management */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Album Categories</h2>
            <CustomButton 
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => {
                resetForms();
                setShowAddAlbumForm(!showAddAlbumForm);
              }}
            >
              Add Album
            </CustomButton>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.keys(albums).map(albumKey => (
              <div key={albumKey} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <h3 className="font-medium">{albums[albumKey].title}</h3>
                <p className="text-sm text-gray-500 mb-3">{albums[albumKey].description}</p>
                <div className="flex justify-end">
                  <button 
                    className="text-blue-600 hover:text-blue-800 mr-2 p-2"
                    onClick={() => handleEditAlbum(albumKey)}
                    aria-label="Edit album"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    className="text-red-600 hover:text-red-800 p-2"
                    onClick={() => handleDeleteAlbum(albumKey)}
                    aria-label="Delete album"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Image Management */}
        <div className="flex flex-col sm:flex-row justify-between items-start mb-6 sm:items-center mt-8 md:mt-16 space-y-3 sm:space-y-0">
          {!showAddImageForm && (
            <CustomButton 
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => {
                resetForms();
                setShowAddImageForm(true);
              }}
            >
              Add New Image
            </CustomButton>
          )}
        </div>

        {/* Add/Edit Image Form */}
        {(showAddImageForm || showEditImageForm) ? (
          <div className="bg-white rounded-lg shadow p-6 w-full mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">
                {showEditImageForm ? 'Edit Image' : 'Add New Image'}
              </h2>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <CustomInput
                label="Image Title"
                value={newImage.title}
                onChange={(e) => setNewImage({...newImage, title: e.target.value})}
                placeholder="Enter image title"
                className="w-full"
              />
              
              <CustomSelect
                label="Category"
                options={categories.slice(1).map(cat => ({
                  value: cat,
                  label: cat.charAt(0).toUpperCase() + cat.slice(1)
                }))}
                value={newImage.category}
                onChange={(e) => setNewImage({...newImage, category: e.target.value})}
                className="w-full"
              />
              
              <CustomInput
                type="date"
                label="Date"
                value={newImage.date}
                onChange={(e) => setNewImage({...newImage, date: e.target.value})}
                className="w-full"
              />
            
            <CustomInput
              type="file"
              label="Image File"
              onChange={(e) => setNewImage({...newImage, file: e.target.files[0]})}
              className="w-full"
            />
          </div>
          
          <div className="mt-6 flex justify-end gap-2">
            <CustomButton
              variant="secondary"
              onClick={resetForms}
            >
              Cancel
            </CustomButton>
            <CustomButton
              variant="primary"
              onClick={showEditImageForm ? handleSaveEdit : handleAddImage}
              icon={<Save size={16} />}
            >
              {showEditImageForm ? 'Save Changes' : 'Add Image'}
            </CustomButton>
          </div>
        </div>
        ) : (
        /* Image List */
        <div className="mt-8">
          {filteredImages.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-500 text-lg">No images found. Click "Add New Image" to add your first image.</p>
            </div>
          ) : (
            <>
              {viewMode === 'list' && (
                <CustomTable
                  headers={['Image', 'Title', 'Category', 'Date', 'Actions']}
                >
                  {filteredImages.map((image) => (
                    <tr key={image.id}>
                      <td className="px-6 py-4">
                        <img src={image.src} alt={image.title} className="w-16 h-16 object-cover rounded" />
                      </td>
                      <td className="px-6 py-4">{image.title}</td>
                      <td className="px-6 py-4">{image.category}</td>
                      <td className="px-6 py-4">{new Date(image.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <CustomButton
                            variant="danger"
                            onClick={() => handleDelete(image.id)}
                            icon={<Trash2 size={16} />}
                          >
                            Delete
                          </CustomButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </CustomTable>
              )}

              {viewMode === 'grid' && (
                <CustomTable
                  headers={['Image', 'Title', 'Category', 'Date', 'Actions']}
                >
                  {filteredImages.map((image) => (
                    <tr key={image.id}>
                      <td className="px-6 py-4">
                        <img src={image.src} alt={image.title} className="w-16 h-16 object-cover rounded" />
                      </td>
                      <td className="px-6 py-4">{image.title}</td>
                      <td className="px-6 py-4">{image.category}</td>
                      <td className="px-6 py-4">{new Date(image.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <CustomButton
                            variant="danger"
                            onClick={() => handleDelete(image.id)}
                            icon={<Trash2 size={16} />}
                          >
                            Delete
                          </CustomButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </CustomTable>
              )}
            </>
          )}
        </div>
        )}
        

        {/* Add both Delete Confirmation Modals */}
        <CustomDeleteConfirmation
          isOpen={deleteConfirmation.isOpen}
          onClose={() => setDeleteConfirmation({ isOpen: false, itemId: null })}
          onConfirm={confirmDelete}
          title="Delete Image"
          message="Are you sure you want to delete this image? This action cannot be undone."
        />
        

        <CustomDeleteConfirmation
          isOpen={albumDeleteConfirmation.isOpen}
          onClose={() => setAlbumDeleteConfirmation({ isOpen: false, albumKey: null })}
          onConfirm={confirmAlbumDelete}
          title="Delete Album"
          message="Are you sure you want to delete this album? All images in this album will also be deleted. This action cannot be undone."
        />
        </div>
    </div>
  );
}

export default GalleryContent;