const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const db = require('./server/db');

const PORT = 3000;

// Helper to serve static files with proper MIME types
async function serveStaticFile(res, filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypeMap = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.ico': 'image/x-icon',
      '.json': 'application/json'
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    const content = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
    }
  }
}

// Helper to extract JSON request body
function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

// Create native HTTP Server
const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  try {
    // API Route: GET /api/coffees
    if (pathname === '/api/coffees' && req.method === 'GET') {
      const coffees = await db.getItems();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, coffees }));
      return;
    }

    // API Route: POST /api/coffees
    if (pathname === '/api/coffees' && req.method === 'POST') {
      const body = await getRequestBody(req);
      const { name, category, description, origin, roastLevel, flavorNotes } = body;
      
      if (!name || name.trim() === '') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Coffee name is required' }));
        return;
      }
      if (!description || description.trim() === '') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Description is required' }));
        return;
      }

      const newItem = {
        name,
        category,
        description,
        origin,
        roastLevel,
        flavorNotes
      };

      const addedCoffee = await db.addItem(newItem);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, coffee: addedCoffee }));
      return;
    }

    // API Route: POST /api/coffees/:id/vote
    const voteMatch = pathname.match(/^\/api\/coffees\/([a-zA-Z0-9_-]+)\/vote$/);
    if (voteMatch && req.method === 'POST') {
      const id = voteMatch[1];
      const updatedCoffee = await db.incrementVotes(id);
      if (!updatedCoffee) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Coffee not found' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, coffee: updatedCoffee }));
      return;
    }

    // API Route: POST /api/coffees/:id/rate
    const rateMatch = pathname.match(/^\/api\/coffees\/([a-zA-Z0-9_-]+)\/rate$/);
    if (rateMatch && req.method === 'POST') {
      const id = rateMatch[1];
      const body = await getRequestBody(req);
      const { rating } = body;

      if (rating === undefined || rating < 1 || rating > 5) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Valid rating (1-5) is required' }));
        return;
      }

      const updatedCoffee = await db.addRating(id, rating);
      if (!updatedCoffee) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Coffee not found' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, coffee: updatedCoffee }));
      return;
    }

    // API Route: POST /api/coffees/:id/comment
    const commentMatch = pathname.match(/^\/api\/coffees\/([a-zA-Z0-9_-]+)\/comment$/);
    if (commentMatch && req.method === 'POST') {
      const id = commentMatch[1];
      const body = await getRequestBody(req);
      const { name, rating, text } = body;

      if (!text || text.trim() === '') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Review text is required' }));
        return;
      }

      const result = await db.addComment(id, name, rating, text);
      if (!result) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Coffee not found' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, coffee: result.item, comment: result.comment }));
      return;
    }

    // Serve Static Files from /public directory
    let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
    
    // Check path security (prevent directory traversal)
    const relative = path.relative(path.join(__dirname, 'public'), filePath);
    if (relative && relative.startsWith('..') && !path.isAbsolute(relative)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    try {
      const stats = await fs.stat(filePath);
      if (stats.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      await serveStaticFile(res, filePath);
    } catch {
      // Fallback to index.html for SPA client-side routing
      const fallbackPath = path.join(__dirname, 'public', 'index.html');
      await serveStaticFile(res, fallbackPath);
    }

  } catch (error) {
    console.error('Request processing error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Internal Server Error' }));
  }
});

server.listen(PORT, () => {
  console.log(`\n☕ BrewPulse Coffee Rating Application running!`);
  console.log(`   ➜  Local: http://localhost:${PORT}\n`);
});
