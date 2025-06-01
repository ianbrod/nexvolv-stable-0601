/**
 * Simple HTTP server to serve the test files
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3456; // Use a less common port
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  console.log(`Request: ${req.method} ${req.url}`);

  // Normalize URL to prevent directory traversal
  let filePath = path.normalize(path.join(__dirname, req.url));

  // Default to index.html if the URL ends with a slash
  if (filePath.endsWith('/') || filePath === __dirname) {
    filePath = path.join(__dirname, 'tag-model-test.html');
  }

  // Get the file extension
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  // Read the file
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // File not found
        res.writeHead(404);
        res.end(`File not found: ${req.url}`);
      } else {
        // Server error
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      // Success
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Open http://localhost:${PORT}/tag-model-test.html to run the tests`);
});
