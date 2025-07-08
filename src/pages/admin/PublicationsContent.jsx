import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit, Trash2, Eye } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import CustomTable from '../../components/CustomTable';
import CustomSearch from '../../components/CustomSearch';
import { useTheme } from '../../context/ThemeContext';
import CustomDeleteConfirmation from '../../components/CustomDeleteConfirmation';

function PublicationsContent() {
  const { currentTheme } = useTheme();
  const [publications, setPublications] = useState([]);
  const [editingPublication, setEditingPublication] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    publishedYear: '',
    url: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    publicationId: null
  });

  useEffect(() => {
    const fetchPublications = async () => {
      try {
        const publicationsCollection = collection(db, 'publications');
        const publicationsSnapshot = await getDocs(publicationsCollection);
        const publicationsList = publicationsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        publicationsList.sort((a, b) => (a.publishedYear || 0) - (b.publishedYear || 0));
        const sortedListWithIds = publicationsList.map((pub, index) => ({
          ...pub,
          publicationId: `${String(index + 1).padStart(3, '0')}`
        }));
        setPublications(sortedListWithIds);
      } catch (error) {
        console.error("Error fetching publications:", error);
      }
    };

    fetchPublications();
  }, []);

  const handleDeleteClick = (id) => {
    setDeleteConfirmation({
      isOpen: true,
      publicationId: id
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formattedFormData = {
        ...formData,
        publishedYear: formData.publishedYear ? parseInt(formData.publishedYear) : null
      };
      
      if (editingPublication) {
        const publicationRef = doc(db, 'publications', editingPublication);
        await updateDoc(publicationRef, formattedFormData);
        setPublications(prev => 
          prev.map(pub => 
            pub.id === editingPublication 
              ? { ...pub, ...formattedFormData }
              : pub
          ).sort((a, b) => (a.publishedYear || 0) - (b.publishedYear || 0))
          .map((pub, index) => ({
            ...pub,
            publicationId: `${String(index + 1).padStart(3, '0')}`
          }))
        );
      } else {
        const publicationsCollection = collection(db, 'publications');
        const docRef = await addDoc(publicationsCollection, formattedFormData);
        const newPublication = {
          id: docRef.id,
          publicationId: `${String(publications.length + 1).padStart(3, '0')}`,
          ...formattedFormData
        };
        setPublications(prev => [...prev, newPublication]
          .sort((a, b) => (a.publishedYear || 0) - (b.publishedYear || 0))
          .map((pub, index) => ({
            ...pub,
            publicationId: `${String(index + 1).padStart(3, '0')}`
          })));
      }
      
      setEditingPublication(null);
      setFormData({
        title: '',
        publishedYear: '',
        url: ''
      });
      setShowForm(false);
    } catch (error) {
      console.error("Error saving publication:", error);
      alert("Error saving publication. Please try again.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'publications', id));
      setPublications(prev => prev.filter(pub => pub.id !== id)
        .sort((a, b) => (a.publishedYear || 0) - (b.publishedYear || 0))
        .map((pub, index) => ({
          ...pub,
          publicationId: `${String(index + 1).padStart(3, '0')}`
        })));
      setDeleteConfirmation({ isOpen: false, publicationId: null });
    } catch (error) {
      console.error("Error deleting publication:", error);
    }
  };

  const handleEditClick = (publication) => {
    setEditingPublication(publication.id);
    setFormData({
      title: publication.title,
      publishedYear: publication.publishedYear || '',
      url: publication.url || ''
    });
    setShowForm(true);
  };

  const columns = [
    {
      header: 'Title',
      accessor: 'title',
      cell: (row) => (
        row.url ? (
          <a 
            href={row.url} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: currentTheme.primary, textDecoration: 'underline' }}
            className="hover:opacity-80 whitespace-normal"
          >
            {row.title}
          </a>
        ) : (
          <div className="whitespace-normal" style={{ color: currentTheme.text.primary }}>
            {row.title}
          </div>
        )
      )
    },
    {
      header: 'Published Year',
      accessor: 'publishedYear',
      cell: (row) => (
        <div style={{ color: currentTheme.text.primary }}>{row.publishedYear || 'N/A'}</div>
      )
    },
    {
      header: 'Actions',
      accessor: 'actions',
      cell: (row) => (
        <div className="flex justify-center space-x-1 sm:space-x-2">
          {row.url && (
            <button
              onClick={() => window.open(row.url, '_blank')}
              className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <Eye size={20} />
            </button>
          )}
          <button
            onClick={() => handleEditClick(row)}
            className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Edit size={20} />
          </button>
          <button
            onClick={() => handleDeleteClick(row.id)}
            className="p-1 text-red-600 hover:text-red-800 transition-colors"
          >
            <Trash2 size={20} />
          </button>
        </div>
      )
    }
  ];

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredPublications = publications.filter(publication => 
    publication.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6" style={{ color: currentTheme.text.primary }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0 gap-4">
        <h1 className="text-xl sm:text-2xl font-bold" style={{ color: currentTheme.text.primary }}>
          Publications Management
        </h1>
        {!showForm && (
          <CustomButton 
            variant="primary"
            icon={PlusCircle}
            onClick={() => {
              setEditingPublication(null);
              setFormData({
                title: '',
                publishedYear: '',
                url: ''
              });
              setShowForm(true);
            }}
          >
            Add New Publication
          </CustomButton>
        )}
      </div>

      {!showForm && (
        <div className="w-full max-w-md">
          <CustomSearch
            placeholder="Search publications with text..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
      )}

      {!showForm ? (
        <CustomTable
          headers={['ID', 'Title', 'Published Year', 'Actions']}
          data={filteredPublications}
        >
          {filteredPublications.map((publication) => (
            <tr key={publication.id}>
              <td style={{ color: currentTheme.text.primary }}>
                <div className="text-left pl-6">{publication.publicationId}</div>
              </td>
              <td style={{ color: currentTheme.text.primary }}>
                {publication.url ? (
                  <a 
                    href={publication.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: currentTheme.primary, textDecoration: 'underline' }}
                    className="hover:opacity-80 whitespace-normal"
                  >
                    {publication.title}
                  </a>
                ) : (
                  <div className="whitespace-normal">{publication.title}</div>
                )}
              </td>
              <td style={{ color: currentTheme.text.primary }}>
                <div>{publication.publishedYear || 'N/A'}</div>
              </td>
              <td>
                <div className="flex justify-center space-x-1 sm:space-x-2">
                  {publication.url && (
                    <button
                      onClick={() => window.open(publication.url, '_blank')}
                      className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      <Eye size={20} />
                    </button>
                  )}
                  <button
                    onClick={() => handleEditClick(publication)}
                    className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Edit size={20} />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(publication.id)}
                    className="p-1 text-red-600 hover:text-red-800 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </CustomTable>
      ) : (
        <div 
          className="rounded-lg shadow p-6 max-w-md mx-auto bg-white"
          style={{ 
            border: '1px solid #e5e7eb',
            color: currentTheme.text.primary
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <CustomInput
              label="Publication Title"
              name="title"
              value={formData.title}
              onChange={handleFormChange}
              required
              autoFocus
            />
            <CustomInput
              label="Published Year"
              name="publishedYear"
              value={formData.publishedYear}
              onChange={handleFormChange}
              type="number"
              placeholder="YYYY"
              required
            />
            <CustomInput
              label="Publication URL"
              name="url"
              value={formData.url}
              onChange={handleFormChange}
              type="url"
              placeholder="https://example.com"
            />
            <div className="flex justify-end gap-2">
              <CustomButton
                variant="secondary"
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingPublication(null);
                  setFormData({ title: '', publishedYear: '', url: '' });
                }}
              >
                Cancel
              </CustomButton>
              <CustomButton type="submit" variant="primary">
                {editingPublication ? 'Update' : 'Save'}
              </CustomButton>
            </div>
          </form>
        </div>
      )}
      <CustomDeleteConfirmation 
        isOpen={deleteConfirmation.isOpen} 
        onClose={() => setDeleteConfirmation({ isOpen: false, publicationId: null })} 
        onConfirm={() => handleDelete(deleteConfirmation.publicationId)} 
        title="Delete Publication" 
        message="Are you sure you want to delete this publication? This action cannot be undone." 
      />
    </div>
  );
}

export default PublicationsContent;