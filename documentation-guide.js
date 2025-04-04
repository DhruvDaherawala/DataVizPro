// This script converts DOCUMENTATION.md to PDF
// Install dependencies with: npm install markdown-pdf

const markdownpdf = require('markdown-pdf');
const fs = require('fs');
const path = require('path');

console.log('Converting documentation to PDF...');

const options = {
  cssPath: path.join(__dirname, 'pdf-style.css'),
  paperBorder: '1cm',
  remarkable: {
    html: true,
    breaks: true,
    plugins: ['remarkable-meta'],
    syntax: ['footnote', 'sup', 'sub']
  }
};

// Create a simple CSS file for styling
fs.writeFileSync(
  path.join(__dirname, 'pdf-style.css'),
  `
  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 900px;
    margin: 0 auto;
    padding: 20px;
  }
  h1, h2, h3, h4, h5, h6 {
    color: #2c3e50;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
  }
  h1 { font-size: 2.2em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
  h2 { font-size: 1.8em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
  h3 { font-size: 1.5em; }
  h4 { font-size: 1.3em; }
  p { margin-bottom: 1em; }
  a { color: #3498db; text-decoration: none; }
  a:hover { text-decoration: underline; }
  pre {
    background-color: #f5f5f5;
    padding: 15px;
    border-radius: 5px;
    overflow-x: auto;
  }
  code {
    background-color: #f5f5f5;
    padding: 2px 4px;
    border-radius: 3px;
    font-family: Consolas, Monaco, 'Andale Mono', monospace;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 1em;
  }
  table, th, td {
    border: 1px solid #ddd;
  }
  th, td {
    padding: 8px 12px;
    text-align: left;
  }
  th {
    background-color: #f5f5f5;
  }
  blockquote {
    border-left: 4px solid #ccc;
    margin-left: 0;
    padding-left: 15px;
    color: #555;
  }
  img {
    max-width: 100%;
  }
  hr {
    border: 0;
    height: 1px;
    background: #ddd;
    margin: 2em 0;
  }
  `
);

markdownpdf(options)
  .from(path.join(__dirname, 'DOCUMENTATION.md'))
  .to(path.join(__dirname, 'DataVizPro_Documentation.pdf'), function () {
    console.log('Documentation PDF created successfully!');
    console.log('PDF saved as: DataVizPro_Documentation.pdf');
    
    // Clean up the CSS file
    try {
      fs.unlinkSync(path.join(__dirname, 'pdf-style.css'));
    } catch (err) {
      console.error('Could not delete temporary CSS file:', err);
    }
  }); 