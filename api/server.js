const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;

const mimeTypes = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const handler = (req, res) => {
  try {
    let urlPath = (req.url || '/').split('?')[0];

    // If running on Vercel OR hitting the API route
    if (process.env.VERCEL || urlPath.startsWith("/api/")) {
        // Use Vercel's helper methods if available, otherwise fallback to raw HTTP
        if (typeof res.status === 'function' && typeof res.json === 'function') {
            return res.status(200).json({ status: "success", message: "Node backend is running on Vercel!" });
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "success", message: "Node backend is running on Vercel!" }));
        return;
    }

    // Fallback for LOCAL static file serving (When running `node api/server.js`)
    let filePath = urlPath === "/" ? "/index.html" : urlPath;
    
    // Use process.cwd() points to the project root
    const absolutePath = path.join(process.cwd(), filePath);

    const ext = path.extname(absolutePath);
    const contentType = mimeTypes[ext] || "text/plain";

    fs.readFile(absolutePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("File not found");
        return;
      }
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    });
  } catch (error) {
    if (typeof res.status === 'function') {
      res.status(500).json({ error: error.message });
    } else {
      res.writeHead(500);
      res.end("Internal Server Error: " + error.message);
    }
  }
};

// Exporting the handler for Vercel Serverless Format
module.exports = handler;

// Local development fallback to ensure no problems occur locally
if (require.main === module) {
  const server = http.createServer(handler);
  
  server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`\n  ✅ MediAssist Pro is running! (Serverless Format)\n`);
    console.log(`  👉 Link generated: ${url}\n`);
    console.log(`  🚀 Automatically opening the website in your browser...\n`);
    console.log(`  Press Ctrl+C to stop.\n`);

    const startCommand = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    require("child_process").exec(`${startCommand} ${url}`);
  });
}
