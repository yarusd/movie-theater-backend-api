require('dotenv').config(); // טעינת משתני סביבה
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// ── הגדרת מפתח ה-API וה-Middleware (חומת ההגנה) ────────
const SECRET_API_KEY = process.env.API_KEY || "my-temp-key";

const requireApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey && apiKey === SECRET_API_KEY) {
        next(); // המפתח תקין, ממשיכים הלאה
    } else {
        res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key' });
    }
};
// ────────────────────────────────────────────────────────

// ── DATA (The 60 Movies are here) ─────────────────────
let TEST_USERS = [
  { id: 1, email: "user1@test.com", password: "123456", name: "Alice Cohen", role: "user", locked: false },
  { id: 2, email: "user2@test.com", password: "123456", name: "Bob Levi", role: "user", locked: false },
  { id: 3, email: "admin@test.com", password: "admin123", name: "Admin User", role: "admin", locked: false },
  { id: 4, email: "locked@test.com", password: "123456", name: "Locked User", role: "user", locked: true },
];

let MOVIES = [
  { id: 1, title: "ThunderBolts", genre: "Action", rating: 7.6, duration: 126, poster: "https://th.bing.com/th/id/OSK.LWtWrR_OOJVN9Rduc088CfthZngBF_jSBCYsv7YvV3g?o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=3", description: "A ragtag group of antiheroes...", cast: ["Florence Pugh", "Sebastian Stan"], year: 2025, userRatings: [{ userId: 1, rating: 4 }], isFeatured: true, badge: "NOW SHOWING" },
  { id: 2, title: "Mission: Impossible — The Final Reckoning", genre: "Action", rating: 8.1, duration: 169, poster: "https://image.tmdb.org/t/p/w500/iKPsC9EFUafRP9SrUznI61getVP.jpg", description: "Ethan Hunt's final mission.", cast: ["Tom Cruise"], year: 2025, userRatings: [{ userId: 2, rating: 5 }], isFeatured: true, badge: "NOW SHOWING" },
  { id: 3, title: "Sinners", genre: "Horror", rating: 7.9, duration: 137, poster: "https://picsum.photos/seed/Sinners3/300/450", description: "Twin brothers in Mississippi.", cast: ["Michael B. Jordan"], year: 2025, userRatings: [{ userId: 1, rating: 4 }], isFeatured: true, badge: "NOW SHOWING" },
  { id: 4, title: "A Minecraft Movie", genre: "Animation", rating: 6.8, duration: 101, poster: "https://m.media-amazon.com/images/M/MV5BYzFjMzNjOTktNDBlNy00YWZhLWExYTctZDcxNDA4OWVhOTJjXkEyXkFqcGc@._V1_.jpg", description: "Cubic wonderland survival.", cast: ["Jack Black"], year: 2025, userRatings: [], isFeatured: false, badge: "NOW SHOWING" },
  { id: 5, title: "The Accountant 2", genre: "Thriller", rating: 7.3, duration: 129, poster: "https://picsum.photos/seed/TheAccountant25/300/450", description: "Lethal assassin returns.", cast: ["Ben Affleck"], year: 2025, userRatings: [], isFeatured: false, badge: "NOW SHOWING" },
  { id: 6, title: "Snow White", genre: "Adventure", rating: 5.4, duration: 110, poster: "https://upload.wikimedia.org/wikipedia/commons/7/78/Snow_White_and_the_Seven_Dwarfs_2.png", description: "Live-action reimagining.", cast: ["Gal Gadot"], year: 2025, userRatings: [], isFeatured: false, badge: "NOW SHOWING" },
  { id: 7, title: "Opus", genre: "Thriller", rating: 6.9, duration: 104, poster: "https://picsum.photos/seed/Opus7/300/450", description: "Pop icon compound mystery.", cast: ["Ayo Edebiri"], year: 2025, userRatings: [{ userId: 2, rating: 3 }], isFeatured: false, badge: "NOW SHOWING" },
  { id: 8, title: "Until Dawn", genre: "Horror", rating: 6.5, duration: 103, poster: "https://picsum.photos/seed/UntilDawn8/300/450", description: "Remote lodge terror.", cast: ["Ella Rubin"], year: 2025, userRatings: [], isFeatured: false, badge: "NOW SHOWING" },
  { id: 9, title: "Superman", genre: "Action", rating: 0, duration: 129, poster: "https://picsum.photos/seed/Superman9/300/450", description: "Clark Kent's balance.", cast: ["David Corenswet"], year: 2025, userRatings: [], isFeatured: true, badge: "COMING SOON" },
  { id: 10, title: "Avatar: Fire and Ash", genre: "Sci-Fi", rating: 0, duration: 155, poster: "https://picsum.photos/seed/AvatarFireandAsh10/300/450", description: "Jake Sully's new threat.", cast: ["Sam Worthington"], year: 2025, userRatings: [], isFeatured: true, badge: "COMING SOON" },
  { id: 11, title: "Jurassic World Rebirth", genre: "Adventure", rating: 0, duration: 118, poster: "https://picsum.photos/seed/JurassicWorldRebirth11/300/450", description: "Dino survival covert mission.", cast: ["Scarlett Johansson"], year: 2025, userRatings: [], isFeatured: false, badge: "COMING SOON" },
  { id: 12, title: "The Fantastic Four: First Steps", genre: "Action", rating: 0, duration: 125, poster: "https://picsum.photos/seed/TheFantasticFourFirstSteps12/300/450", description: "Marvel's First Family.", cast: ["Pedro Pascal"], year: 2025, userRatings: [], isFeatured: false, badge: "COMING SOON" },
  { id: 13, title: "The Phoenician Scheme", genre: "Adventure", rating: 0, duration: 112, poster: "https://picsum.photos/seed/ThePhoenicianScheme13/300/450", description: "Wes Anderson's odyssey.", cast: ["Tom Hanks"], year: 2025, userRatings: [], isFeatured: false, badge: "COMING SOON" },
  { id: 14, title: "28 Years Later", genre: "Horror", rating: 0, duration: 115, poster: "https://picsum.photos/seed/28YearsLater14/300/450", description: "Rage virus 30 years later.", cast: ["Cillian Murphy"], year: 2025, userRatings: [], isFeatured: false, badge: "COMING SOON" },
  { id: 15, title: "Materialists", genre: "Romance", rating: 0, duration: 98, poster: "https://picsum.photos/seed/Materialists15/300/450", description: "High-end Manhattan matchmaker.", cast: ["Dakota Johnson"], year: 2025, userRatings: [], isFeatured: false, badge: "COMING SOON" },
  { id: 16, title: "Elio", genre: "Animation", rating: 0, duration: 103, poster: "https://picsum.photos/seed/Elio16/300/450", description: "Accidental ambassador of Earth.", cast: ["Zoe Saldana"], year: 2025, userRatings: [], isFeatured: false, badge: "COMING SOON" },
  { id: 17, title: "Wicked", genre: "Drama", rating: 8.3, duration: 160, poster: "https://m.media-amazon.com/images/M/MV5BOWMwYjYzYmMtMWQ2Ni00NWUwLTg2MzAtYzkzMDBiZDIwOTMwXkEyXkFqcGc@._V1_.jpg", description: "Story of Oz witches.", cast: ["Ariana Grande"], year: 2024, userRatings: [{ userId: 1, rating: 5 }, { userId: 2, rating: 4 }], isFeatured: true, badge: "EXTENDED RUN" },
  { id: 18, title: "Conclave", genre: "Thriller", rating: 7.8, duration: 120, poster: "https://upload.wikimedia.org/wikipedia/commons/1/1c/Cappella_Sistina_-_2005.jpg", description: "Papal election secrets.", cast: ["Ralph Fiennes"], year: 2024, userRatings: [{ userId: 2, rating: 4 }], isFeatured: false, badge: "EXTENDED RUN" },
  { id: 19, title: "A Complete Unknown", genre: "Drama", rating: 8.0, duration: 141, poster: "https://picsum.photos/seed/ACompleteUnknown19/300/450", description: "Bob Dylan's New York arrival.", cast: ["Timothée Chalamet"], year: 2024, userRatings: [{ userId: 1, rating: 4 }], isFeatured: false, badge: "EXTENDED RUN" },
  { id: 20, title: "Nosferatu", genre: "Horror", rating: 7.5, duration: 132, poster: "https://upload.wikimedia.org/wikipedia/en/9/90/Nosferatu_poster_%28Albin_Grau%2C_1922%29_1.jpg", description: "Gothic vampire reimagining.", cast: ["Bill Skarsgård"], year: 2024, userRatings: [], isFeatured: false, badge: "EXTENDED RUN" },
  { id: 21, title: "Emilia Pérez", genre: "Drama", rating: 8.1, duration: 132, poster: "https://picsum.photos/seed/EmiliaPrez21/300/450", description: "Cartel boss transition.", cast: ["Selena Gomez"], year: 2024, userRatings: [{ userId: 1, rating: 5 }], isFeatured: false, badge: "EXTENDED RUN" },
  { id: 22, title: "The Brutalist", genre: "Drama", rating: 8.7, duration: 215, poster: "https://picsum.photos/seed/TheBrutalist22/300/450", description: "Architect rebuilding in America.", cast: ["Adrien Brody"], year: 2024, userRatings: [{ userId: 2, rating: 5 }], isFeatured: false, badge: "EXTENDED RUN" },
  { id: 23, title: "Anora", genre: "Romance", rating: 8.0, duration: 139, poster: "https://picsum.photos/seed/Anora23/300/450", description: "Sex worker marries oligarch's son.", cast: ["Mikey Madison"], year: 2024, userRatings: [{ userId: 1, rating: 4 }], isFeatured: false, badge: "EXTENDED RUN" },
  { id: 24, title: "Alien: Romulus", genre: "Sci-Fi", rating: 7.3, duration: 119, poster: "https://picsum.photos/seed/AlienRomulus24/300/450", description: "Deep space colonists vs Xenomorph.", cast: ["Cailee Spaeny"], year: 2024, userRatings: [], isFeatured: false, badge: "EXTENDED RUN" },
  { id: 25, title: "Gladiator II", genre: "Action", rating: 7.2, duration: 148, poster: "https://m.media-amazon.com/images/M/MV5BMWYzZTM5ZGQtOGE5My00NmM2LWFlMDEtMGNjYjdmOWM1MzA1XkEyXkFqcGc@._V1_.jpg", description: "Lucius in the Colosseum.", cast: ["Paul Mescal"], year: 2024, userRatings: [{ userId: 2, rating: 4 }], isFeatured: false, badge: "EXTENDED RUN" },
  { id: 26, title: "Dune: Part Two", genre: "Sci-Fi", rating: 8.5, duration: 167, poster: "https://m.media-amazon.com/images/M/MV5BNTc0YmQxMjEtODI5MC00NjFiLTlkMWUtOGQ5NjFmYWUyZGJhXkEyXkFqcGc@._V1_.jpg", description: "Paul Atreides units with Fremen.", cast: ["Zendaya"], year: 2024, userRatings: [{ userId: 1, rating: 5 }, { userId: 2, rating: 5 }], isFeatured: false, badge: "EXTENDED RUN" },
  { id: 27, title: "Inside Out 2", genre: "Animation", rating: 7.9, duration: 100, poster: "https://upload.wikimedia.org/wikipedia/en/f/f7/Inside_Out_2_poster.jpg", description: "Riley meets Anxiety.", cast: ["Amy Poehler"], year: 2024, userRatings: [{ userId: 1, rating: 4 }], isFeatured: false, badge: "EXTENDED RUN" },
  { id: 28, title: "Twisters", genre: "Adventure", rating: 7.2, duration: 122, poster: "https://picsum.photos/seed/Twisters28/300/450", description: "Storm chasing in Oklahoma.", cast: ["Daisy Edgar-Jones"], year: 2024, userRatings: [{ userId: 2, rating: 3 }], isFeatured: false, badge: "EXTENDED RUN" },
  { id: 29, title: "Deadpool & Wolverine", genre: "Action", rating: 7.8, duration: 128, poster: "https://upload.wikimedia.org/wikipedia/en/4/4c/Deadpool_%26_Wolverine_poster.jpg", description: "Marvel Multiverse team-up.", cast: ["Ryan Reynolds", "Hugh Jackman"], year: 2024, userRatings: [{ userId: 1, rating: 4 }, { userId: 2, rating: 4 }], isFeatured: false, badge: "EXTENDED RUN" },
  { id: 30, title: "Longlegs", genre: "Thriller", rating: 6.8, duration: 101, poster: "https://picsum.photos/seed/Longlegs30/300/450", description: "FBI Agent vs Serial Killer.", cast: ["Nicolas Cage"], year: 2024, userRatings: [], isFeatured: false, badge: "EXTENDED RUN" },
  { id: 31, title: "The Wild Robot", genre: "Animation", rating: 8.4, duration: 102, poster: "https://picsum.photos/seed/TheWildRobot31/300/450", description: "Shipwrecked robot survives.", cast: ["Lupita Nyong'o"], year: 2024, userRatings: [{ userId: 1, rating: 5 }], isFeatured: false, badge: "EXTENDED RUN" },
  { id: 32, title: "Speak No Evil", genre: "Thriller", rating: 7.4, duration: 110, poster: "https://picsum.photos/seed/SpeakNoEvil32/300/450", description: "Weekend countryside nightmare.", cast: ["James McAvoy"], year: 2024, userRatings: [{ userId: 2, rating: 4 }], isFeatured: false, badge: "EXTENDED RUN" },
  { id: 33, title: "Challengers", genre: "Drama", rating: 7.6, duration: 131, poster: "https://picsum.photos/seed/Challengers33/300/450", description: "Tennis prodigy love triangle.", cast: ["Josh O'Connor"], year: 2024, userRatings: [{ userId: 1, rating: 4 }], isFeatured: false, badge: "EXTENDED RUN" },
  { id: 34, title: "Beetlejuice Beetlejuice", genre: "Comedy", rating: 7.1, duration: 104, poster: "https://picsum.photos/seed/BeetlejuiceBeetlejuice34/300/450", description: "Deetz family resurrection.", cast: ["Winona Ryder"], year: 2024, userRatings: [{ userId: 2, rating: 3 }], isFeatured: false, badge: "EXTENDED RUN" },
  { id: 35, title: "Fight or Flight", genre: "Action", rating: 6.9, duration: 98, poster: "https://picsum.photos/seed/FightorFlight35/300/450", description: "Assassin protecting a target.", cast: ["Josh Hartnett"], year: 2025, userRatings: [], isFeatured: false, badge: "NOW SHOWING" },
  { id: 36, title: "The Housemaid", genre: "Thriller", rating: 7.2, duration: 112, poster: "https://picsum.photos/seed/TheHousemaid36/300/450", description: "Housekeeping at a remote mansion.", cast: ["Sydney Sweeney"], year: 2025, userRatings: [{ userId: 1, rating: 4 }], isFeatured: false, badge: "NOW SHOWING" },
  { id: 37, title: "Final Destination: Bloodlines", genre: "Horror", rating: 6.7, duration: 110, poster: "https://picsum.photos/seed/FinalDestinationBloodlines37/300/450", description: "Death's new design.", cast: ["Tony Todd"], year: 2025, userRatings: [], isFeatured: false, badge: "NOW SHOWING" },
  { id: 38, title: "Ballerina", genre: "Action", rating: 7.4, duration: 120, poster: "https://picsum.photos/seed/Ballerina38/300/450", description: "John Wick universe vengeance.", cast: ["Ana de Armas"], year: 2025, userRatings: [{ userId: 2, rating: 4 }], isFeatured: false, badge: "NOW SHOWING" },
  { id: 39, title: "How to Train Your Dragon", genre: "Adventure", rating: 7.8, duration: 110, poster: "https://picsum.photos/seed/HowtoTrainYourDragon39/300/450", description: "Live-action Viking bond.", cast: ["Mason Thames"], year: 2025, userRatings: [{ userId: 1, rating: 4 }], isFeatured: false, badge: "NOW SHOWING" },
  { id: 40, title: "Mickey 17", genre: "Sci-Fi", rating: 7.1, duration: 137, poster: "https://picsum.photos/seed/Mickey1740/300/450", description: "Expendable worker reprinted.", cast: ["Robert Pattinson"], year: 2025, userRatings: [{ userId: 2, rating: 3 }], isFeatured: false, badge: "NOW SHOWING" },
  { id: 41, title: "Mission: Impossible 8", genre: "Action", rating: 0, duration: 163, poster: "https://picsum.photos/seed/MI8/300/450", description: "AI Entity threat.", cast: ["Tom Cruise"], year: 2025, userRatings: [], isFeatured: false, badge: "COMING SOON" },
  { id: 42, title: "Zootopia 2", genre: "Animation", rating: 0, duration: 108, poster: "https://picsum.photos/seed/Z2/300/450", description: "Judy and Nick return.", cast: ["Jason Bateman"], year: 2025, userRatings: [], isFeatured: false, badge: "COMING SOON" },
  { id: 43, title: "The Running Man", genre: "Sci-Fi", rating: 0, duration: 118, poster: "https://picsum.photos/seed/TRM/300/450", description: "Dystopian TV game show.", cast: ["Glen Powell"], year: 2025, userRatings: [], isFeatured: false, badge: "COMING SOON" },
  { id: 44, title: "Freakier Friday", genre: "Comedy", rating: 0, duration: 105, poster: "https://picsum.photos/seed/FF/300/450", description: "Body swap chaos again.", cast: ["Lindsay Lohan"], year: 2025, userRatings: [], isFeatured: false, badge: "COMING SOON" },
  { id: 45, title: "Eddington", genre: "Thriller", rating: 0, duration: 125, poster: "https://picsum.photos/seed/Edd/300/450", description: "Sheriff vs Mayor.", cast: ["Joaquin Phoenix"], year: 2025, userRatings: [], isFeatured: false, badge: "COMING SOON" },
  { id: 46, title: "Predator: Badlands", genre: "Sci-Fi", rating: 0, duration: 115, poster: "https://picsum.photos/seed/PB/300/450", description: "Alien hunt evolves.", cast: ["Elle Fanning"], year: 2025, userRatings: [], isFeatured: false, badge: "COMING SOON" },
  { id: 47, title: "Untitled Knives Out 3", genre: "Thriller", rating: 0, duration: 130, poster: "https://picsum.photos/seed/KO3/300/450", description: "Trans-Siberian mystery.", cast: ["Daniel Craig"], year: 2025, userRatings: [], isFeatured: false, badge: "COMING SOON" },
  { id: 48, title: "Hereditary Haunts", genre: "Horror", rating: 7.8, duration: 127, poster: "https://picsum.photos/seed/HH/300/450", description: "Family history horror.", cast: ["Toni Collette"], year: 2024, userRatings: [{ userId: 1, rating: 5 }], isFeatured: false, badge: "EXTENDED RUN" },
  { id: 49, title: "September 5", genre: "Drama", rating: 7.5, duration: 95, poster: "https://picsum.photos/seed/S5/300/450", description: "1972 Munich Olympics story.", cast: ["Peter Sarsgaard"], year: 2024, userRatings: [{ userId: 2, rating: 4 }], isFeatured: false, badge: "EXTENDED RUN" },
  { id: 50, title: "Heretic", genre: "Thriller", rating: 7.3, duration: 110, poster: "https://picsum.photos/seed/Her/300/450", description: "Two missionaries trapped.", cast: ["Hugh Grant"], year: 2024, userRatings: [{ userId: 1, rating: 4 }], isFeatured: false, badge: "EXTENDED RUN" },
  { id: 51, title: "We Live in Time", genre: "Romance", rating: 7.9, duration: 107, poster: "https://picsum.photos/seed/WLIT/300/450", description: "Three timelines of love.", cast: ["Florence Pugh"], year: 2024, userRatings: [{ userId: 2, rating: 5 }], isFeatured: false, badge: "EXTENDED RUN" },
  { id: 52, title: "Nickel Boys", genre: "Drama", rating: 8.2, duration: 140, poster: "https://picsum.photos/seed/NB/300/450", description: "Florida reform school story.", cast: ["Ethan Herisse"], year: 2024, userRatings: [{ userId: 1, rating: 5 }, { userId: 2, rating: 4 }], isFeatured: false, badge: "EXTENDED RUN" },
  { id: 53, title: "Hard Truths", genre: "Drama", rating: 7.6, duration: 97, poster: "https://picsum.photos/seed/HT/300/450", description: "London suburb life struggle.", cast: ["Marianne Jean-Baptiste"], year: 2024, userRatings: [{ userId: 2, rating: 4 }], isFeatured: false, badge: "EXTENDED RUN" },
  { id: 54, title: "Sing Sing", genre: "Drama", rating: 8.1, duration: 105, poster: "https://upload.wikimedia.org/wikipedia/commons/0/0c/Sing_Sing.jpg", description: "Prison theater program.", cast: ["Colman Domingo"], year: 2024, userRatings: [{ userId: 1, rating: 5 }], isFeatured: false, badge: "EXTENDED RUN" },
  { id: 55, title: "I'm Still Here", genre: "Drama", rating: 8.4, duration: 137, poster: "https://picsum.photos/seed/ISH/300/450", description: "Brazil political activism.", cast: ["Fernanda Torres"], year: 2024, userRatings: [{ userId: 2, rating: 5 }], isFeatured: false, badge: "EXTENDED RUN" },
  { id: 56, title: "The Substance", genre: "Horror", rating: 7.1, duration: 140, poster: "https://picsum.photos/seed/TS/300/450", description: "Celebrity black-market drug.", cast: ["Demi Moore"], year: 2024, userRatings: [{ userId: 1, rating: 4 }], isFeatured: false, badge: "EXTENDED RUN" },
  { id: 57, title: "Kinds of Kindness", genre: "Drama", rating: 6.8, duration: 164, poster: "https://picsum.photos/seed/KOK/300/450", description: "Darkly comic fables.", cast: ["Emma Stone"], year: 2024, userRatings: [{ userId: 2, rating: 3 }], isFeatured: false, badge: "EXTENDED RUN" },
  { id: 58, title: "His Three Daughters", genre: "Drama", rating: 7.8, duration: 107, poster: "https://picsum.photos/seed/HisThreeDaughters58/300/450", description: "Three sisters reunited.", cast: ["Natasha Lyonne"], year: 2024, userRatings: [{ userId: 1, rating: 4 }, { userId: 2, rating: 4 }], isFeatured: false, badge: "EXTENDED RUN" },
  { id: 59, title: "Flow", genre: "Animation", rating: 8.6, duration: 84, poster: "https://picsum.photos/seed/Flow59/300/450", description: "Cat survives a flood.", cast: ["Cat"], year: 2024, userRatings: [{ userId: 1, rating: 5 }, { userId: 2, rating: 5 }], isFeatured: false, badge: "EXTENDED RUN" },
  { id: 60, title: "Love Lies Bleeding", genre: "Thriller", rating: 7.3, duration: 104, poster: "https://picsum.photos/seed/LoveLiesBleeding60/300/450", description: "Gym manager drifter romance.", cast: ["Kristen Stewart"], year: 2024, userRatings: [{ userId: 2, rating: 4 }], isFeatured: false, badge: "EXTENDED RUN" }
];

let ORDERS = [];
let SEATS = {};
let FAVS = {};

// ── 1. HEALTH CHECK ──────────
app.get('/api/health', (req, res) => {
  res.json({
    status: "UP",
    timestamp: new Date().toISOString(),
    moviesCount: MOVIES.length
  });
});

// ── 2. MOVIES (Filtering & Multi-Value Support) ────────
app.get('/api/movies', (req, res) => {
  const { q, genre, search, category, userId } = req.query;

  const ensureArray = (val) => {
    if (!val) return [];
    return Array.isArray(val) ? val : [val];
  };

  let result = JSON.parse(JSON.stringify(MOVIES));

  const userIds = ensureArray(userId).map(id => parseInt(id));
  if (userIds.length > 0) {
    result = result.filter(m => m.userRatings && m.userRatings.some(r => userIds.includes(r.userId)));
    result = result.map(m => ({
      ...m,
      userRatings: m.userRatings.filter(r => userIds.includes(r.userId))
    }));
  }

  const genres = ensureArray(genre || category).map(g => g.toLowerCase());
  if (genres.length > 0 && !genres.includes('all')) {
    result = result.filter(m => genres.includes(m.genre.toLowerCase()));
  }

  const keywords = ensureArray(q || search).map(k => k.toLowerCase());
  if (keywords.length > 0) {
    result = result.filter(m => {
      const content = (
        m.title + " " +
        m.description + " " +
        (m.cast ? m.cast.join(" ") : "") + " " +
        m.genre
      ).toLowerCase();
      return keywords.some(key => content.includes(key));
    });
  }

  res.json(result);
});

// ── 3. CRUD, AUTH, ORDERS, FAVS & RESET ─────────────────

// GET פתוח לכולם - קורה למעלה בנתיב /api/movies

// POST מוגן - הוספת סרט (דורש מפתח API)
app.post('/api/movies', requireApiKey, (req, res) => {
  const newMovie = { ...req.body, id: Date.now(), userRatings: [], isFeatured: false };
  MOVIES.push(newMovie);
  res.status(201).json(newMovie);
});

// DELETE מוגן - מחיקת סרט (דורש מפתח API) - הוספנו עכשיו!
app.delete('/api/movies/:id', requireApiKey, (req, res) => {
  const id = parseInt(req.params.id);
  const initialLength = MOVIES.length;
  
  MOVIES = MOVIES.filter(m => m.id !== id);
  
  if (MOVIES.length < initialLength) {
    res.json({ message: 'Movie deleted successfully' });
  } else {
    res.status(404).json({ error: 'Movie not found' });
  }
});

// נתיבים פתוחים נוספים (Login, Orders, Reset)
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = TEST_USERS.find(u => u.email === email && u.password === password);
  if (user) {
    if (user.locked) return res.status(403).json({ error: "Account locked" });
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

app.post('/api/orders', (req, res) => {
  const order = { ...req.body, id: Date.now(), status: "confirmed", created: new Date().toISOString() };
  ORDERS.push(order);
  const k = `${order.movieId}_${order.date}_${order.time}`;
  SEATS[k] = [...(SEATS[k] || []), ...order.seats];
  res.status(201).json(order);
});

app.post('/api/test/reset', (req, res) => {
  ORDERS = []; SEATS = {}; FAVS = {};
  res.send({ success: true });
});

app.listen(PORT, () => {
  console.log(`✅ Server is live at: http://localhost:${PORT}`);
});