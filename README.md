# 🎥 MovieTime API | Professional QA & Backend Project
### Created by Yarus and Tzedek Silver

A robust, production-ready REST API for cinema management, featuring 60+ movies, dynamic searching, and secure booking logic. This project is designed specifically to showcase **QA Automation** and **Backend Development** standards.

## 🚀 Live Developer Portal
Explore the interactive documentation and live endpoints here:
👉 **[https://movie-time-api.onrender.com](https://movie-time-api.onrender.com)**

---

## 🛠️ Key Technical Features
- **Node.js & Express:** High-performance backend architecture.
- **Joi Validation:** Strict schema enforcement for all input data (400 Bad Request handling).
- **Static File Serving:** Integrated English Developer Portal served directly from the root.
- **API Security:** Protected write/delete routes using `x-api-key` authentication.
- **Dynamic Query Engine:** Advanced filtering by ID, Genre, Year, or global keyword search (`?q=`).

## 🧪 QA & Testing Focus
This project includes specific tools for testing engineers:
- **Comprehensive Status Codes:** Full implementation of 200, 201, 400, 401, 404, and 500 responses.
- **Environment Reset:** A dedicated `/api/test/reset` endpoint to clear data between automation runs.
- **Predictable Responses:** Fully synchronized documentation and server logic for seamless integration testing.

## 📖 Quick Start
1. Visit the [Live Portal](https://movie-time-api.onrender.com) to view all endpoints.
2. Use the **Base URL**: `https://movie-time-api.onrender.com/api`
3. Sample Request (Get Action Movies from 2025):
   `GET /movies?genre=Action&year=2025`

---
*Built with precision for the modern QA ecosystem.*
