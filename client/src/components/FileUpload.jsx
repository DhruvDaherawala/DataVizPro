import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { datasetService } from '../api';
import Swal from 'sweetalert2';
import '../styles/FileUpload.css';

const FileUpload = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    // Check file type
    const fileType = selectedFile.type;
    const fileName = selectedFile.name;
    const fileExtension = fileName.split('.').pop().toLowerCase();
    
    if (
      (fileType === 'text/csv' || fileExtension === 'csv') ||
      (fileType === 'application/json' || fileExtension === 'json') ||
      (fileType.includes('spreadsheetml') || fileExtension === 'xlsx' || fileExtension === 'xls')
    ) {
      setFile(selectedFile);
      // Set default name from file name if not already set
      if (!name) {
        setName(fileName.split('.')[0]);
      }
      setError(null);
    } else {
      setError('Only CSV, JSON, and Excel files are supported.');
      setFile(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    
    if (!name.trim()) {
      setError('Please provide a name for your dataset');
      return;
    }
    
    setLoading(true);
    setError(null);
    setUploadProgress(0);
    
    // Show loading progress with SweetAlert2
    Swal.fire({
      title: 'Uploading...',
      html: `
        <div class="swal-upload-progress-container">
          <div class="swal-upload-progress-text">Preparing dataset...</div>
          <div class="swal-progress-bar-container">
            <div class="swal-progress-bar" style="width: 0%"></div>
          </div>
          <div class="swal-upload-progress-percentage">0%</div>
        </div>
      `,
      allowOutsideClick: false,
      showConfirmButton: false
    });
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('description', description);
    
    try {
      // Track upload progress
      const onUploadProgress = (progressData) => {
        const { percentage, completed } = progressData;
        setUploadProgress(percentage);
        
        // Update SweetAlert2 progress
        const progressBar = document.querySelector('.swal-progress-bar');
        const progressText = document.querySelector('.swal-upload-progress-text');
        const progressPercentage = document.querySelector('.swal-upload-progress-percentage');
        
        if (progressBar && progressText && progressPercentage) {
          progressBar.style.width = `${percentage}%`;
          progressPercentage.textContent = `${percentage}%`;
          
          if (!completed) {
            progressText.textContent = 'Uploading dataset...';
          } else {
            progressText.textContent = 'Processing dataset...';
          }
        }
      };
      
      const response = await datasetService.uploadDataset(formData, onUploadProgress);
      console.log('Upload successful:', response);
      
      // Close the loading dialog
      Swal.close();
      
      // Show success message
      await Swal.fire({
        icon: 'success',
        title: 'Upload Successful!',
        text: `Your dataset "${name}" has been uploaded successfully.`,
        confirmButtonColor: '#3b82f6',
        timer: 3000,
        timerProgressBar: true
      });
      
      // Add a small delay to ensure the server has processed the upload
      setLoading(false);
      
      // Navigate to datasets page with refresh indicator
      navigate('/datasets', { 
        state: { 
          refreshNeeded: true,
          uploadSuccess: true 
        },
        replace: true
      });
      
    } catch (error) {
      console.error('Upload failed:', error);
      
      // Close loading dialog
      Swal.close();
      
      // Show error message with SweetAlert2
      Swal.fire({
        icon: 'error',
        title: 'Upload Failed',
        text: error.response?.data?.message || 'Failed to upload file. Please try again.',
        confirmButtonColor: '#ef4444'
      });
      
      setError(error.response?.data?.message || 'Failed to upload file. Please try again.');
      setLoading(false);
    }
  };

  // Get file icon based on type
  const getFileIcon = () => {
    if (!file) return null;
    
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (fileExtension === 'csv') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="file-type-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    } else if (fileExtension === 'json') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="file-type-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="file-type-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
    
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="file-type-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  const formatFileSize = (sizeInBytes) => {
    if (sizeInBytes < 1024) return `${sizeInBytes} B`;
    if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="file-upload py-4">
      <div className="container">
        <div className="section-header mb-4">
          <h1 className="text-3xl font-semibold">Upload Dataset</h1>
          <p className="text-gray mt-1">
            Upload a CSV, JSON, or Excel file to analyze and visualize your data. 
            The file will be processed automatically.
          </p>
        </div>
        
        {error && (
          <div className="error-alert bg-danger-light p-4 rounded-lg mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-danger mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-danger">{error}</span>
          </div>
        )}
        
        <div className="card p-6 mb-5">
          <form onSubmit={handleSubmit} className="upload-form">
            <div 
              className={`file-drop-area ${dragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
            >
              <input 
                type="file" 
                id="file-input" 
                accept=".csv,.json,.xlsx,.xls"
                onChange={handleFileChange}
                className="file-input"
              />
              <label htmlFor="file-input" className="file-label">
                {file ? (
                  <div className="selected-file">
                    <div className="file-icon-container">{getFileIcon()}</div>
                    <div className="file-details">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">{formatFileSize(file.size)}</span>
                    </div>
                    <button 
                      type="button" 
                      className="remove-file-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        setFile(null);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="upload-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium mt-3">Drag and drop your file here</p>
                    <p className="text-gray mt-1">or <span className="text-primary">browse files</span></p>
                    <p className="file-types mt-2">Supported formats: CSV, JSON, Excel</p>
                  </>
                )}
              </label>
            </div>
            
            <div className="form-grid grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="form-group">
                <label htmlFor="name" className="form-label">Dataset Name</label>
                <input
                  type="text"
                  id="name"
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter a name for your dataset"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description" className="form-label">Description (Optional)</label>
                <textarea
                  id="description"
                  className="form-control"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter a description for your dataset"
                  rows="3"
                ></textarea>
              </div>
            </div>
            
            {loading && (
              <div className="upload-progress mt-4">
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray font-medium">Uploading...</span>
                  <span className="text-sm text-gray font-medium">{uploadProgress}%</span>
                </div>
                <div className="file-upload-progress-bar bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full rounded-full" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            <div className="form-actions flex justify-end mt-4">
              <button 
                type="button" 
                className="btn btn-secondary mr-3"
                onClick={() => navigate(-1)}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loading || !file}
              >
                {loading ? 'Uploading...' : 'Upload Dataset'}
              </button>
            </div>
          </form>
        </div>
        
        <div className="upload-info card p-5">
          <h3 className="text-xl font-semibold mb-3">Tips for successful uploads</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>Make sure your CSV or JSON file is properly formatted</li>
            <li>For CSV files, the first row should contain column headers</li>
            <li>For JSON files, use an array of objects with consistent properties</li>
            <li>The maximum file size is 10MB</li>
            <li>Remove any sensitive or personal information before uploading</li>
            <li>Unicode (UTF-8) encoding is recommended for best results</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;