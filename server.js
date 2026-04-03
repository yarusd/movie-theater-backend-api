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

// ── HELPER FUNCTIONS FOR PAYMENT ──

// 1. חישוב מחיר לפי שורה (תואם לאתר: 35, 50, 65)
const getSeatPrice = (seat) => {
    const row = seat[0].toUpperCase(); // מקבל את האות הראשונה (A-E)
    if (['A', 'B'].includes(row)) return 35; // Back
    if (['C', 'D'].includes(row)) return 50; // Standard
    if (row === 'E') return 65;              // Premium
    return 50; // ברירת מחדל
};

// 2. בדיקה אם תוקף הכרטיס עבר (מחזירה true אם פג תוקף)
const isExpired = (expiry) => {
    const [month, year] = expiry.split('/').map(Number);
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = parseInt(now.getFullYear().toString().slice(-2));
    return year < currentYear || (year === currentYear && month < currentMonth);
};

// ── 3. VALIDATION SCHEMAS ──

const movieSchema = Joi.object({
    title: Joi.string().min(2).max(60).required(),
    // עדכון: הוסרה המגבלה על רשימת ז'אנרים סגורה
    genre: Joi.string().valid(
    'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 
    'Documentary', 'Drama', 'Family', 'Fantasy', 'History', 
    'Horror', 'Music', 'Musical', 'Mystery', 'Romance', 
    'Sci-Fi', 'Short', 'Sport', 'Thriller', 'War', 'Western'
    ).insensitive().required(), 
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

const paymentSchema = Joi.object({
    userId: Joi.number().required(),
    movieId: Joi.number().required(),
    seats: Joi.array().items(Joi.string().pattern(/^[A-E][1-8]$/)).min(1).max(8).required(),
    date: Joi.date().iso().min('now').required(),
    time: Joi.string().pattern(/^([0-9]{2}):([0-9]{2})$/).required(),
    // עדכון: רק אותיות באנגלית ורווחים (מניעת עברית ותווים מיוחדים)
    cardHolder: Joi.string().pattern(/^[a-zA-Z\s]+$/).min(3).max(50).required()
        .messages({ 'string.pattern.base': 'Card holder name must contain English letters only.' }),
    cardNumber: Joi.string().pattern(/^[0-9]{16}$/).required(),
    expiry: Joi.string().pattern(/^(0[1-9]|1[0-2])\/([0-9]{2})$/).required(),
    cvv: Joi.string().pattern(/^[0-9]{3}$/).required()
});

// ── 4. INITIAL DATA (Full List - 60 Movies) ──
const INITIAL_USERS = [
    { id: 1, email: "user1@test.com", password: "123456", name: "Alice Cohen", role: "user", locked: false },
    { id: 2, email: "user2@test.com", password: "123456", name: "Bob Levi", role: "user", locked: false },
    { id: 3, email: "admin@test.com", password: "admin123", name: "Admin User", role: "admin", locked: false },
    { id: 4, email: "locked@test.com", password: "123456", name: "Locked User", role: "user", locked: true }
];

const INITIAL_MOVIES = [
    // 1-20
    { id: 1, title: "ThunderBolts*", genre: "Action", rating: 7.6, duration: 126, poster: "https://th.bing.com/th/id/OSK.LWtWrR_OOJVN9Rduc088CfthZngBF_jSBCYsv7YvV3g?o=7rm=3&rs=1&pid=ImgDetMain", description: "A ragtag group of antiheroes.", cast: ["Florence Pugh", "Sebastian Stan", "David Harbour", "Wyatt Russell", "Olga Kurylenko", "Julia Louis-Dreyfus"], year: 2025, badge: "NOW SHOWING", showtimes: ["10:00", "13:00", "16:00", "19:00", "22:00"] },
    { id: 2, title: "Mission: Impossible — The Final Reckoning", genre: "Action", rating: 8.1, duration: 169, poster: "https://image.tmdb.org/t/p/w500/iKPsC9EFUafRP9SrUznI61getVP.jpg", description: "Ethan Hunt's final mission.", cast: ["Tom Cruise", "Hayley Atwell", "Ving Rhames", "Simon Pegg", "Vanessa Kirby", "Angela Bassett"], year: 2025, badge: "NOW SHOWING", showtimes: ["09:30", "12:45", "16:15", "19:30", "22:30"] },
    { id: 3, title: "Sinners", genre: "Horror", rating: 7.9, duration: 137, poster: "https://picsum.photos/seed/Sinners3/300/450", description: "Twin brothers return to their hometown.", cast: ["Michael B. Jordan", "Hailee Steinfeld", "Jack O'Connell", "Wunmi Mosaku", "Delroy Lindo"], year: 2025, badge: "NOW SHOWING", showtimes: ["11:30", "14:30", "17:30"] },
    { id: 4, title: "A Minecraft Movie", genre: "Animation", rating: 6.8, duration: 101, poster: "https://m.media-amazon.com/images/M/MV5BYzFjMzNjOTktNDBlNy00YWZhLWExYTctZDcxNDA4OWVhOTJjXkEyXkFqcGc@._V1_.jpg", description: "Misfits in the Overworld.", cast: ["Jason Momoa", "Jack Black", "Emma Myers", "Danielle Brooks", "Sebastian Hansen"], year: 2025, badge: "NOW SHOWING", showtimes: ["10:00", "12:00", "14:00"] },
    { id: 5, title: "The Accountant 2", genre: "Thriller", rating: 7.3, duration: 129, poster: "https://picsum.photos/seed/TheAccountant25/300/450", description: "Christian Wolff returns.", cast: ["Ben Affleck", "Jon Bernthal", "J.K. Simmons", "Cynthia Addai-Robinson"], year: 2025, badge: "NOW SHOWING", showtimes: ["11:00", "14:00", "17:00"] },
    { id: 6, title: "Snow White", genre: "Adventure", rating: 5.4, duration: 110, poster: "https://upload.wikimedia.org/wikipedia/commons/7/78/Snow_White_and_the_Seven_Dwarfs_2.png", description: "Live-action reimagining.", cast: ["Rachel Zegler", "Gal Gadot", "Andrew Burnap", "Ansu Kabia", "Martin Klebba"], year: 2025, badge: "NOW SHOWING", showtimes: ["10:30", "13:00", "15:30"] },
    { id: 7, title: "Opus", genre: "Thriller", rating: 6.9, duration: 104, description: "Pop icon compound invasion.", cast: ["Ayo Edebiri", "John Malkovich", "Murray Bartlett"], year: 2025, badge: "NOW SHOWING", showtimes: ["13:30", "16:30"] },
    { id: 8, title: "Until Dawn", genre: "Horror", rating: 6.5, duration: 103, description: "Remote mountain retreat retreat.", cast: ["Ella Rubin", "Michael Cimino", "Odessa A'zion"], year: 2025, badge: "NOW SHOWING", showtimes: ["14:00", "17:00"] },
    { id: 9, title: "Superman", genre: "Action", rating: 0, duration: 129, description: "Kryptonian heritage.", cast: ["David Corenswet", "Rachel Brosnahan", "Nicholas Hoult"], year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 10, title: "Avatar: Fire and Ash", genre: "Sci-Fi", rating: 0, duration: 155, description: "Pandora family story.", cast: ["Sam Worthington", "Zoe Saldana", "Sigourney Weaver"], year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 11, title: "Jurassic World Rebirth", genre: "Adventure", rating: 0, duration: 118, description: "Dinosaurs and humans.", cast: ["Scarlett Johansson", "Jonathan Bailey", "Mahershala Ali"], year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 12, title: "The Fantastic Four: First Steps", genre: "Action", rating: 0, duration: 125, description: "MCU debut.", cast: ["Pedro Pascal", "Vanessa Kirby", "Joseph Quinn", "Ebon Moss-Bachrach"], year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 13, title: "The Phoenician Scheme", genre: "Adventure", rating: 0, duration: 112, description: "Espionage adventure.", cast: ["Benicio del Toro", "Bill Murray"], year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 14, title: "28 Years Later", genre: "Horror", rating: 0, duration: 115, description: "Decades after outbreak.", cast: ["Cillian Murphy", "Aaron Taylor-Johnson", "Jodie Comer"], year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 15, title: "Materialists", genre: "Romance", rating: 0, duration: 98, description: "Matchmaker unravels.", cast: ["Dakota Johnson", "Pedro Pascal", "Chris Evans"], year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 16, title: "Elio", genre: "Animation", rating: 0, duration: 103, description: "Beamed to aliens.", cast: ["Yonas Kibreab", "America Ferrera"], year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 17, title: "Wicked", genre: "Drama", rating: 8.3, duration: 160, description: "Origin story of Oz.", cast: ["Cynthia Erivo", "Ariana Grande", "Michelle Yeoh", "Jeff Goldblum"], year: 2024, badge: "EXTENDED RUN", showtimes: ["11:30", "15:00", "22:00"] },
    { id: 18, title: "Conclave", genre: "Thriller", rating: 7.8, duration: 120, description: "Election of a new Pope.", cast: ["Ralph Fiennes", "Stanley Tucci", "John Lithgow"], year: 2024, badge: "EXTENDED RUN", showtimes: ["13:00", "16:30"] },
    { id: 19, title: "A Complete Unknown", genre: "Drama", rating: 8.0, duration: 141, description: "Bob Dylan's transition.", cast: ["Timothée Chalamet", "Edward Norton", "Elle Fanning"], year: 2024, badge: "EXTENDED RUN", showtimes: ["12:30", "16:00"] },
    { id: 20, title: "Nosferatu", genre: "Horror", rating: 7.5, duration: 132, description: "Gothic obsession.", cast: ["Bill Skarsgård", "Nicholas Hoult", "Willem Dafoe"], year: 2024, badge: "EXTENDED RUN", showtimes: ["15:30", "18:30"] },
    
    // 21-40 (כאן שמרתי את הקאסט המלא שלך!)
    { id: 21, title: "Emilia Pérez", genre: "Drama", rating: 8.1, duration: 132, poster: "https://picsum.photos/seed/21/300/450", description: "Cartel leader transition.", cast: ["Zoe Saldana", "Karla Sofía Gascón", "Selena Gomez", "Adriana Paz"], year: 2024, badge: "EXTENDED RUN", showtimes: ["13:30", "17:00"] },
    { id: 22, title: "The Brutalist", genre: "Drama", rating: 8.7, duration: 215, poster: "https://picsum.photos/seed/22/300/450", description: "Visionary architect life.", cast: ["Adrien Brody", "Felicity Jones", "Guy Pearce", "Joe Alwyn"], year: 2024, badge: "EXTENDED RUN", showtimes: ["11:00", "17:30"] },
    { id: 23, title: "Anora", genre: "Romance", rating: 8.0, duration: 139, poster: "https://picsum.photos/seed/23/300/450", description: "Cinderella story.", cast: ["Mikey Madison", "Mark Eydelshteyn", "Yura Borisov", "Karren Karagulian"], year: 2024, badge: "EXTENDED RUN", showtimes: ["12:00", "15:30"] },
    { id: 24, title: "Alien: Romulus", genre: "Sci-Fi", rating: 7.3, duration: 119, poster: "https://picsum.photos/seed/24/300/450", description: "Young colonizers.", cast: ["Cailee Spaeny", "David Jonsson", "Archie Renaux", "Isabela Merced"], year: 2024, badge: "EXTENDED RUN", showtimes: ["14:30", "18:00"] },
    { id: 25, title: "Gladiator II", genre: "Action", rating: 7.2, duration: 148, poster: "https://m.media-amazon.com/images/M/MV5BMWYzZTM5ZGQtOGE5My00NmM2LWFlMDEtMGNjYjdmOWM1MzA1XkEyXkFqcGc@._V1_.jpg", description: "Lucius in Colosseum.", cast: ["Paul Mescal", "Pedro Pascal", "Connie Nielsen", "Denzel Washington", "Joseph Quinn"], year: 2024, badge: "EXTENDED RUN", showtimes: ["11:00", "14:30", "21:30"] },
    { id: 26, title: "Dune: Part Two", genre: "Sci-Fi", rating: 8.5, duration: 167, poster: "https://m.media-amazon.com/images/M/MV5BNTc0YmQxMjEtODI5MC00NjFiLTlkMWUtOGQ5NjFmYWUyZGJhXkEyXkFqcGc@._V1_.jpg", description: "Paul units with Fremen.", cast: ["Timothée Chalamet", "Zendaya", "Rebecca Ferguson", "Josh Brolin", "Austin Butler", "Florence Pugh"], year: 2024, badge: "EXTENDED RUN", showtimes: ["11:30", "15:00", "22:00"] },
    { id: 27, title: "Inside Out 2", genre: "Animation", rating: 7.9, duration: 100, poster: "https://upload.wikimedia.org/wikipedia/en/f/f7/Inside_Out_2_poster.jpg", description: "New emotions join headquarters.", cast: ["Amy Poehler", "Maya Hawke", "Kensington Tallman", "Liza Lapira", "Tony Hale"], year: 2024, badge: "EXTENDED RUN", showtimes: ["10:00", "12:30", "20:00"] },
    { id: 28, title: "Twisters", genre: "Adventure", rating: 7.2, duration: 122, poster: "https://picsum.photos/seed/Twisters28/300/450", description: "Experimental weather.", cast: ["Daisy Edgar-Jones", "Glen Powell", "Anthony Ramos", "Brandon Perea"], year: 2024, badge: "EXTENDED RUN", showtimes: ["10:30", "13:30", "19:30"] },
    { id: 29, title: "Deadpool & Wolverine", genre: "Action", rating: 7.8, duration: 128, poster: "https://upload.wikimedia.org/wikipedia/en/4/4c/Deadpool_%26_Wolverine_poster.jpg", description: "Merc meets Wolverine.", cast: ["Ryan Reynolds", "Hugh Jackman", "Emma Corrin", "Matthew Macfadyen"], year: 2024, badge: "EXTENDED RUN", showtimes: ["11:00", "14:00", "20:00"] },
    { id: 30, title: "Longlegs", genre: "Thriller", rating: 6.8, duration: 101, poster: "https://picsum.photos/seed/Longlegs30/300/450", description: "Serial killer case.", cast: ["Maika Monroe", "Nicolas Cage", "Blair Underwood", "Alicia Witt"], year: 2024, badge: "EXTENDED RUN", showtimes: ["14:30", "18:00"] },
    { id: 31, title: "The Wild Robot", genre: "Animation", rating: 8.4, duration: 102, poster: "https://picsum.photos/seed/WildRobot31/300/450", description: "Roz robot adapts.", cast: ["Lupita Nyong'o", "Pedro Pascal", "Kit Connor", "Catherine O'Hara", "Bill Nighy"], year: 2024, badge: "EXTENDED RUN", showtimes: ["10:00", "12:30"] },
    { id: 32, title: "Speak No Evil", genre: "Thriller", rating: 7.4, duration: 110, poster: "https://picsum.photos/seed/SpeakNoEvil32/300/450", description: "Weekend in country house.", cast: ["James McAvoy", "Mackenzie Davis", "Scoot McNairy", "Aisling Franciosi"], year: 2024, badge: "EXTENDED RUN", showtimes: ["13:00", "16:00"] },
    { id: 33, title: "Challengers", genre: "Drama", rating: 7.6, duration: 131, poster: "https://picsum.photos/seed/Challengers33/300/450", description: "Tennis prodigy turned coach.", cast: ["Zendaya", "Josh O'Connor", "Mike Faist"], year: 2024, badge: "EXTENDED RUN", showtimes: ["12:00", "15:00"] },
    { id: 34, title: "Beetlejuice Beetlejuice", genre: "Comedy", rating: 7.1, duration: 104, poster: "https://picsum.photos/seed/Beetlejuice34/300/450", description: "Three generations of Deetz.", cast: ["Michael Keaton", "Winona Ryder", "Jenna Ortega", "Catherine O'Hara", "Willem Dafoe"], year: 2024, badge: "EXTENDED RUN", showtimes: ["11:30", "14:30"] },
    { id: 35, title: "Fight or Flight", genre: "Action", rating: 6.9, duration: 98, poster: "https://picsum.photos/seed/FightFlight35/300/450", description: "Survival thriller hunt.", cast: ["Josh Hartnett", "Joel Edgerton"], year: 2025, badge: "NOW SHOWING", showtimes: ["12:00", "21:00"] },
    { id: 36, title: "The Housemaid", genre: "Thriller", rating: 7.2, duration: 112, poster: "https://picsum.photos/seed/Housemaid36/300/450", description: "Wealthy family secrets.", cast: ["Sydney Sweeney", "Amanda Seyfried"], year: 2025, badge: "NOW SHOWING", showtimes: ["11:00", "20:00"] },
    { id: 37, title: "Final Destination: Bloodlines", genre: "Horror", rating: 6.7, duration: 110, poster: "https://picsum.photos/seed/FinalDest37/300/450", description: "Death returns to haunt.", cast: ["Tony Todd", "Brec Bassinger", "Teo Briones"], year: 2025, badge: "NOW SHOWING", showtimes: ["13:00", "19:00"] },
    { id: 38, title: "Ballerina", genre: "Action", rating: 7.4, duration: 120, poster: "https://picsum.photos/seed/Ballerina38/300/450", description: "Assassin seeks revenge.", cast: ["Ana de Armas", "Keanu Reeves", "Ian McShane", "Norman Reedus"], year: 2025, badge: "NOW SHOWING", showtimes: ["10:30", "19:30"] },
    { id: 39, title: "How to Train Your Dragon", genre: "Adventure", rating: 7.8, duration: 110, poster: "https://picsum.photos/seed/Dragon39/300/450", description: "Viking befriends dragon.", cast: ["Mason Thames", "Nico Parker", "Gerard Butler", "Nick Frost"], year: 2025, badge: "NOW SHOWING", showtimes: ["10:00", "17:30"] },
    { id: 40, title: "Mickey 17", genre: "Sci-Fi", rating: 7.1, duration: 137, poster: "https://picsum.photos/seed/Mickey1740/300/450", description: "Expedition to Niflheim.", cast: ["Robert Pattinson", "Steven Yeun", "Naomi Ackie", "Toni Collette", "Mark Ruffalo"], year: 2025, badge: "NOW SHOWING", showtimes: ["11:30", "20:30"] },

    // 41-60
    { id: 41, title: "Mission: Impossible 8", genre: "Action", rating: 0, duration: 163, description: "Sequel to Dead Reckoning.", cast: ["Tom Cruise", "Hayley Atwell"], year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 42, title: "Zootopia 2", genre: "Animation", rating: 0, duration: 108, description: "Judy and Nick return.", cast: ["Jason Bateman", "Ginnifer Goodwin"], year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 43, title: "The Running Man", genre: "Sci-Fi", rating: 0, duration: 118, description: "Forced deadly game.", cast: ["Glen Powell", "Josh Brolin"], year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 44, title: "Freakier Friday", genre: "Comedy", rating: 0, duration: 105, description: "Mother-daughter swap.", cast: ["Lindsay Lohan", "Jamie Lee Curtis"], year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 45, title: "Eddington", genre: "Thriller", rating: 0, duration: 125, description: "Contemporary Western.", cast: ["Joaquin Phoenix", "Pedro Pascal", "Emma Stone"], year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 46, title: "Predator: Badlands", genre: "Sci-Fi", rating: 0, duration: 115, description: "Standalone entry.", cast: ["Elle Fanning"], year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 47, title: "Untitled Knives Out 3", genre: "Mystery", rating: 0, duration: 130, description: "Benoit Blanc mystery.", cast: ["Daniel Craig", "Andrew Scott", "Jeremy Renner"], year: 2025, badge: "COMING SOON", showtimes: [] },
    { id: 48, title: "Hereditary Haunts", genre: "Horror", rating: 7.8, duration: 127, description: "Family secrets.", cast: ["Toni Collette", "Alex Wolff"], year: 2024, badge: "EXTENDED RUN", showtimes: ["15:00", "18:30"] },
    { id: 49, title: "September 5", genre: "Drama", rating: 7.5, duration: 95, description: "ABC Sports Munich.", cast: ["Peter Sarsgaard", "John Magaro"], year: 2024, badge: "EXTENDED RUN", showtimes: ["12:30", "15:30"] },
    { id: 50, title: "Heretic", genre: "Thriller", rating: 7.3, duration: 110, description: "Missionaries knock door.", cast: ["Hugh Grant", "Sophie Thatcher"], year: 2024, badge: "EXTENDED RUN", showtimes: ["14:00", "17:00"] },
    { id: 51, title: "We Live in Time", genre: "Romance", rating: 7.9, duration: 107, description: "Almut and Tobias.", cast: ["Andrew Garfield", "Florence Pugh"], year: 2024, badge: "EXTENDED RUN", showtimes: ["12:00", "18:00"] },
    { id: 52, title: "Nickel Boys", genre: "Drama", rating: 8.2, duration: 140, description: "Reform school Florida.", cast: ["Ethan Herisse", "Brandon Wilson"], year: 2024, badge: "EXTENDED RUN", showtimes: ["11:00", "14:30"] },
    { id: 53, title: "Hard Truths", genre: "Drama", rating: 7.6, duration: 97, description: "Family dynamics London.", cast: ["Marianne Jean-Baptiste"], year: 2024, badge: "EXTENDED RUN", showtimes: ["13:30", "16:30"] },
    { id: 54, title: "Sing Sing", genre: "Drama", rating: 8.1, duration: 105, description: "Incarcerated theater.", cast: ["Colman Domingo", "Paul Raci"], year: 2024, badge: "EXTENDED RUN", showtimes: ["13:00", "19:00"] },
    { id: 55, title: "I'm Still Here", genre: "Drama", rating: 8.4, duration: 137, description: "Military police father.", cast: ["Fernanda Torres", "Selton Mello"], year: 2024, badge: "EXTENDED RUN", showtimes: ["12:30", "18:30"] },
    { id: 56, title: "The Substance", genre: "Horror", rating: 7.1, duration: 140, description: "Black-market drug.", cast: ["Demi Moore", "Margaret Qualley"], year: 2024, badge: "EXTENDED RUN", showtimes: ["14:30", "20:30"] },
    { id: 57, title: "Kinds of Kindness", genre: "Drama", rating: 6.8, duration: 164, description: "Triptych fable.", cast: ["Emma Stone", "Jesse Plemons", "Willem Dafoe"], year: 2024, badge: "EXTENDED RUN", showtimes: ["12:00", "20:00"] },
    { id: 58, title: "His Three Daughters", genre: "Drama", rating: 7.8, duration: 107, description: "Estranged sisters.", cast: ["Elizabeth Olsen", "Natasha Lyonne", "Carrie Coon"], year: 2024, badge: "EXTENDED RUN", showtimes: ["13:30", "19:30"] },
    { id: 59, title: "Flow", genre: "Animation", rating: 8.6, duration: 84, description: "Cat in water world.", cast: ["Animated"], year: 2024, badge: "EXTENDED RUN", showtimes: ["10:00", "14:00"] },
    { id: 60, title: "Love Lies Bleeding", genre: "Thriller", rating: 7.3, duration: 104, description: "Violence and obsession.", cast: ["Kristen Stewart", "Katy O'Brian"], year: 2024, badge: "EXTENDED RUN", showtimes: ["14:30", "17:30"] }
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
    res.status(200).json({ message: "Movie updated successfully", movie: MOVIES[movieIndex] });
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

// נתיב חדש: תשלום עבור הזמנה קיימת
app.post('/api/payments/pay-existing', (req, res) => {
    const { orderId, cardHolder, cardNumber, expiry, cvv } = req.body;

    // 1. חיפוש ההזמנה
    const order = ORDERS.find(o => o.orderId === orderId);
    if (!order) return res.status(404).json({ error: "Not Found", message: "Order ID not found." });

    // 2. בדיקה אם כבר שולם
    if (order.paymentStatus === 'paid') {
        return res.status(409).json({ error: "Conflict", message: "This order is already paid." });
    }

    // 3. ולידציה בסיסית לאשראי (שימוש בלוגיקה הקיימת שלנו)
    if (isExpired(expiry)) {
        return res.status(402).json({ error: "Payment Required", code: "CARD_EXPIRED" });
    }
    if (cardNumber.startsWith("0000")) {
        return res.status(402).json({ error: "Payment Required", code: "INSUFFICIENT_FUNDS" });
    }

    // 4. חישוב מחיר ועדכון
    const totalAmount = order.seats.reduce((sum, seat) => sum + getSeatPrice(seat), 0);
    
    order.paymentStatus = 'paid';
    order.totalAmount = `₪${totalAmount.toFixed(2)}`;
    order.transactionId = `TXN-REFUND-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    res.status(200).json({ 
        message: "Reservation successfully converted to paid order!", 
        order 
    });
});

// ── POST: SECURE CHECKOUT WITH TIERED PRICING ──
app.post('/api/payments/checkout', (req, res) => {
    const { error, value } = paymentSchema.validate(req.body);
    if (error) return res.status(400).json({ error: "Validation Failed", message: error.details[0].message });

    if (isExpired(value.expiry)) {
        return res.status(402).json({ error: "Payment Required", code: "CARD_EXPIRED", message: "הכרטיס פג תוקף" });
    }

    const isTaken = ORDERS.some(o => 
        o.movieId === value.movieId && o.date === value.date && o.time === value.time &&
        o.seats.some(s => value.seats.includes(s))
    );
    if (isTaken) return res.status(409).json({ error: "Conflict", message: "Seats already booked." });

    if (value.cardNumber.startsWith("0000")) {
        return res.status(402).json({ error: "Payment Required", code: "INSUFFICIENT_FUNDS", message: "אין מספיק יתרה בחשבון" });
    }
    if (value.cardNumber.startsWith("1111")) {
        return res.status(402).json({ error: "Payment Required", code: "SECURITY_REJECTION", message: "העסקה נחסמה עקב חשד להונאה" });
    }

    const totalAmount = value.seats.reduce((sum, seat) => sum + getSeatPrice(seat), 0);

    const order = { 
        orderId: `PAY-${Date.now()}`, 
        userId: value.userId,
        movieId: value.movieId,
        seats: value.seats,
        date: value.date,
        time: value.time,
        totalAmount: `₪${totalAmount.toFixed(2)}`,
        status: "confirmed",
        paymentStatus: "paid",
        transactionId: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    };

    ORDERS.push(order);
    res.status(201).json({ message: "Payment successful!", order });
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

// ── POST: SECURE CHECKOUT WITH TIERED PRICING ──
app.post('/api/payments/checkout', (req, res) => {
    const { error, value } = paymentSchema.validate(req.body);
    if (error) return res.status(400).json({ error: "Validation Failed", message: error.details[0].message });

    if (isExpired(value.expiry)) {
        return res.status(402).json({ error: "Payment Required", code: "CARD_EXPIRED", message: "הכרטיס פג תוקף" });
    }

    const isTaken = ORDERS.some(o => 
        o.movieId === value.movieId && o.date === value.date && o.time === value.time &&
        o.seats.some(s => value.seats.includes(s))
    );
    if (isTaken) return res.status(409).json({ error: "Conflict", message: "Seats already booked." });

    if (value.cardNumber.startsWith("0000")) {
        return res.status(402).json({ error: "Payment Required", code: "INSUFFICIENT_FUNDS", message: "אין מספיק יתרה בחשבון" });
    }
    if (value.cardNumber.startsWith("1111")) {
        return res.status(402).json({ error: "Payment Required", code: "SECURITY_REJECTION", message: "העסקה נחסמה עקב חשד להונאה" });
    }

    const totalAmount = value.seats.reduce((sum, seat) => sum + getSeatPrice(seat), 0);

    const order = { 
        orderId: `PAY-${Date.now()}`, 
        userId: value.userId,
        movieId: value.movieId,
        seats: value.seats,
        date: value.date,
        time: value.time,
        totalAmount: `₪${totalAmount.toFixed(2)}`,
        status: "confirmed",
        paymentStatus: "paid",
        transactionId: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    };

    ORDERS.push(order);
    res.status(201).json({ message: "Payment successful!", order });
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