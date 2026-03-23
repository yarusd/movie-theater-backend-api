# 🎬 MovieTime REST API Documentation

Welcome to the **MovieTime Automation API Reference**. This documentation is structured by **HTTP Methods** to help you quickly find the exact request, format, and mandatory fields you need for your testing scripts.

---

## 🟢 1. GET Requests (Data Retrieval)

### 🔹 GET All Movies
Retrieve the complete catalog of all movies in the database.
* **URL:** `http://localhost:3001/api/movies`
* **Method:** `GET`
* **Description:** Ideal for verifying the initial dataset or asserting the total count of movies.

### 🔹 GET Movies by Category
Retrieve movies filtered by a specific genre.
* **URL:** `http://localhost:3001/api/movies?category={category}` (or `?genre={category}`)
* **Method:** `GET`
* **Example:** `http://localhost:3001/api/movies?category=Action`
* **Description:** Returns an array of movies where the genre matches exactly (case-insensitive).

### 🔹 GET Movies by Keyword (Smart Search)
Search the entire movie database using a keyword.
* **URL:** `http://localhost:3001/api/movies?q={keyword}` (or `?search={keyword}`)
* **Method:** `GET`
* **Example:** `http://localhost:3001/api/movies?q=mission`
* **Description:** Returns movies where the keyword is found in the title, description, cast array, or genre.

### 🔹 GET Orders
Fetch the booking history from the platform.
* **URL:** `http://localhost:3001/api/orders`
* **Optional URL Parameter:** `?userId={id}` to fetch orders for a single user.
* **Method:** `GET`

### 🔹 GET Occupied Seats
Verify which seats are unavailable before making a reservation.
* **URL:** `http://localhost:3001/api/seats/:movieId/:date/:time`
* **Method:** `GET`
* **Example:** `http://localhost:3001/api/seats/1/2026-04-01/20:00`
* **Description:** Returns an array of locked seat IDs (e.g., `["A1", "B4"]`).

### 🔹 GET User Favorites
Retrieve a user's saved watchlist.
* **URL:** `http://localhost:3001/api/favs/:userId`
* **Method:** `GET`
* **Description:** Returns an array of Movie IDs (e.g., `[1, 5, 23]`).

---

## 🟡 2. POST Requests (Data Creation & Actions)
*Note: All POST requests must include the header `Content-Type: application/json`.*

### 🔹 POST Create a New Movie
Adds a new movie to the system's catalog.

* **URL:** `http://localhost:3001/api/movies`
* **Method:** `POST`
* **Mandatory Requirements:**
  You **MUST** provide the following fields to successfully create a movie in testing:
  | Field | Type | Description |
  |-------|------|-------------|
  | `title` | string | Title of the movie. |
  | `genre` | string | Category/Genre of the movie. |
  | `description` | string | Brief overview of the plot. |
* **Optional Fields:** `rating`, `duration`, `cast`, `poster`, `showtimes`.
* **Payload Example:**
  ```json
  {
    "title": "Automated Movie",
    "genre": "Sci-Fi",
    "description": "Created during an automated test."
  }
  ```

### 🔹 POST Create an Order (Booking)
Executes a movie booking transaction and locks the chosen seats.

* **URL:** `http://localhost:3001/api/orders`
* **Method:** `POST`
* **Mandatory Requirements:**
  | Field | Type | Description |
  |-------|------|-------------|
  | `movieId` | number | ID of the movie being booked. |
  | `userId`  | number | ID of the purchasing user. |
  | `date`    | string | Target date (`YYYY-MM-DD`). |
  | `time`    | string | Target showtime (`HH:MM`). |
  | `seats`   | array  | Array of requested seat IDs `["A1", "B4"]`. |
* **Optional Fields:** `movieTitle`, `ticketCount`, `totalPrice`.

### 🔹 POST Rate a Movie
* **URL:** `http://localhost:3001/api/movies/:id/rate`
* **Method:** `POST`
* **Path Requirement:** `:id` must be the existing movie ID.
* **Mandatory Body Requirements:** `userId` (number) and `rating` (number 1-5).
* **Payload Example:** `{"userId": 1, "rating": 5}`

### 🔹 POST Register & Login
* **Register URL:** `http://localhost:3001/api/register` (Mandatory: `name`, `email`, `password`)
* **Login URL:** `http://localhost:3001/api/login` (Mandatory: `email`, `password`)

### 🔹 POST Toggle Favorite
* **URL:** `http://localhost:3001/api/favs/:userId/:movieId`
* **Method:** `POST`
* **Description:** Add or remove the `movieId` to/from the `userId` watchlist automatically if it exists. No JSON body is required.

### 🔹 POST Reset Test Database
* **URL:** `http://localhost:3001/api/test/reset`
* **Method:** `POST`
* **Description:** Clears all transactional data (Orders, Seats, Favorites) so your tests always run on a fresh backend environment.

---

## 🟠 3. PUT Requests (Data Updating)
*Note: All PUT requests must include the header `Content-Type: application/json`.*

### 🔹 PUT Update an Existing Movie
Performs a partial or full update to an existing movie's metadata.

* **URL:** `http://localhost:3001/api/movies/:id`
* **Method:** `PUT`
* **Mandatory Requirements:**
  1. The target `id` **must be specified in the URL** (e.g., `/movies/1`).
  2. The JSON Body **must** include at least one valid key-value pair to update. (e.g., `rating` or `title`). No specific single field is strictly mandatory, you just pass what you want to change.
* **Payload Example (Changing only the poster and rating):**
  ```json
  {
    "rating": 9.5,
    "poster": "https://example.com/new-image.jpg"
  }
  ```

---

## 🔴 4. DELETE Requests (Data Deletion)

### 🔹 DELETE a Movie
Completely removes a movie from the catalog.

* **URL:** `http://localhost:3001/api/movies/:id`
* **Method:** `DELETE`
* **Mandatory Requirements:**
  1. The target `id` **must be specified in the URL** (e.g., `/movies/1`).
* **Description:** No JSON body required. Simply calling standard DELETE on this URL will destroy the resource. Returns `{"success": true}` if successful or a `404 Not Found` if the ID doesn't exist.
