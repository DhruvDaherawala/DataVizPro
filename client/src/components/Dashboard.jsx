import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { datasetService } from '../api';

const Dashboard = () => {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    analyzed: 0,
    recentlyAdded: 0
  });

  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        setLoading(true);
        const data = await datasetService.getAllDatasets();
        // Ensure we have the latest data with analysis status
        console.log('Datasets fetched:', data);
        setDatasets(data);
        
        // Calculate stats
        setStats({
          total: data.length,
          analyzed: data.filter(dataset => dataset.analyzed).length,
          recentlyAdded: data.filter(dataset => {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            return new Date(dataset.createdAt) > oneWeekAgo;
          }).length
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching datasets:', err);
        setError('Failed to load datasets. Please try again later.');
        setLoading(false);
      }
    };

    fetchDatasets();
  }, []);

  // Add a refresh function that can be called manually
  const refreshDashboard = async () => {
    try {
      setLoading(true);
      const data = await datasetService.getAllDatasets();
      console.log('Refreshed datasets:', data);
      
      setDatasets(data);
      
      // Recalculate stats
      setStats({
        total: data.length,
        analyzed: data.filter(dataset => dataset.analyzed).length,
        recentlyAdded: data.filter(dataset => {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          return new Date(dataset.createdAt) > oneWeekAgo;
        }).length
      });
      
      setLoading(false);
    } catch (err) {
      console.error('Error refreshing datasets:', err);
      setLoading(false);
    }
  };

  return (
    <div className="dashboard py-4">
      <div className="container">
        <div className="dashboard-header flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-semibold">Dashboard</h1>
            <p className="text-gray">Welcome to DataViz Pro. Visualize and analyze your data with ease.</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={refreshDashboard} 
              className="btn bg-secondary text-white px-4 py-2 rounded-md flex items-center"
              disabled={loading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <Link to="/upload" className="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Dataset
            </Link>
          </div>
        </div>

        <div className="stats-grid grid grid-cols-3 gap-4 mb-5">
          <div className="stat-card card p-4">
            <div className="flex items-center mb-3">
              <div className="stat-icon bg-primary-light p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="text-primary h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm text-gray font-medium">Total Datasets</h3>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
            <div className="progress-bar bg-gray-200 h-2 rounded-full overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{ width: `${stats.total ? 100 : 0}%` }}></div>
            </div>
          </div>

          <div className="stat-card card p-4">
            <div className="flex items-center mb-3">
              <div className="stat-icon bg-success-light p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="text-success h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm text-gray font-medium">Analyzed Datasets</h3>
                <p className="text-2xl font-bold">{stats.analyzed}</p>
              </div>
            </div>
            <div className="progress-bar bg-gray-200 h-2 rounded-full overflow-hidden">
              <div className="bg-success h-full rounded-full" style={{ width: `${stats.total ? (stats.analyzed / stats.total) * 100 : 0}%` }}></div>
            </div>
          </div>

          <div className="stat-card card p-4">
            <div className="flex items-center mb-3">
              <div className="stat-icon bg-warning-light p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="text-warning h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm text-gray font-medium">Recently Added</h3>
                <p className="text-2xl font-bold">{stats.recentlyAdded}</p>
              </div>
            </div>
            <div className="progress-bar bg-gray-200 h-2 rounded-full overflow-hidden">
              <div className="bg-warning h-full rounded-full" style={{ width: `${stats.total ? (stats.recentlyAdded / stats.total) * 100 : 0}%` }}></div>
            </div>
          </div>
        </div>

        <div className="recent-datasets mb-4">
          <div className="section-header flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold">Recent Datasets</h2>
            {datasets.length > 4 && (
              <Link to="/datasets" className="text-primary hover:underline flex items-center">
                View All
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>

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
              <button onClick={() => window.location.reload()} className="btn btn-sm btn-danger mt-3">
                Try Again
              </button>
            </div>
          ) : datasets.length === 0 ? (
            <div className="empty-state card p-5 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="text-xl font-semibold mb-2">No datasets found</h3>
              <p className="text-gray mb-4">Upload your first dataset to get started with visualization and analysis</p>
              <Link to="/upload" className="btn btn-primary">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Dataset
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {datasets.slice(0, 4).map((dataset) => (
                <div key={dataset._id} className="dataset-card">
                  <div className="dataset-card-header">
                    <div className="file-type-icon">
                      {dataset.fileType === 'csv' && (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="icon">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      {dataset.fileType === 'json' && (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="icon">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                      {dataset.fileType === 'excel' && (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="icon">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                    </div>
                    <h3 className="dataset-name">{dataset.name}</h3>
                    <span className={`dataset-status ${dataset.analyzed ? 'analyzed' : 'not-analyzed'}`}>
                      {dataset.analyzed ? 'Analyzed' : 'Not Analyzed'}
                    </span>
                  </div>
                  
                  <div className="dataset-card-body">
                    <p className="dataset-description">{dataset.description || 'No description provided'}</p>
                    
                    <div className="dataset-meta">
                      <div className="meta-item">
                        <svg xmlns="http://www.w3.org/2000/svg" className="meta-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{new Date(dataset.createdAt).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="meta-item">
                        <svg xmlns="http://www.w3.org/2000/svg" className="meta-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span>{(dataset.fileSize / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="dataset-card-footer">
                    <Link to={`/datasets/${dataset._id}`} className="btn btn-primary">
                      <svg xmlns="http://www.w3.org/2000/svg" className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View
                    </Link>
                    
                    {dataset.analyzed ? (
                      <Link to={`/visualize/${dataset._id}`} className="btn btn-secondary">
                        <svg xmlns="http://www.w3.org/2000/svg" className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Visualize
                      </Link>
                    ) : (
                      <Link to={`/datasets/${dataset._id}`} className="btn bg-warning text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Analyze
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 