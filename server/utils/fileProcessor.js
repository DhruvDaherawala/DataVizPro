const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

/**
 * Process a CSV file and extract column names and sample data
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<Object>} - Object containing columns and sampleData
 */
const processCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const columns = [];
    let headerParsed = false;
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', (headers) => {
        headerParsed = true;
        headers.forEach(header => columns.push(header));
      })
      .on('data', (data) => {
        if (results.length < 10) {
          results.push(data);
        }
      })
      .on('end', () => {
        if (!headerParsed && results.length > 0) {
          // If no headers were detected, use the keys of the first object
          Object.keys(results[0]).forEach(key => columns.push(key));
        }
        
        resolve({
          columns,
          sampleData: results,
          metadata: {
            totalRows: results.length >= 10 ? '10+ rows' : `${results.length} rows`,
            columnCount: columns.length
          }
        });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

/**
 * Process a JSON file and extract column names and sample data
 * @param {string} filePath - Path to the JSON file
 * @returns {Promise<Object>} - Object containing columns and sampleData
 */
const processJSON = (filePath) => {
  return new Promise((resolve, reject) => {
    try {
      const fileData = fs.readFileSync(filePath, 'utf8');
      const jsonData = JSON.parse(fileData);
      
      // Handle both array of objects and object with array property
      let dataArray = Array.isArray(jsonData) ? jsonData : null;
      
      // If it's not an array, try to find an array property
      if (!dataArray) {
        for (const key in jsonData) {
          if (Array.isArray(jsonData[key]) && jsonData[key].length > 0) {
            dataArray = jsonData[key];
            break;
          }
        }
      }
      
      // If still no array found, treat the whole JSON as a single data point
      if (!dataArray) {
        dataArray = [jsonData];
      }
      
      const columns = dataArray.length > 0 ? Object.keys(dataArray[0]) : [];
      const sampleData = dataArray.slice(0, 10);
      
      resolve({
        columns,
        sampleData,
        metadata: {
          totalRows: dataArray.length >= 10 ? '10+ rows' : `${dataArray.length} rows`,
          columnCount: columns.length
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Process a file based on its extension
 * @param {string} filePath - Path to the file
 * @returns {Promise<Object>} - Object containing processing results
 */
const processFile = async (filePath) => {
  const extension = path.extname(filePath).toLowerCase();
  
  switch (extension) {
    case '.csv':
      return await processCSV(filePath);
    case '.json':
      return await processJSON(filePath);
    default:
      throw new Error(`Unsupported file format: ${extension}`);
  }
};

module.exports = {
  processFile,
  processCSV,
  processJSON
}; 