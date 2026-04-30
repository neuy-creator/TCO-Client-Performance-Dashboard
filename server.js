const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Try root first, then public subfolder
const rootIndex = path.join(__dirname, 'index.html');
const publicIndex = path.join(__dirname, 'public', 'index.html');
const indexPath = fs.existsSync(rootIndex) ? rootIndex : publicIndex;
const serveDir = fs.existsSync(rootIndex) ? __dirname : path.join(__dirname, 'public');

app.use(express.static(serveDir));

app.get('/', (req, res) => {
  res.sendFile(indexPath);
});

// Debug endpoint — visit /debug to see what files Railway can see
app.get('/debug', (req, res) => {
  const files = fs.readdirSync(__dirname);
  res.json({ __dirname, files, indexPath, exists: fs.existsSync(indexPath) });
});

app.listen(PORT, () => console.log(`TCO Dashboard running on port ${PORT}`));
