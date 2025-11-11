require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('cookie-session');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;

const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection;
db.on('error', () => console.log('MongoDB error'));
db.once('open', () => console.log('MongoDB Connected'));

const User = mongoose.model('User', new mongoose.Schema({
  facebookId: String,
  name: String,
  email: String
}));

const Item = mongoose.model('Item', new mongoose.Schema({
  title: String,
  author: String,
  isbn: String
}));

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: process.env.CALLBACK_URL || "http://localhost:3000/auth/facebook/callback",
  profileFields: ['id', 'displayName', 'emails']
}, async (accessToken, refreshToken, profile, done) => {
  let user = await User.findOne({ facebookId: profile.id });
  if (!user) {
    user = await new User({
      facebookId: profile.id,
      name: profile.displayName,
      email: profile.emails?.[0]?.value || ''
    }).save();
  }
  done(null, user);
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

app.get('/', (req, res) => req.user ? res.redirect('/items') : res.redirect('/login'));
app.get('/login', (req, res) => res.render('login'));
app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));
app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/items')
);
app.get('/logout', (req, res) => { req.logout(() => {}); res.redirect('/login'); });

const ensureAuth = (req, res, next) => req.user ? next() : res.redirect('/login');

app.get('/items', ensureAuth, async (req, res) => {
  const search = req.query.search || '';
  const items = await Item.find({
    $or: [
      { title: { $regex: search, $options: 'i' } },
      { author: { $regex: search, $options: 'i' } }
    ]
  });
  res.render('index', { items, search, user: req.user });
});

app.get('/items/create', ensureAuth, (req, res) => res.render('create'));
app.post('/items', ensureAuth, async (req, res) => {
  await new Item(req.body).save();
  res.redirect('/items');
});

app.get('/items/edit/:id', ensureAuth, async (req, res) => {
  const item = await Item.findById(req.params.id);
  res.render('edit', { item });
});
app.post('/items/update/:id', ensureAuth, async (req, res) => {
  await Item.findByIdAndUpdate(req.params.id, req.body);
  res.redirect('/items');
});
app.post('/items/delete/:id', ensureAuth, async (req, res) => {
  await Item.findByIdAndDelete(req.params.id);
  res.redirect('/items');
});

app.get('/api/items', async (req, res) => res.json(await Item.find()));
app.post('/api/items', async (req, res) => res.json(await new Item(req.body).save()));
app.put('/api/items/:id', async (req, res) => res.json(await Item.findByIdAndUpdate(req.params.id, req.body, { new: true })));
app.delete('/api/items/:id', async (req, res) => {
  await Item.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
