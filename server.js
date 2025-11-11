const express = require('express');
const mongoose = require('mongoose');
const session = require('cookie-session');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/comps381f_group47';
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('DB Error:', err));

// Models
const User = require('./models/user');
const Item = require('./models/item');

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(session({
  secret: 's381f-group47-secret',
  resave: false,
  saveUninitialized: false
}));

// Auth Middleware
const requireLogin = (req, res, next) => {
  if (!req.session.userId) return res.redirect('/login');
  next();
};

// === Routes ===

app.get('/', (req, res) => res.redirect('/login'));

// Login
app.get('/login', (req, res) => res.render('login', { error: null }));

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (user && await bcrypt.compare(password, user.password)) {
    req.session.userId = user._id;
    res.redirect('/items');
  } else {
    res.render('login', { error: 'Invalid credentials' });
  }
});

app.post('/logout', (req, res) => {
  req.session = null;
  res.redirect('/login');
});

// CRUD Pages
app.get('/items', requireLogin, async (req, res) => {
  const search = req.query.search || '';
  const items = await Item.find({ title: { $regex: search, $options: 'i' } });
  res.render('index', { items, search });
});

app.get('/items/create', requireLogin, (req, res) => res.render('create'));
app.post('/items', requireLogin, async (req, res) => {
  await Item.create(req.body);
  res.redirect('/items');
});

app.get('/items/edit/:id', requireLogin, async (req, res) => {
  const item = await Item.findById(req.params.id);
  res.render('edit', { item });
});

app.post('/items/update/:id', requireLogin, async (req, res) => {
  await Item.findByIdAndUpdate(req.params.id, req.body);
  res.redirect('/items');
});

app.post('/items/delete/:id', requireLogin, async (req, res) => {
  await Item.findByIdAndDelete(req.params.id);
  res.redirect('/items');
});

// RESTful API
app.get('/api/items', async (req, res) => {
  const items = await Item.find();
  res.json(items);
});

app.post('/api/items', async (req, res) => {
  const item = await Item.create(req.body);
  res.json(item);
});

app.put('/api/items/:id', async (req, res) => {
  const item = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(item);
});

app.delete('/api/items/:id', async (req, res) => {
  await Item.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// Setup Default User
app.get('/setup', async (req, res) => {
  const hash = await bcrypt.hash('123456', 10);
  await User.findOneAndUpdate(
    { username: 'group47' },
    { username: 'group47', password: hash },
    { upsert: true }
  );
  res.send('User created: group47 / 123456');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit /setup to create admin user`);
});