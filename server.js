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
    // עדכון: הוסרה המגבלה על רשימת ז'אנרים סגורה
    genre: Joi.string().min(2).max(30).required(), 
    duration: Joi.number().positive().max(500).required(),
    year: Joi.number().integer().min(1900).max(2030).required(),
    rating: Joi.number().min(0).max(10).optional().default(0),
    description: Joi.string().max(500).allow('').optional().default('No description available.'),
    poster: Joi.string().uri().allow('').optional().default('https://via.placeholder.com/300x450?text=No+Poster'),
    cast: Joi.array().items(Joi.string()).optional().default([]),
    badge: Joi.string().valid('NOW SHOWING', 'COMING SOON', 'EXTENDED RUN').required(),
    tagline: Joi.string().max(100).allow('').optional(),
    showtimes: Joi.array().items(Joi.string().pattern(/^([0-9]{2}):([0-9]{2})$/)).optional().default([]),
    isFeatured: Joi.boolean().optional().default(false)
});

const registerSchema = Joi.object({
    name: Joi.string().min(2).max(40).pattern(/^[a-zA-Z\s]+$/).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(50).required(),
    password_confirmation: Joi.any().valid(Joi.ref('password')).required()
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

const orderSchema = Joi.object({
    userId: Joi.number().required(),
    movieId: Joi.number().required(),
    seats: Joi.array().items(Joi.string().pattern(/^[A-E][1-8]$/)).min(1).max(8).required(),
    date: Joi.date().iso().min('now').required().messages({
        'date.min': 'Booking date cannot be in the past.',
        'date.format': 'Date must be in YYYY-MM-DD format.'
    }),
    time: Joi.string().pattern(/^([0-9]{2}):([0-9]{2})$/).required()
});

// ── 4. INITIAL DATA (Full List - 60 Movies) ──
const INITIAL_USERS = [
    { id: 1, email: "user1@test.com", password: "123456", name: "Alice Cohen", role: "user", locked: false },
    { id: 2, email: "user2@test.com", password: "123456", name: "Bob Levi", role: "user", locked: false },
    { id: 3, email: "admin@test.com", password: "admin123", name: "Admin User", role: "admin", locked: false },
    { id: 4, email: "locked@test.com", password: "123456", name: "Locked User", role: "user", locked: true }
];

const INITIAL_MOVIES = [
    { id: 1, title: "ThunderBolts", genre: "Action", rating: 7.6, duration: 126, poster: "https://th.bing.com/th/id/OSK.LWtWrR_OOJVN9Rduc088CfthZngBF_jSBCYsv7YvV3g?o=7rm=3&rs=1&pid=ImgDetMain", description: "A ragtag group of antiheroes.", cast: ["Florence Pugh"], year: 2025, badge: "NOW SHOWING", showtimes: ["10:00", "13:00", "16:00", "19:00", "22:00"] },
    { id: 2, title: "Mission: Impossible — The Final Reckoning", genre: "Action", rating: 8.1, duration: 169, poster: "https://image.tmdb.org/t/p/w500/iKPsC9EFUafRP9SrUznI61getVP.jpg", description: "Ethan Hunt's final mission.", cast: ["Tom Cruise"], year: 2025, badge: "NOW SHOWING", showtimes: ["09:30", "12:45", "16:15", "19:30", "22:30"] },
    { id: 3, title: "Sinners", genre: "Horror", rating: 7.9, duration: 137, poster: "https://picsum.photos/seed/Sinners3/300/450", description: "Twin brothers in Mississippi.", cast: ["Michael B. Jordan"], year: 2025, badge: "NOW SHOWING", showtimes: ["11:30", "14:30", "17:30", "20:30", "23:00"] },
    { id: 4, title: "A Minecraft Movie", genre: "Animation", rating: 6.8, duration: 101, poster: "https://m.media-amazon.com/images/M/MV5BYzFjMzNjOTktNDBlNy00YWZhLWExYTctZDcxNDA4OWVhOTJjXkEyXkFqcGc@._V1_.jpg", description: "Cubic wonderland survival.", cast: ["Jack Black"], year: 2025, badge: "NOW SHOWING", showtimes: ["10:00", "12:00", "14:00", "16:00", "18:00"] },
    { id: 5, title: "The Accountant 2", genre: "Thriller", rating: 7.3, duration: 129, poster: "https://picsum.photos/seed/TheAccountant25/300/450", description: "Lethal assassin returns.", cast: ["Ben Affleck"], year: 2025, badge: "NOW SHOWING", showtimes: ["11:00", "14:00", "17:00", "20:00", "22:45"] },
    { id: 6, title: "Snow White", genre: "Adventure", rating: 5.4, duration: 110, poster: "https://upload.wikimedia.org/wikipedia/commons/7/78/Snow_White_and_the_Seven_Dwarfs_2.png", description: "Live-action reimagining.", cast: ["Gal Gadot"], year: 2025, badge: "NOW SHOWING", showtimes: ["10:30", "13:00", "15:30", "18:00", "20:30"] },
    { id: 7, title: "Opus", genre: "Thriller", rating: 6.9, duration: 104, poster: "https://picsum.photos/seed/Opus7/300/450", description: "Pop icon compound mystery.", cast: ["Ayo Edebiri"], year: 2025, badge: "NOW SHOWING", showtimes: ["13:30", "16:30", "19:30", "22:30"] },
    { id: 8, title: "Until Dawn", genre: "Horror", rating: 6.5, duration: 103, poster: "https://picsum.photos/seed/UntilDawn8/300/450", description: "Remote lodge terror.", cast: ["Ella Rubin"], year: 2025, badge: "NOW SHOWING", showtimes: ["14:00", "17:00", "20:00", "22:30"] },
    { id: 9, title: "Superman", genre: "Action", rating: 0, duration: 129, poster: "https://picsum.photos/seed/9/300/450", year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 10, title: "Avatar: Fire and Ash", genre: "Sci-Fi", rating: 0, duration: 155, poster: "https://picsum.photos/seed/10/300/450", year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 11, title: "Jurassic World Rebirth", genre: "Adventure", rating: 0, duration: 118, poster: "https://picsum.photos/seed/11/300/450", year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 12, title: "The Fantastic Four: First Steps", genre: "Action", rating: 0, duration: 125, poster: "https://picsum.photos/seed/12/300/450", year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 13, title: "The Phoenician Scheme", genre: "Adventure", rating: 0, duration: 112, poster: "https://picsum.photos/seed/13/300/450", year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 14, title: "28 Years Later", genre: "Horror", rating: 0, duration: 115, poster: "https://picsum.photos/seed/14/300/450", year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 15, title: "Materialists", genre: "Romance", rating: 0, duration: 98, poster: "https://picsum.photos/seed/15/300/450", year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 16, title: "Elio", genre: "Animation", rating: 0, duration: 103, poster: "https://picsum.photos/seed/16/300/450", year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 17, title: "Wicked", genre: "Drama", rating: 8.3, duration: 160, poster: "https://m.media-amazon.com/images/M/MV5BOWMwYjYzYmMtMWQ2Ni00NWUwLTg2MzAtYzkzMDBiZDIwOTMwXkEyXkFqcGc@._V1_.jpg", year: 2024, badge: "EXTENDED RUN", showtimes: ["11:30", "15:00", "18:30", "22:00"] },
    { id: 18, title: "Conclave", genre: "Thriller", rating: 7.8, duration: 120, poster: "https://upload.wikimedia.org/wikipedia/commons/1/1c/Cappella_Sistina_-_2005.jpg", year: 2024, badge: "EXTENDED RUN", showtimes: ["13:00", "16:30", "20:00"] },
    { id: 19, title: "A Complete Unknown", genre: "Drama", rating: 8.0, duration: 141, poster: "https://picsum.photos/seed/19/300/450", year: 2024, badge: "EXTENDED RUN", showtimes: ["12:30", "16:00", "19:30"] },
    { id: 20, title: "Nosferatu", genre: "Horror", rating: 7.5, duration: 132, poster: "https://picsum.photos/seed/20/300/450", year: 2024, badge: "EXTENDED RUN", showtimes: ["15:30", "18:30", "21:30"] },
    { id: 21, title: "Emilia Pérez", genre: "Drama", rating: 8.1, duration: 132, poster: "https://picsum.photos/seed/21/300/450", year: 2024, badge: "EXTENDED RUN", showtimes: ["13:30", "17:00", "20:30"] },
    { id: 22, title: "The Brutalist", genre: "Drama", rating: 8.7, duration: 215, poster: "https://picsum.photos/seed/22/300/450", year: 2024, badge: "EXTENDED RUN", showtimes: ["11:00", "17:30"] },
    { id: 23, title: "Anora", genre: "Romance", rating: 8.0, duration: 139, poster: "https://picsum.photos/seed/23/300/450", year: 2024, badge: "EXTENDED RUN", showtimes: ["12:00", "15:30", "19:00", "22:30"] },
    { id: 24, title: "Alien: Romulus", genre: "Sci-Fi", rating: 7.3, duration: 119, poster: "https://picsum.photos/seed/24/300/450", year: 2024, badge: "EXTENDED RUN", showtimes: ["14:30", "18:00", "21:30"] },
    { id: 25, title: "Gladiator II", genre: "Action", rating: 7.2, duration: 148, poster: "https://m.media-amazon.com/images/M/MV5BMWYzZTM5ZGQtOGE5My00NmM2LWFlMDEtMGNjYjdmOWM1MzA1XkEyXkFqcGc@._V1_.jpg", year: 2024, badge: "EXTENDED RUN", showtimes: ["11:00", "14:30", "18:00", "21:30"] },
    { id: 26, title: "Dune: Part Two", genre: "Sci-Fi", rating: 8.5, duration: 167, poster: "https://m.media-amazon.com/images/M/MV5BNTc0YmQxMjEtODI5MC00NjFiLTlkMWUtOGQ5NjFmYWUyZGJhXkEyXkFqcGc@._V1_.jpg", year: 2024, badge: "EXTENDED RUN", showtimes: ["11:30", "15:00", "18:30", "22:00"] },
    { id: 27, title: "Inside Out 2", genre: "Animation", rating: 7.9, duration: 100, poster: "https://upload.wikimedia.org/wikipedia/en/f/f7/Inside_Out_2_poster.jpg", year: 2024, badge: "EXTENDED RUN", showtimes: ["10:00", "12:30", "15:00", "17:30", "20:00"] },
    { id: 28, title: "Twisters", genre: "Adventure", rating: 7.2, duration: 122, year: 2024, badge: "EXTENDED RUN", showtimes: ["10:30", "13:30", "16:30", "19:30"] },
    { id: 29, title: "Deadpool & Wolverine", genre: "Action", rating: 7.8, duration: 128, poster: "https://upload.wikimedia.org/wikipedia/en/4/4c/Deadpool_%26_Wolverine_poster.jpg", year: 2024, badge: "EXTENDED RUN", showtimes: ["11:00", "14:00", "17:00", "20:00"] },
    { id: 30, title: "Longlegs", genre: "Thriller", rating: 6.8, duration: 101, year: 2024, badge: "EXTENDED RUN", showtimes: ["14:30", "18:00", "21:00"] },
    { id: 31, title: "The Wild Robot", genre: "Animation", rating: 8.4, duration: 102, year: 2024, badge: "EXTENDED RUN", showtimes: ["10:00", "12:30", "15:00", "17:30"] },
    { id: 32, title: "Speak No Evil", genre: "Thriller", rating: 7.4, duration: 110, year: 2024, badge: "EXTENDED RUN", showtimes: ["13:00", "16:00", "19:00"] },
    { id: 33, title: "Challengers", genre: "Drama", rating: 7.6, duration: 131, year: 2024, badge: "EXTENDED RUN", showtimes: ["12:00", "15:00", "18:00", "21:00"] },
    { id: 34, title: "Beetlejuice Beetlejuice", genre: "Comedy", rating: 7.1, duration: 104, year: 2024, badge: "EXTENDED RUN", showtimes: ["11:30", "14:30", "17:30", "20:30"] },
    { id: 35, title: "Fight or Flight", genre: "Action", rating: 6.9, duration: 98, year: 2025, badge: "NOW SHOWING", showtimes: ["12:00", "15:00", "18:00", "21:00"] },
    { id: 36, title: "The Housemaid", genre: "Thriller", rating: 7.2, duration: 112, year: 2025, badge: "NOW SHOWING", showtimes: ["11:00", "14:00", "17:00", "20:00"] },
    { id: 37, title: "Final Destination: Bloodlines", genre: "Horror", rating: 6.7, duration: 110, year: 2025, badge: "NOW SHOWING", showtimes: ["13:00", "16:00", "19:00"] },
    { id: 38, title: "Ballerina", genre: "Action", rating: 7.4, duration: 120, year: 2025, badge: "NOW SHOWING", showtimes: ["10:30", "13:30", "16:30", "19:30"] },
    { id: 39, title: "How to Train Your Dragon", genre: "Adventure", rating: 7.8, duration: 110, year: 2025, badge: "NOW SHOWING", showtimes: ["10:00", "12:30", "15:00", "17:30"] },
    { id: 40, title: "Mickey 17", genre: "Sci-Fi", rating: 7.1, duration: 137, year: 2025, badge: "NOW SHOWING", showtimes: ["11:30", "14:30", "17:30", "20:30"] },
    { id: 41, title: "Mission: Impossible 8 — Dead Reckoning Part Two", genre: "Action", rating: 0, duration: 163, year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 42, title: "Zootopia 2", genre: "Animation", rating: 0, duration: 108, year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 43, title: "The Running Man", genre: "Sci-Fi", rating: 0, duration: 118, year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 44, title: "Freakier Friday", genre: "Comedy", rating: 0, duration: 105, year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 45, title: "Eddington", genre: "Thriller", rating: 0, duration: 125, year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 46, title: "Predator: Badlands", genre: "Sci-Fi", rating: 0, duration: 115, year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 47, title: "Untitled Knives Out 3", genre: "Thriller", rating: 0, duration: 130, year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 48, title: "Hereditary Haunts", genre: "Horror", rating: 7.8, duration: 127, year: 2024, badge: "EXTENDED RUN", showtimes: ["15:00", "18:30", "21:30"] },
    { id: 49, title: "September 5", genre: "Drama", rating: 7.5, duration: 95, year: 2024, badge: "EXTENDED RUN", showtimes: ["12:30", "15:30", "18:30"] },
    { id: 50, title: "Heretic", genre: "Thriller", rating: 7.3, duration: 110, year: 2024, badge: "EXTENDED RUN", showtimes: ["14:00", "17:00", "20:00"] },
    { id: 51, title: "We Live in Time", genre: "Romance", rating: 7.9, duration: 107, year: 2024, badge: "EXTENDED RUN", showtimes: ["12:00", "15:00", "18:00"] },
    { id: 52, title: "Nickel Boys", genre: "Drama", rating: 8.2, duration: 140, year: 2024, badge: "EXTENDED RUN", showtimes: ["11:00", "14:30", "18:00"] },
    { id: 53, title: "Hard Truths", genre: "Drama", rating: 7.6, duration: 97, year: 2024, badge: "EXTENDED RUN", showtimes: ["13:30", "16:30", "19:30"] },
    { id: 54, title: "Sing Sing", genre: "Drama", rating: 8.1, duration: 105, year: 2024, badge: "EXTENDED RUN", showtimes: ["13:00", "16:00", "19:00"] },
    { id: 55, title: "I'm Still Here", genre: "Drama", rating: 8.4, duration: 137, year: 2024, badge: "EXTENDED RUN", showtimes: ["12:30", "15:30", "18:30"] },
    { id: 56, title: "The Substance", genre: "Horror", rating: 7.1, duration: 140, year: 2024, badge: "EXTENDED RUN", showtimes: ["14:30", "17:30", "20:30"] },
    { id: 57, title: "Kinds of Kindness", genre: "Drama", rating: 6.8, duration: 164, year: 2024, badge: "EXTENDED RUN", showtimes: ["12:00", "16:00", "20:00"] },
    { id: 58, title: "His Three Daughters", genre: "Drama", rating: 7.8, duration: 107, year: 2024, badge: "EXTENDED RUN", showtimes: ["13:30", "16:30", "19:30"] },
    { id: 59, title: "Flow", genre: "Animation", rating: 8.6, duration: 84, year: 2024, badge: "EXTENDED RUN", showtimes: ["10:00", "12:00", "14:00"] },
    { id: 60, title: "Love Lies Bleeding", genre: "Thriller", rating: 7.3, duration: 104, year: 2024, badge: "EXTENDED RUN", showtimes: ["14:30", "17:30", "20:30"] }
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

    const newUser = { id: Date.now(), ...value, role: "user", locked: false };
    delete newUser.password_confirmation;
    TEST_USERS.push(newUser);
    res.status(201).json({ message: "User registered successfully", userId: newUser.id });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = TEST_USERS.find(u => u.email === email && u.password === password);
    
    if (!user) return res.status(401).json({ error: "Unauthorized", message: "Invalid email or password." });
    if (user.locked) return res.status(403).json({ error: "Forbidden", message: "Your account is locked." });

    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, locked: user.locked });
});

// ── 7. MOVIE ROUTES ──

app.get('/api/movies', (req, res) => {
    let result = JSON.parse(JSON.stringify(MOVIES));
    const { q, genre, year, id, badge, sort } = req.query;
    
    if (year && isNaN(parseInt(year))) return res.status(400).json({ error: "Bad Request", message: "Year must be a number" });

    if (id) result = result.filter(m => m.id === parseInt(id));
    if (genre) result = result.filter(m => m.genre.toLowerCase() === genre.toLowerCase());
    if (year) result = result.filter(m => m.year === parseInt(year));

    // ולידציה 2: חיפוש חכם (Smart Search)
    if (q) {
        const query = q.toLowerCase();
        result = result.filter(m => 
            m.title.toLowerCase().includes(query) || 
            m.genre.toLowerCase().includes(query) || 
            (m.cast && m.cast.some(actor => actor.toLowerCase().includes(query)))
        );
    }
    
    if (badge) result = result.filter(m => m.badge === badge.toUpperCase().replace('-', ' '));

    if (sort === 'rating') result.sort((a, b) => b.rating - a.rating);
    
    res.json(result);
});

app.get('/api/movies/:id/occupied', (req, res) => {
    const { date, time } = req.query;
    const movieId = parseInt(req.params.id);
    const occupied = ORDERS
        .filter(o => o.movieId === movieId && o.date === date && o.time === time)
        .flatMap(o => o.seats);
    res.json(occupied);
});

app.post('/api/movies', requireApiKey, (req, res) => {
    const { error, value } = movieSchema.validate(req.body);
    if (error) return res.status(400).json({ error: "Bad Request", message: error.details[0].message });

    // ולידציה 3: מניעת כפילויות סרטים
    const movieExists = MOVIES.find(m => m.title.toLowerCase() === value.title.toLowerCase());
    if (movieExists) return res.status(409).json({ error: "Conflict", message: "Movie already exists." });

    const newMovie = { id: Date.now(), ...value };
    MOVIES.push(newMovie);
    res.status(201).json(newMovie);
});

app.put('/api/movies/:id', requireApiKey, (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Bad Request", message: "ID must be a valid number" });

    const movieIndex = MOVIES.findIndex(m => m.id === id);
    if (movieIndex === -1) return res.status(404).json({ error: "Not Found" });
    
    const { error, value } = movieSchema.validate(req.body);
    if (error) return res.status(400).json({ error: "Validation Failed", message: error.details[0].message });

    // --- הבדיקה החדשה: מניעת כפילות שם בעדכון ---
    const duplicateMovie = MOVIES.find(m => 
        m.title.toLowerCase() === value.title.toLowerCase() && m.id !== id
    );
    
    if (duplicateMovie) {
        return res.status(409).json({ 
            error: "Conflict", 
            message: `Cannot update: A movie with the title '${value.title}' already exists.` 
        });
    }
    // ------------------------------------------

    MOVIES[movieIndex] = { ...value, id };
    res.json({ message: "Movie updated successfully", movie: MOVIES[movieIndex] });
});

app.delete('/api/movies/:id', requireApiKey, (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Bad Request", message: "ID must be a valid number" });

    const movieIndex = MOVIES.findIndex(m => m.id === id);
    if (movieIndex !== -1) {
        MOVIES.splice(movieIndex, 1);
        res.json({ message: "Movie deleted successfully" });
    } else {
        res.status(404).json({ error: "Not Found" });
    }
});

// ── 8. ORDERS ──

app.post('/api/orders', (req, res) => {
    const { error, value } = orderSchema.validate(req.body);
    if (error) return res.status(400).json({ error: "Bad Request", message: error.details[0].message });

    const user = TEST_USERS.find(u => u.id === value.userId);
    if (!user) return res.status(401).json({ error: "Unauthorized", message: "User not found." });

    const movie = MOVIES.find(m => m.id === value.movieId);
    if (!movie) return res.status(404).json({ error: "Not Found", message: "Movie not found." });

    const isTaken = ORDERS.some(o => 
        o.movieId === value.movieId && o.date === value.date && o.time === value.time &&
        o.seats.some(s => value.seats.includes(s))
    );

    if (isTaken) return res.status(409).json({ error: "Conflict", message: "Seats already booked." });

    const order = { orderId: `ORD-${Date.now()}`, ...value, status: "confirmed" };
    ORDERS.push(order);
    res.status(201).json(order);
});

// ולידציה 4: הגנת IDOR
app.get('/api/orders/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);
    const authenticatedUserId = req.headers['x-user-id'];

    if (authenticatedUserId && parseInt(authenticatedUserId) !== userId) {
        return res.status(403).json({ 
            error: "Forbidden", 
            message: "IDOR Attempt Detected: You cannot view orders of another user." 
        });
    }

    const userOrders = ORDERS.filter(o => o.userId === userId);
    res.json(userOrders);
});

// ולידציה 5: ביטול הזמנה
app.delete('/api/orders/:orderId', (req, res) => {
    const { orderId } = req.params;
    const orderIndex = ORDERS.findIndex(o => o.orderId === orderId);
    
    if (orderIndex === -1) {
        return res.status(404).json({ error: "Not Found", message: "Order not found." });
    }
    
    ORDERS.splice(orderIndex, 1);
    res.json({ message: "Order cancelled successfully. Seats are now free." });
});

// ── 9. SYSTEM RESET ──

app.delete('/api/test/reset', requireApiKey, (req, res) => {
    MOVIES = JSON.parse(JSON.stringify(INITIAL_MOVIES));
    TEST_USERS = JSON.parse(JSON.stringify(INITIAL_USERS));
    ORDERS = [];
    res.json({ message: "Database reset successfully." });
});

// ── 10. FINAL SETUP ──
app.use(express.static('public'));
app.use((req, res) => {
    if (req.url.startsWith('/api')) return res.status(404).json({ error: "API Route Not Found" });
    res.redirect('/');
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Enterprise API live at: http://localhost:${PORT}`);
});