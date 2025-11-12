require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();

// === EJS & 中介軟體 ===
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// === Session 設定（關鍵修正！）===
app.use(session({
  secret: process.env.SESSION_SECRET || 'change_this_in_production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,  // 本地開發設 false，否則 http 會丟 session
    maxAge: 24 * 60 * 60 * 1000  // 1 天
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// === MongoDB 連線（修正語法）===
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bookdb')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// === Schema ===
const UserSchema = new mongoose.Schema({
  googleId: String,
  name: String,
  email: String
});
const ItemSchema = new mongoose.Schema({
  title: String,
  author: String,
  isbn: String
});

const User = mongoose.model('User', UserSchema);
const Item = mongoose.model('Item', ItemSchema);

// === Passport Google Strategy ===
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = new User({
        googleId: profile.id,
        name: profile.displayName,
        email: profile.emails?.[0]?.value || 'no-email@google.com'
      });
      await user.save();
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// === 路由 ===

// 首頁
app.get('/', (req, res) => {
  req.user ? res.redirect('/items') : res.redirect('/login');
});

app.get('/login', (req, res) => res.render('login'));

// Google 登入
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/items');
  }
);

// 登出
app.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect('/login');
  });
});

// === 驗證中介軟體（修正！）===
const ensureAuth = (req, res, next) => {
  if (req.isAuthenticated()) {  // 必須用 isAuthenticated()
    return next();
  }
  res.redirect('/login');
};

// === CRUD 網頁 ===
app.get('/items', ensureAuth, async (req, res) => {
  try {
    const search = req.query.search || '';
    const items = await Item.find({
      $or: [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } }
      ]
    });
    res.render('index', { items, search, user: req.user });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

app.get('/items/create', ensureAuth, (req, res) => res.render('create'));

app.post('/items', ensureAuth, async (req, res) => {
  try {
    await new Item(req.body).save();
    res.redirect('/items');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

app.get('/items/edit/:id', ensureAuth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).send('Not Found');
    res.render('edit', { item });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

app.post('/items/update/:id', ensureAuth, async (req, res) => {
  try {
    await Item.findByIdAndUpdate(req.params.id, req.body);
    res.redirect('/items');
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

app.post('/items/delete/:id', ensureAuth, async (req, res) => {
  try {
    await Item.findByIdAndDelete(req.params.id);
    res.redirect('/items');
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// === REST API ===
app.get('/api/items', async (req, res) => {
  try {
    res.json(await Item.find());
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/items', async (req, res) => {
  try {
    const item = await new Item(req.body).save();
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/items/:id', async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/items/:id', async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// === 啟動 ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Login: http://localhost:${PORT}/login`);
});
