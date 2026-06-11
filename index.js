import express from 'express'
import bodyParser from 'body-parser'
import pg from 'pg'


const app = express();
const port = 3000;

// Database connection
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "Books",
  password: "money2025",
  port: 5432,
});

db.connect();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.set('view engine', 'ejs');

// --- Routes ---
app.get('/', async (req, res) => {
    try {
    let sort = req.query.sort || "";
    let query = 'SELECT * FROM books';

    if (sort === 'recent') {
      query += ' ORDER BY date_read DESC';
    } else if (sort === 'rating') {
      query += ' ORDER BY rating DESC';
    }

    const result = await db.query(query);
    const books = result.rows;

    // add cover image URLs
    for (const book of books) {
      book.coverImage = `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg`;
    }

    res.render('index.ejs', { books, sort });

    } catch (error) {
        console.error(`Error fetching cover image for ISBN ${books.isbn}:`, error);
        const coverImage = 'images/beast.jpg'; // Fallback image
        res.render('index.ejs', {books: [], coverImage: coverImage});
        }
});

app.get('/about', (req, res) => {
    res.render('about.ejs');
});

app.get('/add', (req, res) => {
    res.render('create.ejs');
});

app.get('/update/:id', async (req, res) => {  
    const bookId = req.params.id;
    console.log("Book ID:", bookId); // Debugging line
    const result = await db.query('SELECT review FROM books WHERE id = $1', [bookId]);
    const bookReview = result.rows[0] ? result.rows[0].review : '';
    res.render('update.ejs', {bookReview: bookReview, bookId: bookId});
});

app.get('/view/:id', async (req, res) => {   
    const bookId = req.params.id;
    console.log("Book ID:", bookId); // Debugging line

    const result = await db.query('SELECT books.id AS book_id, books.title, books.author, books.isbn, books.rating, books.date_read, books.review, notes.id AS note_id, notes.note FROM books LEFT JOIN notes ON books.id = notes.book_id WHERE books.id = $1', [bookId]);
    const book = result.rows[0]
    ? { title: result.rows[0].title, author: result.rows[0].author, isbn: result.rows[0].isbn, rating: result.rows[0].rating, date_read: result.rows[0].date_read, review: result.rows[0].review }
    : null;
    const notes = result.rows.filter(r => r.note_id !== null);
    const coverImage = `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg`;
    res.render('view.ejs', {book: book, coverImage: coverImage, notes: notes, bookId: bookId});
});

app.get('/addnote/:id', async (req, res) => {
    const bookId = req.params.id;
   res.render('addnote.ejs', {bookId: bookId});
});
app.post('/add', async (req, res) => {
    const { title, author, isbn, rating, date_read, review } = req.body;
    await db.query('INSERT INTO books (title, author, isbn, rating, date_read, review) VALUES ($1, $2, $3, $4, $5, $6)', 
    [title.toUpperCase(), author.toUpperCase(), isbn, rating, date_read, review]);
    res.redirect('/');
});

app.post('/addnote', async (req, res) => {
    const { bookId, note } = req.body;
    console.log("Book ID to add note:", bookId); // Debugging line
    await db.query('INSERT INTO notes (note, book_id) VALUES ($1, $2)', [note, bookId]);
    res.redirect(`/view/${bookId}`);
});

app.post('/update', async (req, res) => {
    const { bookId, review } = req.body;
    console.log("Book ID to update:", bookId); // Debugging line
    await db.query('UPDATE books SET review = $1 WHERE id = $2', [review, bookId]);
    res.redirect(`/view/${bookId}`);
});

app.post('/delete', async (req, res) => {
    const bookId = req.body.bookId;
    console.log("Book ID to delete:", bookId); // Debugging line
    await db.query('DELETE FROM notes WHERE book_id = $1', [bookId]);
    await db.query('DELETE FROM books WHERE id = $1', [bookId]);
    res.redirect('/');
});

// Server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
