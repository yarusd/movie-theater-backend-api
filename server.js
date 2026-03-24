require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Joi = require('joi');

const app = express();
const PORT = process.env.PORT || 3001;

// ── MIDDLEWARES ──
app.use(cors());
app.use(bodyParser.json());
// Serving the documentation (index.html) as the root page
app.use(express.static('.'));

// ── 1. SECURITY (API Key) ──
const SECRET_API_KEY = process.env.API_KEY || "my-temp-key";

const requireApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey && apiKey === SECRET_API_KEY) return next();
    res.status(401).json({ error: "Unauthorized", message: "Invalid or missing x-api-key header." });
};

// ── 2. VALIDATION (Joi Schema) ──
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

// ── 3. DATA (Users & 60 Movies) ──
let TEST_USERS = [
    { id: 1, email: "user1@test.com", password: "123456", name: "Alice Cohen", role: "user", isLocked: false },
    { id: 2, email: "user2@test.com", password: "123456", name: "Bob Levi", role: "user", isLocked: false },
    { id: 3, email: "admin@test.com", password: "admin123", name: "Admin User", role: "admin", isLocked: false },
    { id: 4, email: "locked@test.com", password: "123456", name: "Locked User", role: "user", isLocked: true }
];

let MOVIES = [
    { id: 1, title: "ThunderBolts", genre: "Action", rating: 7.6, duration: 126, poster: "https://th.bing.com/th/id/OSK.LWtWrR_OOJVN9Rduc088CfthZngBF_jSBCYsv7YvV3g?o=7rm=3&rs=1&pid=ImgDetMain", description: "A ragtag group of antiheroes...", cast: ["Florence Pugh", "Sebastian Stan"], year: 2025, isFeatured: false },
    { id: 2, title: "Mission: Impossible — The Final Reckoning", genre: "Action", rating: 8.1, duration: 169, poster: "https://image.tmdb.org/t/p/w500/iKPsC9EFUafRP9SrUznI61getVP.jpg", description: "Ethan Hunt's final mission.", cast: ["Tom Cruise"], year: 2025, isFeatured: false },
    { id: 3, title: "Sinners", genre: "Horror", rating: 7.9, duration: 137, poster: "https://picsum.photos/seed/Sinners3/300/450", description: "Twin brothers in Mississippi.", cast: ["Michael B. Jordan"], year: 2025, isFeatured: false },
    { id: 4, title: "A Minecraft Movie", genre: "Animation", rating: 6.8, duration: 101, poster: "https://m.media-amazon.com/images/M/MV5BYzFjMzNjOTktNDBlNy00YWZhLWExYTctZDcxNDA4OWVhOTJjXkEyXkFqcGc@._V1_.jpg", description: "Cubic wonderland survival.", cast: ["Jack Black"], year: 2025, isFeatured: false },
    { id: 5, title: "The Accountant 2", genre: "Thriller", rating: 7.3, duration: 129, poster: "https://picsum.photos/seed/TheAccountant25/300/450", description: "Lethal assassin returns.", cast: ["Ben Affleck"], year: 2025, isFeatured: false },
    { id: 6, title: "Snow White", genre: "Adventure", rating: 5.4, duration: 110, poster: "https://upload.wikimedia.org/wikipedia/commons/7/78/Snow_White_and_the_Seven_Dwarfs_2.png", description: "Live-action reimagining.", cast: ["Gal Gadot"], year: 2025, isFeatured: false },
    { id: 7, title: "Opus", genre: "Thriller", rating: 6.9, duration: 104, poster: "https://picsum.photos/seed/Opus7/300/450", description: "Pop icon compound mystery.", cast: ["Ayo Edebiri"], year: 2025, isFeatured: false },
    { id: 8, title: "Until Dawn", genre: "Horror", rating: 6.5, duration: 103, poster: "https://picsum.photos/seed/UntilDawn8/300/450", description: "Remote lodge terror.", cast: ["Ella Rubin"], year: 2025, isFeatured: false },
    { id: 9, title: "Superman", genre: "Action", rating: 0, duration: 129, poster: "https://picsum.photos/seed/Superman9/300/450", description: "Clark Kent's balance.", cast: ["David Corenswet"], year: 2025, isFeatured: false },
    { id: 10, title: "Avatar: Fire and Ash", genre: "Sci-Fi", rating: 0, duration: 155, poster: "https://picsum.photos/seed/AvatarFireandAsh10/300/450", description: "Jake Sully's new threat.", cast: ["Sam Worthington"], year: 2025, isFeatured: false },
    { id: 11, title: "Jurassic World Rebirth", genre: "Adventure", rating: 0, duration: 118, poster: "https://picsum.photos/seed/JurassicWorldRebirth11/300/450", description: "Dino survival covert mission.", cast: ["Scarlett Johansson"], year: 2025, isFeatured: false },
    { id: 12, title: "The Fantastic Four: First Steps", genre: "Action", rating: 0, duration: 125, poster: "https://picsum.photos/seed/TheFantasticFourFirstSteps12/300/450", description: "Marvel's First Family.", cast: ["Pedro Pascal"], year: 2025, isFeatured: false },
    { id: 13, title: "The Phoenician Scheme", genre: "Adventure", rating: 0, duration: 112, poster: "https://picsum.photos/seed/ThePhoenicianScheme13/300/450", description: "Wes Anderson's odyssey.", cast: ["Tom Hanks"], year: 2025, isFeatured: false },
    { id: 14, title: "28 Years Later", genre: "Horror", rating: 0, duration: 115, poster: "https://picsum.photos/seed/28YearsLater14/300/450", description: "Rage virus 30 years later.", cast: ["Cillian Murphy"], year: 2025, isFeatured: false },
    { id: 15, title: "Materialists", genre: "Romance", rating: 0, duration: 98, poster: "https://picsum.photos/seed/Materialists15/300/450", description: "High-end Manhattan matchmaker.", cast: ["Dakota Johnson"], year: 2025, isFeatured: false },
    { id: 16, title: "Elio", genre: "Animation", rating: 0, duration: 103, poster: "https://picsum.photos/seed/Elio16/300/450", description: "Accidental ambassador of Earth.", cast: ["Zoe Saldana"], year: 2025, isFeatured: false },
    { id: 17, title: "Wicked", genre: "Drama", rating: 8.3, duration: 160, poster: "https://m.media-amazon.com/images/M/MV5BOWMwYjYzYmMtMWQ2Ni00NWUwLTg2MzAtYzkzMDBiZDIwOTMwXkEyXkFqcGc@._V1_.jpg", description: "Story of Oz witches.", cast: ["Ariana Grande"], year: 2024, isFeatured: false },
    { id: 18, title: "Conclave", genre: "Thriller", rating: 7.8, duration: 120, poster: "https://upload.wikimedia.org/wikipedia/commons/1/1c/Cappella_Sistina_-_2005.jpg", description: "Papal election secrets.", cast: ["Ralph Fiennes"], year: 2024, isFeatured: false },
    { id: 19, title: "A Complete Unknown", genre: "Drama", rating: 8.0, duration: 141, poster: "https://picsum.photos/seed/ACompleteUnknown19/300/450", description: "Bob Dylan's New York arrival.", cast: ["Timothée Chalamet"], year: 2024, isFeatured: false },
    { id: 20, title: "Nosferatu", genre: "Horror", rating: 7.5, duration: 132, poster: "https://upload.wikimedia.org/wikipedia/en/9/90/Nosferatu_poster_%28Albin_Grau%2C_1922%29_1.jpg", description: "Gothic vampire reimagining.", cast: ["Bill Skarsgård"], year: 2024, isFeatured: false },
    { id: 21, title: "Emilia Pérez", genre: "Drama", rating: 8.1, duration: 132, poster: "https://picsum.photos/seed/EmiliaPrez21/300/450", description: "Cartel boss transition.", cast: ["Selena Gomez"], year: 2024, isFeatured: false },
    { id: 22, title: "The Brutalist", genre: "Drama", rating: 8.7, duration: 215, poster: "https://picsum.photos/seed/TheBrutalist22/300/450", description: "Architect rebuilding in America.", cast: ["Adrien Brody"], year: 2024, isFeatured: false },
    { id: 23, title: "Anora", genre: "Romance", rating: 8.0, duration: 139, poster: "https://picsum.photos/seed/Anora23/300/450", description: "Sex worker marries oligarch's son.", cast: ["Mikey Madison"], year: 2024, isFeatured: false },
    { id: 24, title: "Alien: Romulus", genre: "Sci-Fi", rating: 7.3, duration: 119, poster: "https://picsum.photos/seed/AlienRomulus24/300/450", description: "Deep space colonists vs Xenomorph.", cast: ["Cailee Spaeny"], year: 2024, isFeatured: false },
    { id: 25, title: "Gladiator II", genre: "Action", rating: 7.2, duration: 148, poster: "https://m.media-amazon.com/images/M/MV5BMWYzZTM5ZGQtOGE5My00NmM2LWFlMDEtMGNjYjdmOWM1MzA1XkEyXkFqcGc@._V1_.jpg", description: "Lucius in the Colosseum.", cast: ["Paul Mescal"], year: 2024, isFeatured: false },
    { id: 26, title: "Dune: Part Two", genre: "Sci-Fi", rating: 8.5, duration: 167, poster: "https://m.media-amazon.com/images/M/MV5BNTc0YmQxMjEtODI5MC00NjFiLTlkMWUtOGQ5NjFmYWUyZGJhXkEyXkFqcGc@._V1_.jpg", description: "Paul Atreides units with Fremen.", cast: ["Zendaya"], year: 2024, isFeatured: false },
    { id: 27, title: "Inside Out 2", genre: "Animation", rating: 7.9, duration: 100, poster: "https://upload.wikimedia.org/wikipedia/en/f/f7/Inside_Out_2_poster.jpg", description: "Riley meets Anxiety.", cast: ["Amy Poehler"], year: 2024, isFeatured: false },
    { id: 28, title: "Twisters", genre: "Adventure", rating: 7.2, duration: 122, poster: "https://picsum.photos/seed/Twisters28/300/450", description: "Storm chasing in Oklahoma.", cast: ["Daisy Edgar-Jones"], year: 2024, isFeatured: false },
    { id: 29, title: "Deadpool & Wolverine", genre: "Action", rating: 7.8, duration: 128, poster: "https://upload.wikimedia.org/wikipedia/en/4/4c/Deadpool_%26_Wolverine_poster.jpg", description: "Marvel Multiverse team-up.", cast: ["Ryan Reynolds", "Hugh Jackman"], year: 2024, isFeatured: false },
    { id: 30, title: "Longlegs", genre: "Thriller", rating: 6.8, duration: 101, poster: "https://picsum.photos/seed/Longlegs30/300/450", description: "FBI Agent vs Serial Killer.", cast: ["Nicolas Cage"], year: 2024, isFeatured: false },
    { id: 31, title: "The Wild Robot", genre: "Animation", rating: 8.4, duration: 102, poster: "https://picsum.photos/seed/TheWildRobot31/300/450", description: "Shipwrecked robot survives.", cast: ["Lupita Nyong'o"], year: 2024, isFeatured: false },
    { id: 32, title: "Speak No Evil", genre: "Thriller", rating: 7.4, duration: 110, poster: "https://picsum.photos/seed/SpeakNoEvil32/300/450", description: "Weekend countryside nightmare.", cast: ["James McAvoy"], year: 2024, isFeatured: false },
    { id: 33, title: "Challengers", genre: "Drama", rating: 7.6, duration: 131, poster: "https://picsum.photos/seed/Challengers33/300/450", description: "Tennis prodigy love triangle.", cast: ["Josh O'Connor"], year: 2024, isFeatured: false },
    { id: 34, title: "Beetlejuice Beetlejuice", genre: "Comedy", rating: 7.1, duration: 104, poster: "https://picsum.photos/seed/BeetlejuiceBeetlejuice34/300/450", description: "Deetz family resurrection.", cast: ["Winona Ryder"], year: 2024, isFeatured: false },
    { id: 35, title: "Fight or Flight", genre: "Action", rating: 6.9, duration: 98, poster: "https://picsum.photos/seed/FightorFlight35/300/450", description: "Assassin protecting a target.", cast: ["Josh Hartnett"], year: 2025, isFeatured: false },
    { id: 36, title: "The Housemaid", genre: "Thriller", rating: 7.2, duration: 112, poster: "https://picsum.photos/seed/TheHousemaid36/300/450", description: "Housekeeping at a remote mansion.", cast: ["Sydney Sweeney"], year: 2025, isFeatured: false },
    { id: 37, title: "Final Destination: Bloodlines", genre: "Horror", rating: 6.7, duration: 110, poster: "https://picsum.photos/seed/FinalDestinationBloodlines37/300/450", description: "Death's new design.", cast: ["Tony Todd"], year: 2025, isFeatured: false },
    { id: 38, title: "Ballerina", genre: "Action", rating: 7.4, duration: 120, poster: "https://picsum.photos/seed/Ballerina38/300/450", description: "John Wick universe vengeance.", cast: ["Ana de Armas"], year: 2025, isFeatured: false },
    { id: 39, title: "How to Train Your Dragon", genre: "Adventure", rating: 7.8, duration: 110, poster: "https://picsum.photos/seed/HowtoTrainYourDragon39/300/450", description: "Live-action Viking bond.", cast: ["Mason Thames"], year: 2025, isFeatured: false },
    { id: 40, title: "Mickey 17", genre: "Sci-Fi", rating: 7.1, duration: 137, poster: "https://picsum.photos/seed/Mickey1740/300/450", description: "Expendable worker reprinted.", cast: ["Robert Pattinson"], year: 2025, isFeatured: false },
    { id: 41, title: "Mission: Impossible 8", genre: "Action", rating: 0, duration: 163, poster: "https://picsum.photos/seed/MI8/300/450", description: "AI Entity threat.", cast: ["Tom Cruise"], year: 2025, isFeatured: false },
    { id: 42, title: "Zootopia 2", genre: "Animation", rating: 0, duration: 108, poster: "https://picsum.photos/seed/Z2/300/450", description: "Judy and Nick return.", cast: ["Jason Bateman"], year: 2025, isFeatured: false },
    { id: 43, title: "The Running Man", genre: "Sci-Fi", rating: 0, duration: 118, poster: "https://picsum.photos/seed/TRM/300/450", description: "Dystopian TV game show.", cast: ["Glen Powell"], year: 2025, isFeatured: false },
    { id: 44, title: "Freakier Friday", genre: "Comedy", rating: 0, duration: 105, poster: "https://picsum.photos/seed/FF/300/450", description: "Body swap chaos again.", cast: ["Lindsay Lohan"], year: 2025, isFeatured: false },
    { id: 45, title: "Eddington", genre: "Thriller", rating: 0, duration: 125, poster: "https://picsum.photos/seed/Edd/300/450", description: "Sheriff vs Mayor.", cast: ["Joaquin Phoenix"], year: 2025, isFeatured: false },
    { id: 46, title: "Predator: Badlands", genre: "Sci-Fi", rating: 0, duration: 115, poster: "https://picsum.photos/seed/PB/300/450", description: "Alien hunt evolves.", cast: ["Elle Fanning"], year: 2025, isFeatured: false },
    { id: 47, title: "Untitled Knives Out 3", genre: "Thriller", rating: 0, duration: 130, poster: "https://picsum.photos/seed/KO3/300/450", description: "Trans-Siberian mystery.", cast: ["Daniel Craig"], year: 2025, isFeatured: false },
    { id: 48, title: "Hereditary Haunts", genre: "Horror", rating: 7.8, duration: 127, poster: "https://picsum.photos/seed/HH/300/450", description: "Family history horror.", cast: ["Toni Collette"], year: 2024, isFeatured: false },
    { id: 49, title: "September 5", genre: "Drama", rating: 7.5, duration: 95, poster: "https://picsum.photos/seed/S5/300/450", description: "1972 Munich Olympics story.", cast: ["Peter Sarsgaard"], year: 2024, isFeatured: false },
    { id: 50, title: "Heretic", genre: "Thriller", rating: 7.3, duration: 110, poster: "https://picsum.photos/seed/Her/300/450", description: "Two missionaries trapped.", cast: ["Hugh Grant"], year: 2024, isFeatured: false },
    { id: 51, title: "We Live in Time", genre: "Romance", rating: 7.9, duration: 107, poster: "https://picsum.photos/seed/WLIT/300/450", description: "Three timelines of love.", cast: ["Florence Pugh"], year: 2024, isFeatured: false },
    { id: 52, title: "Nickel Boys", genre: "Drama", rating: 8.2, duration: 140, poster: "https://picsum.photos/seed/NB/300/450", description: "Florida reform school story.", cast: ["Ethan Herisse"], year: 2024, isFeatured: false },
    { id: 53, title: "Hard Truths", genre: "Drama", rating: 7.6, duration: 97, poster: "https://picsum.photos/seed/HT/300/450", description: "London suburb life struggle.", cast: ["Marianne Jean-Baptiste"], year: 2024, isFeatured: false },
    { id: 54, title: "Sing Sing", genre: "Drama", rating: 8.1, duration: 105, poster: "https://upload.wikimedia.org/wikipedia/commons/0/0c/Sing_Sing.jpg", description: "Prison theater program.", cast: ["Colman Domingo"], year: 2024, isFeatured: false },
    { id: 55, title: "I'm Still Here", genre: "Drama", rating: 8.4, duration: 137, poster: "https://picsum.photos/seed/ISH/300/450", description: "Brazil political activism.", cast: ["Fernanda Torres"], year: 2024, isFeatured: false },
    { id: 56, title: "The Substance", genre: "Horror", rating: 7.1, duration: 140, poster: "https://picsum.photos/seed/TS/300/450", description: "Celebrity black-market drug.", cast: ["Demi Moore"], year: 2024, isFeatured: false },
    { id: 57, title: "Kinds of Kindness", genre: "Drama", rating: 6.8, duration: 164, poster: "https://picsum.photos/seed/KOK/300/450", description: "Darkly comic fables.", cast: ["Emma Stone"], year: 2024, isFeatured: false },
    { id: 58, title: "His Three Daughters", genre: "Drama", rating: 7.8, duration: 107, poster: "https://picsum.photos/seed/HisThreeDaughters58/300/450", description: "Three sisters reunited.", cast: ["Natasha Lyonne"], year: 2024, isFeatured: false },
    { id: 59, title: "Flow", genre: "Animation", rating: 8.6, duration: 84, poster: "https://picsum.photos/seed/Flow59/300/450", description: "Cat survives a flood.", cast: ["Cat"], year: 2024, isFeatured: false },
    { id: 60, title: "Love Lies Bleeding", genre: "Thriller", rating: 7.3, duration: 104, poster: "https://picsum.photos/seed/LoveLiesBleeding60/300/450", description: "Gym manager drifter romance.", cast: ["Kristen Stewart"], year: 2024, isFeatured: false }
];

let ORDERS = [];

// ── 4. GET ROUTES ──

app.get('/api/health', (req, res) => {
    res.json({ 
        status: "UP", 
        moviesCount: MOVIES.length,
        serverTime: new Date().toISOString() 
    });
});

app.get('/api/movies', (req, res) => {
    let result = JSON.parse(JSON.stringify(MOVIES));
    const { q, genre, year, id } = req.query;

    if (id) result = result.filter(m => m.id === parseInt(id));
    if (genre) result = result.filter(m => m.genre.toLowerCase() === genre.toLowerCase());
    if (year) result = result.filter(m => m.year === parseInt(year));
    if (q) {
        result = result.filter(m => 
            m.title.toLowerCase().includes(q.toLowerCase()) || 
            m.description.toLowerCase().includes(q.toLowerCase())
        );
    }
    res.json(result);
});

// ── 5. POST ROUTES ──

app.post('/api/register', (req, res) => {
    res.status(201).json({
        message: "User registered successfully",
        userId: Math.floor(Math.random() * 1000000000)
    });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = TEST_USERS.find(u => u.email === email && u.password === password);
    
    if (user) {
        if (user.isLocked) {
            return res.status(403).json({ error: "Forbidden", message: "Your account is locked. Please contact support." });
        }
        res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
    } else {
        res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    }
});

app.post('/api/movies', requireApiKey, (req, res) => {
    const { error, value } = movieSchema.validate(req.body);
    if (error) return res.status(400).json({ error: "Bad Request", message: error.details[0].message });

    const newMovie = { ...value, id: Date.now(), isFeatured: false };
    MOVIES.push(newMovie);
    res.status(201).json(newMovie);
});

app.post('/api/orders', (req, res) => {
    const orderId = `ORD-${Math.floor(Math.random() * 100000)}`;
    ORDERS.push({ ...req.body, orderId });
    res.status(201).json({
        orderId: orderId,
        status: "confirmed",
        message: "Tickets booked successfully"
    });
});

// ── 6. PUT ROUTE ──

app.put('/api/movies/:id', requireApiKey, (req, res) => {
    const id = parseInt(req.params.id);
    const movieIndex = MOVIES.findIndex(m => m.id === id);

    if (movieIndex === -1) {
        return res.status(404).json({ error: "Not Found", message: "The requested resource or ID does not exist." });
    }

    MOVIES[movieIndex] = { ...MOVIES[movieIndex], ...req.body };
    res.json({
        message: "Movie updated successfully",
        updatedFields: req.body
    });
});

// ── 7. DELETE ROUTES ──

app.delete('/api/movies/:id', requireApiKey, (req, res) => {
    const id = parseInt(req.params.id);
    const movieIndex = MOVIES.findIndex(m => m.id === id);

    if (movieIndex !== -1) {
        MOVIES.splice(movieIndex, 1);
        res.json({ "message": "Movie deleted successfully" });
    } else {
        res.status(404).json({ error: "Not Found", message: "The requested resource or ID does not exist." });
    }
});

app.delete('/api/test/reset', requireApiKey, (req, res) => {
    ORDERS = [];
    res.json({ success: true, message: "Database reset completed" });
});

// ── 8. ERROR HANDLING ──

app.use((req, res) => {
    res.status(404).json({ error: "Not Found", message: "The requested resource or route does not exist." });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Server Error", message: "Internal failure. The system logs have recorded the error." });
});

app.listen(PORT, () => {
    console.log(`✅ Server is live at: http://localhost:${PORT}`);
});