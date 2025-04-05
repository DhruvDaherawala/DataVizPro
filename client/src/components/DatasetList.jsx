import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { datasetService } from '../api';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import { formatDate } from '../utils/formatters';
import DatasetCard from './DatasetCard';

const DatasetList = () => {
  const location = useLocation();
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    fetchDatasets();
    
    // Check if we need to refresh due to a new upload
    if (location.state?.refreshNeeded && location.state?.uploadSuccess) {
      setUploadSuccess(true);
      
      // Clear success message after 3 seconds
      const timer = setTimeout(() => {
        setUploadSuccess(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  const fetchDatasets = async () => {
    setLoading(true);
    try {
      // Add cache buster when refreshing from an upload
      const cacheBuster = location.state?.refreshNeeded ? `?t=${Date.now()}` : '';
      const data = await datasetService.getAllDatasets(cacheBuster);
      setDatasets(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch datasets:', err);
      setError('Failed to fetch datasets. Please try again later.');
      setDatasets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDataset = async (id) => {
    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this action!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Yes, delete it!'
      });
      
      if (result.isConfirmed) {
        // Show loading state
        Swal.fire({
          title: 'Deleting...',
          text: 'Please wait while we delete the dataset',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
        
        await datasetService.deleteDataset(id);
        
        // Close loading dialog
        Swal.close();
        
        // Remove the deleted dataset from the state
        setDatasets(datasets.filter(dataset => dataset._id !== id));
        toast.success('Dataset deleted successfully');
      }
    } catch (err) {
      console.error('Error deleting dataset:', err);
      
      // Show more detailed error message to the user
      let errorMessage = 'Failed to delete dataset. Please try again.';
      if (err.status === 404) {
        errorMessage = 'Dataset not found. It may have been already deleted.';
      } else if (err.status === 500) {
        errorMessage = 'Server error while deleting dataset. Please try again later.';
      } else if (err.data && err.data.error) {
        errorMessage = err.data.error;
      }
      
      // Close any open Swal dialog
      Swal.close();
      
      // Show error toast
      toast.error(errorMessage);
      
      // Refresh datasets list to ensure UI state is consistent
      await fetchDatasets();
    }
  };

  // Filter datasets based on search term
  const filteredDatasets = searchTerm
    ? datasets.filter(
        dataset =>
          dataset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (dataset.description &&
            dataset.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : datasets;

  return (
    <div className="dataset-list py-4">
      <div className="container">
        <div className="section-header flex justify-between items-center mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-semibold">Datasets</h1>
            <p className="text-gray">Browse and manage your datasets</p>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <div className="search-container">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  className="form-control pl-10"
                  placeholder="Search datasets..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <Link to="/upload" className="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Dataset
            </Link>
          </div>
        </div>

        {uploadSuccess && (
          <div className="success-alert bg-green-100 p-4 rounded-lg mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-700">Dataset uploaded successfully!</span>
          </div>
        )}

        {loading ? (
          <div className="loading-state text-center py-5">
            <svg className="animate-spin h-8 w-8 mx-auto text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-2 text-gray">Loading datasets...</p>
          </div>
        ) : error ? (
          <div className="error-state bg-danger-light p-4 rounded-lg text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-danger mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-danger">{error}</p>
            <button onClick={fetchDatasets} className="btn btn-sm btn-danger mt-3">
              Try Again
            </button>
          </div>
        ) : filteredDatasets.length === 0 ? (
          <div className="empty-state card p-5 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm ? `No datasets found matching "${searchTerm}"` : 'No datasets found'}
            </h3>
            <p className="text-gray mb-4">
              {searchTerm 
                ? 'Try a different search term or upload a new dataset' 
                : 'Upload your first dataset to get started with visualization and analysis'}
            </p>
            {!searchTerm && (
              <Link to="/upload" className="btn btn-primary">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Dataset
              </Link>
            )}
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="btn btn-secondary">
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredDatasets.map(dataset => (
              <DatasetCard 
                key={dataset._id} 
                dataset={dataset} 
                onDelete={handleDeleteDataset}
              />
            ))}
          </div>
        )}
        
        {filteredDatasets.length > 0 && (
          <div className="dataset-count text-center mt-4 text-gray">
            Showing {filteredDatasets.length} of {datasets.length} datasets
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="btn btn-sm btn-secondary ml-3"
              >
                Clear Search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DatasetList; 