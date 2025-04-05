const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const os = require('os');

/**
 * Service for handling file operations
 */
class FileService {
  /**
   * Process a CSV file and extract column names and sample data
   * @param {string} filePath - Path to the CSV file
   * @returns {Promise<Object>} - Object containing columns and sampleData
   */
  static processCSV(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      const columns = [];
      let headerParsed = false;
      
      if (!fs.existsSync(filePath)) {
        return reject(new Error(`File not found: ${filePath}`));
      }
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('headers', (headers) => {
          headerParsed = true;
          headers.forEach(header => columns.push(header));
        })
        .on('data', (data) => {
          // Load all data, not just 10 rows
          results.push(data);
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
              totalRows: results.length, // Show actual count
              columnCount: columns.length
            }
          });
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Process a JSON file and extract column names and sample data
   * @param {string} filePath - Path to the JSON file
   * @returns {Promise<Object>} - Object containing columns and sampleData
   */
  static processJSON(filePath) {
    return new Promise((resolve, reject) => {
      try {
        if (!fs.existsSync(filePath)) {
          return reject(new Error(`File not found: ${filePath}`));
        }
        
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
        // Return all data instead of just first 10 rows
        const sampleData = dataArray;
        
        resolve({
          columns,
          sampleData,
          metadata: {
            totalRows: dataArray.length, // Show actual count
            columnCount: columns.length
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Process a file based on its extension
   * @param {string} filePath - Path to the file
   * @returns {Promise<Object>} - Object containing processing results
   */
  static async processFile(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    
    switch (extension) {
      case '.csv':
        return await this.processCSV(filePath);
      case '.json':
        return await this.processJSON(filePath);
      default:
        throw new Error(`Unsupported file format: ${extension}`);
    }
  }

  /**
   * Delete a file from the filesystem
   * @param {string} filePath - Path to the file
   * @returns {Promise<boolean>} - True if file was deleted, false otherwise
   */
  static async deleteFile(filePath) {
    return new Promise((resolve, reject) => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, (err) => {
            if (err) {
              // Just log the error but don't reject in Vercel environment
              if (process.env.VERCEL === '1') {
                console.error(`Warning: Could not delete file ${filePath}: ${err.message}`);
                resolve(false);
              } else {
                reject(err);
              }
            } else {
              resolve(true);
            }
          });
        } else {
          resolve(false);
        }
      } catch (error) {
        // Just log the error but don't reject in Vercel environment
        if (process.env.VERCEL === '1') {
          console.error(`Warning: Error deleting file ${filePath}: ${error.message}`);
          resolve(false);
        } else {
          reject(error);
        }
      }
    });
  }
}

module.exports = FileService;