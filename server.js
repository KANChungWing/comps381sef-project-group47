require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');  // 改用 express-session，因為 cookie-session 不支援 resave/saveUninitialized 選項，且更適合伺服器端 session 管理
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Session 中介軟體（使用 express-session，並確保 secret 來自 env）
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret_change_me',  // 建議在 .env 中設定強隨機 secret
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }  // 生產環境強制 HTTPS cookie
}));
app.use(passport.initialize());
app.use(passport.session());

// MongoDB 連線（新增錯誤處理）
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schema 定義（無變更，但確保 ISBN 是 String）
const UserSchema = new mongoose.Schema({
  googleId: String,
  name: String,
  email: String
});
const ItemSchema = new mongoose.Schema({
  title: String,
  author: String,
  isbn: String
  // 如果需要，可加 userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } 來關聯使用者
});

const User = mongoose.model('User', UserSchema);
const Item = mongoose.model('Item', ItemSchema);

// Passport Google 策略（callbackURL 用 env，建議設為 HTTPS，如 ngrok URL）
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback'  // 改為 env，生產用 HTTPS 域名/ ngrok
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = new User({
        googleId: profile.id,
        name: profile.displayName,
        email: profile.emails?.[0]?.value || ''
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

// 根路由（無變更）
app.get('/', (req, res) => {
  if (req.user) {
    res.redirect('/items');
  } else {
    res.redirect('/login');
  }
});

app.get('/login', (req, res) => res.render('login'));

// Google 登入路由（無變更）
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/items')
);

// 登出（新增錯誤處理）
app.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect('/login');
  });
});

// 驗證中介軟體（無變更）
const ensureAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};

// CRUD 網頁路由
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
    res.status(500).send('Server error');
  }
});

app.get('/items/create', ensureAuth, (req, res) => res.render('create'));

app.post('/items', ensureAuth, async (req, res) => {
  try {
    const newItem = new Item(req.body);
    await newItem.save();
    res.redirect('/items');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.get('/items/edit/:id', ensureAuth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).send('Item not found');
    res.render('edit', { item });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post('/items/update/:id', ensureAuth, async (req, res) => {
  try {
    await Item.findByIdAndUpdate(req.params.id, req.body);
    res.redirect('/items');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post('/items/delete/:id', ensureAuth, async (req, res) => {
  try {
    await Item.findByIdAndDelete(req.params.id);
    res.redirect('/items');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// REST API 路由（新增錯誤處理；如果需要驗證，可加 ensureAuth）
app.get('/api/items', async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/items', async (req, res) => {
  try {
    const newItem = new Item(req.body);
    await newItem.save();
    res.status(201).json(newItem);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/items/:id', async (req, res) => {
  try {
    const updatedItem = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedItem) return res.status(404).json({ error: 'Item not found' });
    res.json(updatedItem);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/items/:id', async (req, res) => {
  try {
    const deletedItem = await Item.findByIdAndDelete(req.params.id);
    if (!deletedItem) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 啟動伺服器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
