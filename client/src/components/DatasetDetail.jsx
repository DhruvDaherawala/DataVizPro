import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { datasetService } from '../api';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import '../styles/DatasetDetail.css';

const DatasetDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchDataset();
  }, [id]);

  const fetchDataset = async () => {
    try {
      setLoading(true);
      const data = await datasetService.getDatasetById(id);
      setDataset(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching dataset:', err);
      setError('Failed to load dataset. Please try again later.');
      setLoading(false);
    }
  };

  const handleAnalyzeDataset = async () => {
    if (!dataset) return;
    
    try {
      setAnalyzing(true);
      
      // Call the analyze endpoint and wait for it to complete
      const result = await datasetService.analyzeDataset(id);
      console.log('Analysis completed successfully:', result);
      
      // Refresh the dataset data to get updated analyzed status
      await fetchDataset();
      
      // Set analyzing to false
      setAnalyzing(false);
      
      // Navigate directly to the visualization component with state parameter
      // This is more reliable than using URL parameters
      navigate(`/visualize/${id}`, { 
        replace: true,
        state: { activeTab: 'analyze' } 
      });
      console.log('Navigating to visualization page with analyze tab via state');
      
    } catch (err) {
      console.error('Error analyzing dataset:', err);
      setAnalyzing(false);
      alert('Failed to analyze dataset. Please try again.');
    }
  };

  const handleDeleteDataset = async () => {
    if (!dataset) return;
    
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
        
        const response = await datasetService.deleteDataset(id);
        
        // Close loading dialog
        Swal.close();
        
        toast.success('Dataset deleted successfully');
        navigate('/datasets');
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
    }
  };

  const renderTableData = () => {
    if (!dataset || !dataset.sampleData || dataset.sampleData.length === 0) {
      return (
        <div className="empty-state text-center p-5">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-xl font-semibold mb-2">No sample data available</h3>
          <p className="text-gray mb-4">This dataset doesn't have any sample data to display.</p>
          {!dataset.analyzed && (
            <button 
              onClick={handleAnalyzeDataset} 
              className="btn btn-primary"
              disabled={analyzing}
            >
              {analyzing ? 'Analyzing...' : 'Analyze Dataset'}
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="table-responsive p-3">
        <table className="data-table w-full">
          <thead>
            <tr>
              {dataset.columns.map((column, index) => (
                <th key={index}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataset.sampleData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {dataset.columns.map((column, colIndex) => (
                  <td key={`${rowIndex}-${colIndex}`}>{row[column] !== undefined ? row[column] : '-'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-center text-gray mt-4">
          <p>Showing {Math.min(dataset.sampleData.length, 10)} of {dataset.metadata?.totalRows || dataset.sampleData.length} rows</p>
        </div>
      </div>
    );
  };

  const formatFileSize = (sizeInBytes) => {
    if (!sizeInBytes) return 'Unknown';
    if (sizeInBytes < 1024) return `${sizeInBytes} B`;
    if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const renderOverview = () => {
    if (!dataset) return null;
    
    return (
      <div className="dataset-overview p-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div className="info-card card p-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              File Information
            </h3>
            <ul className="info-list space-y-2">
              <li className="flex justify-between">
                <span className="info-label text-gray">File Type:</span>
                <span className="info-value font-medium">{dataset.fileType.toUpperCase()}</span>
              </li>
              <li className="flex justify-between">
                <span className="info-label text-gray">File Size:</span>
                <span className="info-value font-medium">{formatFileSize(dataset.fileSize)}</span>
              </li>
              <li className="flex justify-between">
                <span className="info-label text-gray">Created Date:</span>
                <span className="info-value font-medium">
                  {new Date(dataset.createdAt).toLocaleDateString()}
                </span>
              </li>
              <li className="flex justify-between">
                <span className="info-label text-gray">Status:</span>
                <span className={`info-value font-medium ${dataset.analyzed ? 'text-success' : 'text-warning'}`}>
                  {dataset.analyzed ? 'Analyzed' : 'Not Analyzed'}
                </span>
              </li>
              <li className="flex justify-between">
                <span className="info-label text-gray">Columns:</span>
                <span className="info-value font-medium">{dataset.columns?.length || 0}</span>
              </li>
              <li className="flex justify-between">
                <span className="info-label text-gray">Rows:</span>
                <span className="info-value font-medium">
                  {dataset.metadata?.totalRows || dataset.sampleData?.length || 'Unknown'}
                </span>
              </li>
            </ul>
          </div>

          <div className="info-card card p-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-3M12 17v-6M15 17v-9" />
              </svg>
              Column Overview
            </h3>
            {dataset.columns && dataset.columns.length > 0 ? (
              <div className="column-list grid grid-cols-2 gap-2">
                {dataset.columns.map((column, index) => (
                  <div key={index} className="column-item bg-light-color p-2 rounded text-sm">
                    {column}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray">No columns detected.</p>
            )}
          </div>
        </div>

        <div className="dataset-actions-container flex flex-col gap-3">
          {!dataset.analyzed && (
            <button 
              onClick={handleAnalyzeDataset} 
              className="btn btn-secondary w-full"
              disabled={analyzing}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {analyzing ? 'Analyzing...' : 'Analyze Dataset'}
            </button>
          )}
          
          <div className="visualization-options-card p-4 bg-light-color rounded-lg mt-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              </svg>
              Visualization Options
            </h3>
            
            <div className="visualization-methods space-y-4">
              <div className="vis-method p-3 border border-gray-200 rounded-lg hover:border-primary transition">
                <h4 className="font-medium mb-2">Standard Visualization</h4>
                <p className="text-sm text-gray mb-3">Create custom charts and dashboards with flexible controls and data filtering options.</p>
                <Link to={`/visualize/${dataset._id}`} className="btn btn-primary w-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Visualize Data
                </Link>
              </div>
              
              <div className="vis-method p-3 border border-gray-200 rounded-lg hover:border-success transition">
                <h4 className="font-medium mb-2">AI-Powered Visualization</h4>
                <p className="text-sm text-gray mb-3">Let our AI analyze your data and suggest the most effective visualizations with detailed explanations.</p>
                <Link to={`/advanced-visualize/${dataset._id}`} className="btn btn-success w-full" onClick={(e) => {
                  console.log("Navigating to AI visualization", dataset._id);
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  AI-Powered Visualization
                </Link>
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button onClick={handleDeleteDataset} className="btn btn-danger">
              <svg xmlns="http://www.w3.org/2000/svg" className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Dataset
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading-state text-center py-5">
        <svg className="animate-spin h-8 w-8 mx-auto text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-2 text-gray">Loading dataset...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state bg-danger-light p-4 rounded-lg text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-danger mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-danger">{error}</p>
        <button onClick={fetchDataset} className="btn btn-sm btn-danger mt-3">
          Try Again
        </button>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="empty-state card p-5 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <h3 className="text-xl font-semibold mb-2">Dataset not found</h3>
        <p className="text-gray mb-4">The dataset you're looking for doesn't exist or has been deleted.</p>
        <Link to="/datasets" className="btn btn-primary">
          Back to Datasets
        </Link>
      </div>
    );
  }

  return (
    <div className="dataset-detail py-4">
      <div className="container">
        <div className="flex items-center mb-4">
          <Link to="/datasets" className="mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="detail-header flex-1">
            <h1 className="text-3xl font-semibold">{dataset.name}</h1>
            <p className="text-gray mt-1">
              {dataset.description || 'No description provided.'}
            </p>
          </div>
        </div>

        <div className="card mb-5 overflow-hidden">
          <div className="tabs flex border-b">
            <button
              className={`tab-btn py-3 px-4 font-medium ${activeTab === 'overview' ? 'active text-primary border-b-2 border-primary' : 'text-gray hover:text-primary'}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`tab-btn py-3 px-4 font-medium ${activeTab === 'data' ? 'active text-primary border-b-2 border-primary' : 'text-gray hover:text-primary'}`}
              onClick={() => setActiveTab('data')}
            >
              Data Sample
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'overview' ? renderOverview() : renderTableData()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatasetDetail; 