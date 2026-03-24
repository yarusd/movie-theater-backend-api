require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Joi = require('joi'); // הספרייה החדשה לולידציה

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// ── 1. הגדרות אבטחה (API Key) ──────────────────────
const SECRET_API_KEY = process.env.API_KEY || "my-temp-key";

const requireApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey && apiKey === SECRET_API_KEY) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key' });
    }
};

// ── 2. הגדרת "חוזה" הסרט (Validation Schema) ────────
const movieSchema = Joi.object({
    title: Joi.string().min(2).max(100).required(),
    genre: Joi.string().valid('Action', 'Horror', 'Comedy', 'Drama', 'Animation', 'Sci-Fi', 'Thriller', 'Adventure', 'Romance').required(),
    year: Joi.number().integer().min(1900).max(2030).required(),
    duration: Joi.number().positive().required(),
    rating: Joi.number().min(0).max(10).default(0),
    description: Joi.string().max(500).allow(''),
    poster: Joi.string().uri().allow(''),
    cast: Joi.array().items(Joi.string()).default([])
});

// ── 3. DATA ────────────────────────────────────────
let MOVIES = [
  { id: 1, title: "ThunderBolts", genre: "Action", rating: 7.6, duration: 126, poster: "https://th.bing.com/th/id/OSK.LWtWrR_OOJVN9Rduc088CfthZngBF_jSBCYsv7YvV3g?o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=3", description: "A ragtag group of antiheroes...", cast: ["Florence Pugh", "Sebastian Stan"], year: 2025, isFeatured: true, badge: "NOW SHOWING" },
  { id: 2, title: "Mission: Impossible — The Final Reckoning", genre: "Action", rating: 8.1, duration: 169, poster: "https://image.tmdb.org/t/p/w500/iKPsC9EFUafRP9SrUznI61getVP.jpg", description: "Ethan Hunt's final mission.", cast: ["Tom Cruise"], year: 2025, isFeatured: true, badge: "NOW SHOWING" }
  // ... שאר 60 הסרטים שלך כאן ...
];

// ── 4. נתיבי GET (קריאה) ───────────────────────────

// בריאות השרת
app.get('/api/health', (req, res) => {
  res.json({ status: "UP", timestamp: new Date().toISOString(), moviesCount: MOVIES.length });
});

// שליפת כל הסרטים + סינון דינמי חכם
app.get('/api/movies', (req, res) => {
  let result = JSON.parse(JSON.stringify(MOVIES));
  const query = req.query;

  Object.keys(query).forEach(key => {
    const value = query[key];
    if (!value) return;

    if (key === 'q' || key === 'search') {
      result = result.filter(m => 
        m.title.toLowerCase().includes(value.toLowerCase()) || 
        m.description.toLowerCase().includes(value.toLowerCase())
      );
    } 
    else if (MOVIES.length > 0 && MOVIES[0].hasOwnProperty(key)) {
      result = result.filter(m => {
        const itemValue = m[key];
        if (Array.isArray(itemValue)) return itemValue.some(v => v.toString().toLowerCase().includes(value.toLowerCase()));
        if (typeof itemValue === 'number') return itemValue === Number(value);
        if (typeof itemValue === 'boolean') return itemValue === (value.toLowerCase() === 'true');
        return itemValue.toString().toLowerCase() === value.toLowerCase();
      });
    }
  });
  res.json(result);
});

// שליפת סרט בודד לפי ID
app.get('/api/movies/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const movie = MOVIES.find(m => m.id === id);
  if (movie) res.json(movie);
  else res.status(404).json({ error: 'Movie not found' });
});

// ── 5. נתיבים מוגנים (כתיבה ומחיקה) ────────────────

// הוספת סרט עם ולידציית Joi
app.post('/api/movies', requireApiKey, (req, res) => {
    const { error, value } = movieSchema.validate(req.body);

    if (error) {
        return res.status(400).json({ 
            error: "Validation Failed", 
            message: error.details[0].message 
        });
    }

    const newMovie = { ...value, id: Date.now(), isFeatured: false };
    MOVIES.push(newMovie);
    res.status(201).json(newMovie);
});

// מחיקת סרט
app.delete('/api/movies/:id', requireApiKey, (req, res) => {
  const id = parseInt(req.params.id);
  const initialLength = MOVIES.length;
  MOVIES = MOVIES.filter(m => m.id !== id);
  if (MOVIES.length < initialLength) res.json({ message: 'Movie deleted successfully' });
  else res.status(404).json({ error: 'Movie not found' });
});

// התחברות
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (email === "admin@test.com" && password === "admin123") {
    res.json({ id: 3, email, name: "Admin User", role: "admin" });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server is live at: http://localhost:${PORT}`);
});