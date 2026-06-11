const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'elpartners-secret-key-change-in-production';

// ── Middleware ──
app.use(cors());
app.use(express.json());

// Redirect admin .html to clean URLs (before static, so it takes priority)
app.use((req, res, next) => {
  if (req.path.startsWith('/admin/') && req.path.endsWith('.html')) {
    const clean = req.path.slice(0, -5); // remove .html
    return res.redirect(301, clean);
  }
  next();
});

// /admin → /admin/login (before express.static to avoid directory redirect)
app.get('/admin', (req, res) => {
  res.redirect('/admin/login');
});

app.use(express.static(path.join(__dirname, 'public')));

// ── Multer config ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'public', 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, name);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
  if (allowed.test(path.extname(file.originalname))) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpg, jpeg, png, gif, webp, svg) are allowed'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });

// ── Helpers ──

function readJSON(file) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'data', file), 'utf-8'));
}

function writeJSON(file, data) {
  fs.writeFileSync(path.join(__dirname, 'data', file), JSON.stringify(data, null, 2), 'utf-8');
}

// ── Auth Middleware ──

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ── Auth Routes ──

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const users = readJSON('users.json');
  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// ── Content Routes (Public) ──

app.get('/api/content', (req, res) => {
  const content = readJSON('content.json');
  res.json(content);
});

app.get('/api/content/:section', (req, res) => {
  const content = readJSON('content.json');
  const section = req.params.section;
  if (content[section]) {
    res.json(content[section]);
  } else {
    res.status(404).json({ error: 'Section not found' });
  }
});

// ── Content Routes (Protected) ──

app.put('/api/content/:section', authenticate, (req, res) => {
  const content = readJSON('content.json');
  const section = req.params.section;
  if (!(section in content)) {
    return res.status(404).json({ error: 'Section not found' });
  }
  content[section] = req.body;
  writeJSON('content.json', content);
  res.json({ success: true, section, data: content[section] });
});

app.put('/api/content', authenticate, (req, res) => {
  const existing = readJSON('content.json');
  const merged = { ...existing, ...req.body };
  writeJSON('content.json', merged);
  res.json({ success: true });
});

// ── Upload Route ──

app.post('/api/upload', authenticate, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message });
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const url = '/uploads/' + req.file.filename;
    res.json({ success: true, url, filename: req.file.filename });
  });
});

// ── Delete uploaded file ──

app.delete('/api/upload/:filename', authenticate, (req, res) => {
  const filePath = path.join(__dirname, 'public', 'uploads', req.params.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// ── Messages Routes ──

app.post('/api/messages', (req, res) => {
  const { name, phone, email, service, message } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }
  const messages = readJSON('messages.json');
  messages.push({
    id: Date.now(),
    name,
    phone,
    email: email || '',
    service: service || '',
    message: message || '',
    createdAt: new Date().toISOString()
  });
  writeJSON('messages.json', messages);
  res.json({ success: true });
});

app.get('/api/messages', authenticate, (req, res) => {
  const messages = readJSON('messages.json');
  res.json(messages);
});

// ── Admin user management (init + change password) ──

app.put('/api/auth/password', authenticate, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const users = readJSON('users.json');
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  user.password = bcrypt.hashSync(newPassword, 10);
  writeJSON('users.json', users);
  res.json({ success: true });
});

// ── Serve admin pages (clean URLs, no .html) ──
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'dashboard.html'));
});

// ── Start ──

app.listen(PORT, () => {
  console.log(`El Partners server running at http://localhost:${PORT}`);
  console.log(`Admin login at http://localhost:${PORT}/admin/login`);
});
