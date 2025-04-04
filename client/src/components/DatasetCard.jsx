import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { formatDate, formatFileSize } from '../utils/formatters';
import '../styles/DatasetCard.css';

const DatasetCard = ({ dataset, onDelete, onAnalyze }) => {
  const { _id, name, description, createdAt, fileSize, fileType, analyzed } = dataset;
  
  return (
    <div className="dataset-card">
      <div className="dataset-card-header">
        <div className="file-type-icon">
          {fileType === 'csv' && (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="icon">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
          {fileType === 'json' && (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="icon">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
          {fileType === 'excel' && (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="icon">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
        </div>
        <h3 className="dataset-name">{name}</h3>
        <span className={`dataset-status ${analyzed ? 'analyzed' : 'not-analyzed'}`}>
          {analyzed ? 'Analyzed' : 'Not Analyzed'}
        </span>
      </div>
      
      <div className="dataset-card-body">
        <p className="dataset-description">{description || 'No description provided'}</p>
        
        <div className="dataset-meta">
          <div className="meta-item">
            <svg xmlns="http://www.w3.org/2000/svg" className="meta-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{formatDate(createdAt)}</span>
          </div>
          
          <div className="meta-item">
            <svg xmlns="http://www.w3.org/2000/svg" className="meta-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>{formatFileSize(fileSize)}</span>
          </div>
          
          <div className="meta-item">
            <svg xmlns="http://www.w3.org/2000/svg" className="meta-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="file-type">{fileType.toUpperCase()}</span>
          </div>
        </div>
      </div>
      
      <div className="dataset-card-footer">
        <Link to={`/datasets/${_id}`} className="btn btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          View
        </Link>
        
        <button 
          onClick={() => onDelete(_id)}
          className="btn btn-danger"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>
      </div>
    </div>
  );
};

DatasetCard.propTypes = {
  dataset: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    createdAt: PropTypes.string.isRequired,
    fileSize: PropTypes.number.isRequired,
    fileType: PropTypes.string.isRequired,
    analyzed: PropTypes.bool.isRequired
  }).isRequired,
  onDelete: PropTypes.func.isRequired,
  onAnalyze: PropTypes.func
};

export default DatasetCard; 