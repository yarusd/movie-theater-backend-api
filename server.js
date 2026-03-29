require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Joi = require('joi');

const app = express();
const PORT = process.env.PORT || 3001;

// ── 1. MIDDLEWARES ──
app.use(cors());
app.use(bodyParser.json());

// ── 2. SECURITY ──
const SECRET_API_KEY = process.env.API_KEY || "my-temp-key";

const requireApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey && apiKey === SECRET_API_KEY) return next();
    res.status(401).json({ error: "Unauthorized", message: "Invalid or missing x-api-key header." });
};

// ── 3. VALIDATION SCHEMAS ──

const movieSchema = Joi.object({
    title: Joi.string().min(2).max(60).required(),
    genre: Joi.string().valid('Action', 'Horror', 'Comedy', 'Drama', 'Animation', 'Sci-Fi', 'Thriller', 'Adventure', 'Romance').required(),
    duration: Joi.number().positive().required(),
    year: Joi.number().integer().min(1900).max(2030).optional(),
    rating: Joi.number().min(0).max(10).optional().default(0),
    description: Joi.string().max(500).allow('').optional().default('No description available.'),
    poster: Joi.string().uri().allow('').optional().default('https://via.placeholder.com/300x450?text=No+Poster'),
    cast: Joi.array().items(Joi.string()).optional().default([])
});

const registerSchema = Joi.object({
    name: Joi.string().min(2).max(30).pattern(/^[a-zA-Zא-ת\s]+$/).required()
        .messages({ 'string.pattern.base': 'Name must contain only letters.' }),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(20).required(),
    password_confirmation: Joi.any().valid(Joi.ref('password')).required()
        .messages({ 'any.only': 'Passwords do not match' })
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

// הסכימה של ההזמנות (הייתה חסרה!)
const orderSchema = Joi.object({
    userId: Joi.number().required(),
    movieId: Joi.number().required(),
    quantity: Joi.number().min(1).max(8).required() 
});

// ── 4. INITIAL DATA ──
const INITIAL_USERS = [
    { id: 1, email: "user1@test.com", password: "123456", name: "Alice Cohen", role: "user", isLocked: false },
    { id: 2, email: "user2@test.com", password: "123456", name: "Bob Levi", role: "user", isLocked: false },
    { id: 3, email: "admin@test.com", password: "admin123", name: "Admin User", role: "admin", isLocked: false },
    { id: 4, email: "locked@test.com", password: "123456", name: "Locked User", role: "user", isLocked: true }
];

const INITIAL_MOVIES = [
    { id: 1, title: "ThunderBolts", genre: "Action", rating: 7.6, duration: 126, poster: "https://th.bing.com/th/id/OSK.LWtWrR_OOJVN9Rduc088CfthZngBF_jSBCYsv7YvV3g?o=7rm=3&rs=1&pid=ImgDetMain", description: "A ragtag group of antiheroes.", cast: ["Florence Pugh"], year: 2025 },
    { id: 2, title: "Mission: Impossible — The Final Reckoning", genre: "Action", rating: 8.1, duration: 169, poster: "https://image.tmdb.org/t/p/w500/iKPsC9EFUafRP9SrUznI61getVP.jpg", description: "Ethan Hunt's final mission.", cast: ["Tom Cruise"], year: 2025 },
    { id: 3, title: "Sinners", genre: "Horror", rating: 7.9, duration: 137, poster: "https://picsum.photos/seed/3/300/450", description: "Twin brothers in Mississippi.", cast: ["Michael B. Jordan"], year: 2025 },
    { id: 4, title: "A Minecraft Movie", genre: "Animation", rating: 6.8, duration: 101, poster: "https://m.media-amazon.com/images/M/MV5BYzFjMzNjOTktNDBlNy00YWZhLWExYTctZDcxNDA4OWVhOTJjXkEyXkFqcGc@._V1_.jpg", description: "Cubic wonderland survival.", cast: ["Jack Black"], year: 2025 },
    { id: 5, title: "The Accountant 2", genre: "Thriller", rating: 7.3, duration: 129, poster: "https://picsum.photos/seed/5/300/450", description: "Lethal assassin returns.", cast: ["Ben Affleck"], year: 2025 },
    { id: 6, title: "Snow White", genre: "Adventure", rating: 5.4, duration: 110, poster: "https://upload.wikimedia.org/wikipedia/commons/7/78/Snow_White_and_the_Seven_Dwarfs_2.png", description: "Live-action reimagining.", cast: ["Gal Gadot"], year: 2025 },
    { id: 7, title: "Opus", genre: "Thriller", rating: 6.9, duration: 104, poster: "https://picsum.photos/seed/7/300/450", description: "Pop icon compound mystery.", cast: ["Ayo Edebiri"], year: 2025 },
    { id: 8, title: "Until Dawn", genre: "Horror", rating: 6.5, duration: 103, poster: "https://picsum.photos/seed/8/300/450", description: "Remote lodge terror.", cast: ["Ella Rubin"], year: 2025 },
    { id: 9, title: "Superman", genre: "Action", rating: 0, duration: 129, poster: "https://picsum.photos/seed/9/300/450", description: "Clark Kent's balance.", cast: ["David Corenswet"], year: 2025 },
    { id: 10, title: "Avatar: Fire and Ash", genre: "Sci-Fi", rating: 0, duration: 155, poster: "https://picsum.photos/seed/10/300/450", description: "Jake Sully's new threat.", cast: ["Sam Worthington"], year: 2025 },
    { id: 11, title: "Jurassic World Rebirth", genre: "Adventure", rating: 0, duration: 118, poster: "https://picsum.photos/seed/11/300/450", year: 2025 },
    { id: 12, title: "The Fantastic Four: First Steps", genre: "Action", rating: 0, duration: 125, poster: "https://picsum.photos/seed/12/300/450", year: 2025 },
    { id: 13, title: "The Phoenician Scheme", genre: "Adventure", rating: 0, duration: 112, poster: "https://picsum.photos/seed/13/300/450", year: 2025 },
    { id: 14, title: "28 Years Later", genre: "Horror", rating: 0, duration: 115, poster: "https://picsum.photos/seed/14/300/450", year: 2025 },
    { id: 15, title: "Materialists", genre: "Romance", rating: 0, duration: 98, poster: "https://picsum.photos/seed/15/300/450", year: 2025 },
    { id: 16, title: "Elio", genre: "Animation", rating: 0, duration: 103, poster: "https://picsum.photos/seed/16/300/450", year: 2025 },
    { id: 17, title: "Wicked", genre: "Drama", rating: 8.3, duration: 160, poster: "https://m.media-amazon.com/images/M/MV5BOWMwYjYzYmMtMWQ2Ni00NWUwLTg2MzAtYzkzMDBiZDIwOTMwXkEyXkFqcGc@._V1_.jpg", year: 2024 },
    { id: 18, title: "Conclave", genre: "Thriller", rating: 7.8, duration: 120, poster: "https://upload.wikimedia.org/wikipedia/commons/1/1c/Cappella_Sistina_-_2005.jpg", year: 2024 },
    { id: 19, title: "A Complete Unknown", genre: "Drama", rating: 8.0, duration: 141, poster: "https://picsum.photos/seed/19/300/450", year: 2024 },
    { id: 20, title: "Nosferatu", genre: "Horror", rating: 7.5, duration: 132, poster: "https://picsum.photos/seed/20/300/450", year: 2024 },
    { id: 21, title: "Emilia Pérez", genre: "Drama", rating: 8.1, duration: 132, poster: "https://picsum.photos/seed/21/300/450", year: 2024 },
    { id: 22, title: "The Brutalist", genre: "Drama", rating: 8.7, duration: 215, poster: "https://picsum.photos/seed/22/300/450", year: 2024 },
    { id: 23, title: "Anora", genre: "Romance", rating: 8.0, duration: 139, poster: "https://picsum.photos/seed/23/300/450", year: 2024 },
    { id: 24, title: "Alien: Romulus", genre: "Sci-Fi", rating: 7.3, duration: 119, poster: "https://picsum.photos/seed/24/300/450", year: 2024 },
    { id: 25, title: "Gladiator II", genre: "Action", rating: 7.2, duration: 148, poster: "https://m.media-amazon.com/images/M/MV5BMWYzZTM5ZGQtOGE5My00NmM2LWFlMDEtMGNjYjdmOWM1MzA1XkEyXkFqcGc@._V1_.jpg", year: 2024 },
    { id: 26, title: "Dune: Part Two", genre: "Sci-Fi", rating: 8.5, duration: 167, poster: "https://m.media-amazon.com/images/M/MV5BNTc0YmQxMjEtODI5MC00NjFiLTlkMWUtOGQ5NjFmYWUyZGJhXkEyXkFqcGc@._V1_.jpg", year: 2024 },
    { id: 27, title: "Inside Out 2", genre: "Animation", rating: 7.9, duration: 100, poster: "https://upload.wikimedia.org/wikipedia/en/f/f7/Inside_Out_2_poster.jpg", year: 2024 },
    { id: 28, title: "Twisters", genre: "Adventure", rating: 7.2, duration: 122, year: 2024 },
    { id: 29, title: "Deadpool & Wolverine", genre: "Action", rating: 7.8, duration: 128, poster: "https://upload.wikimedia.org/wikipedia/en/4/4c/Deadpool_%26_Wolverine_poster.jpg", year: 2024 },
    { id: 30, title: "Longlegs", genre: "Thriller", rating: 6.8, duration: 101, year: 2024 },
    { id: 31, title: "The Wild Robot", genre: "Animation", rating: 8.4, duration: 102, year: 2024 },
    { id: 32, title: "Speak No Evil", genre: "Thriller", rating: 7.4, duration: 110, year: 2024 },
    { id: 33, title: "Challengers", genre: "Drama", rating: 7.6, duration: 131, year: 2024 },
    { id: 34, title: "Beetlejuice Beetlejuice", genre: "Comedy", rating: 7.1, duration: 104, year: 2024 },
    { id: 35, title: "Fight or Flight", genre: "Action", rating: 6.9, duration: 98, year: 2025 },
    { id: 36, title: "The Housemaid", genre: "Thriller", rating: 7.2, duration: 112, year: 2025 },
    { id: 37, title: "Final Destination: Bloodlines", genre: "Horror", rating: 6.7, duration: 110, year: 2025 },
    { id: 38, title: "Ballerina", genre: "Action", rating: 7.4, duration: 120, year: 2025 },
    { id: 39, title: "How to Train Your Dragon", genre: "Adventure", rating: 7.8, duration: 110, year: 2025 },
    { id: 40, title: "Mickey 17", genre: "Sci-Fi", rating: 7.1, duration: 137, year: 2025 },
    { id: 41, title: "Mission: Impossible 8", genre: "Action", rating: 0, duration: 163, year: 2025 },
    { id: 42, title: "Zootopia 2", genre: "Animation", rating: 0, duration: 108, year: 2025 },
    { id: 43, title: "The Running Man", genre: "Sci-Fi", rating: 0, duration: 118, year: 2025 },
    { id: 44, title: "Freakier Friday", genre: "Comedy", rating: 0, duration: 105, year: 2025 },
    { id: 45, title: "Eddington", genre: "Thriller", rating: 0, duration: 125, year: 2025 },
    { id: 46, title: "Predator: Badlands", genre: "Sci-Fi", rating: 0, duration: 115, year: 2025 },
    { id: 47, title: "Untitled Knives Out 3", genre: "Thriller", rating: 0, duration: 130, year: 2025 },
    { id: 48, title: "Hereditary Haunts", genre: "Horror", rating: 7.8, duration: 127, year: 2024 },
    { id: 49, title: "September 5", genre: "Drama", rating: 7.5, duration: 95, year: 2024 },
    { id: 50, title: "Heretic", genre: "Thriller", rating: 7.3, duration: 110, year: 2024 },
    { id: 51, title: "We Live in Time", genre: "Romance", rating: 7.9, duration: 107, year: 2024 },
    { id: 52, title: "Nickel Boys", genre: "Drama", rating: 8.2, duration: 140, year: 2024 },
    { id: 53, title: "Hard Truths", genre: "Drama", rating: 7.6, duration: 97, year: 2024 },
    { id: 54, title: "Sing Sing", genre: "Drama", rating: 8.1, duration: 105, year: 2024 },
    { id: 55, title: "I'm Still Here", genre: "Drama", rating: 8.4, duration: 137, year: 2024 },
    { id: 56, title: "The Substance", genre: "Horror", rating: 7.1, duration: 140, year: 2024 },
    { id: 57, title: "Kinds of Kindness", genre: "Drama", rating: 6.8, duration: 164, year: 2024 },
    { id: 58, title: "His Three Daughters", genre: "Drama", rating: 7.8, duration: 107, year: 2024 },
    { id: 59, title: "Flow", genre: "Animation", rating: 8.6, duration: 84, year: 2024 },
    { id: 60, title: "Love Lies Bleeding", genre: "Thriller", rating: 7.3, duration: 104, year: 2024 }
];

let TEST_USERS = JSON.parse(JSON.stringify(INITIAL_USERS));
let MOVIES = JSON.parse(JSON.stringify(INITIAL_MOVIES));
let ORDERS = [];

// ── 5. SYSTEM ROUTES ──

app.get('/api/health', (req, res) => {
    res.json({ status: "UP", moviesCount: MOVIES.length, serverTime: new Date().toISOString() });
});

// ── 6. AUTH & REGISTRATION ──

app.post('/api/register', (req, res) => {
    const { error, value } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ error: "Validation Failed", message: error.details[0].message });

    const userExists = TEST_USERS.find(u => u.email === value.email);
    if (userExists) return res.status(400).json({ error: "Conflict", message: "Email already registered." });

    const newUser = { id: Date.now(), name: value.name, email: value.email, password: value.password, role: "user", isLocked: false };
    TEST_USERS.push(newUser);
    res.status(201).json({ message: "User registered successfully", userId: newUser.id });
});

app.post('/api/login', (req, res) => {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ error: "Validation Failed", message: error.details[0].message });

    const user = TEST_USERS.find(u => u.email === value.email && u.password === value.password);
    
    if (!user) return res.status(401).json({ error: "Unauthorized", message: "Invalid email or password." });
    if (user.isLocked) return res.status(403).json({ error: "Forbidden", message: "Your account is locked." });

    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

// ── 7. MOVIE ROUTES ──

app.get('/api/movies', (req, res) => {
    let result = JSON.parse(JSON.stringify(MOVIES));
    const { q, genre, year, id } = req.query;
    if (id) result = result.filter(m => m.id === parseInt(id));
    if (genre) result = result.filter(m => m.genre.toLowerCase() === genre.toLowerCase());
    if (year) result = result.filter(m => m.year === parseInt(year));
    if (q) result = result.filter(m => m.title.toLowerCase().includes(q.toLowerCase()));
    res.json(result);
});

app.post('/api/movies', requireApiKey, (req, res) => {
    const { error, value } = movieSchema.validate(req.body);
    if (error) return res.status(400).json({ error: "Bad Request", message: error.details[0].message });

    const { title, genre, duration, ...rest } = value;
    const newMovie = { 
        id: Date.now(),
        title,
        genre,
        duration,
        ...rest 
    };

    MOVIES.push(newMovie);
    res.status(201).json(newMovie);
});

// ── 8. ORDERS (חזר למקומו!) ──

app.post('/api/orders', (req, res) => {
    const { error, value } = orderSchema.validate(req.body);
    if (error) return res.status(400).json({ error: "Bad Request", message: error.details[0].message });

    const movie = MOVIES.find(m => m.id === value.movieId);
    if (!movie) return res.status(404).json({ error: "Not Found", message: "Movie not found" });

    const order = { 
        orderId: `ORD-${Date.now()}`, 
        userId: value.userId,
        movieId: value.movieId,
        quantity: value.quantity,
        status: "confirmed" 
    };
    
    ORDERS.push(order);
    res.status(201).json({ 
        orderId: order.orderId, 
        status: order.status, 
        message: `Tickets for '${movie.title}' booked successfully!` 
    });
});

// ── 9. UPDATE & RESET ROUTES ──

app.delete('/api/test/reset', requireApiKey, (req, res) => {
    MOVIES = JSON.parse(JSON.stringify(INITIAL_MOVIES));
    TEST_USERS = JSON.parse(JSON.stringify(INITIAL_USERS));
    ORDERS = [];
    res.json({ message: "Database reset to initial state successfully." });
});

app.put('/api/movies/:id', requireApiKey, (req, res) => {
    const id = parseInt(req.params.id);
    const movieIndex = MOVIES.findIndex(m => m.id === id);
    if (movieIndex === -1) return res.status(404).json({ error: "Not Found" });
    
    MOVIES[movieIndex] = { ...MOVIES[movieIndex], ...req.body };
    res.json({ message: "Movie updated successfully", updatedFields: req.body });
});

app.delete('/api/movies/:id', requireApiKey, (req, res) => {
    const id = parseInt(req.params.id);
    const movieIndex = MOVIES.findIndex(m => m.id === id);
    if (movieIndex !== -1) {
        MOVIES.splice(movieIndex, 1);
        res.json({ message: "Movie deleted successfully" });
    } else {
        res.status(404).json({ error: "Not Found" });
    }
});

// ── 10. FINAL SETUP ──
app.use(express.static('public'));
app.use((req, res) => {
    if (req.url.startsWith('/api')) return res.status(404).json({ error: "API Route Not Found" });
    res.redirect('/');
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server live at: http://localhost:${PORT}`);
});