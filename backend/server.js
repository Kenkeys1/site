const express = require('express');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const app = express();

app.use(cors());

// Parse JSON request bodies for standard API requests (e.g. non-file updates)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.send('Server is running and ready!');
});

// Ensure uploads folder exists so Multer doesn't fail
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Path to products.json & users.json
const productsFilePath = path.join(__dirname, 'products.json');
const usersFilePath = path.join(__dirname, 'users.json');

// Helper to read products safely
const getProducts = () => {
    if (!fs.existsSync(productsFilePath)) {
        fs.writeFileSync(productsFilePath, JSON.stringify([]));
        return [];
    }
    try {
        const data = fs.readFileSync(productsFilePath, 'utf8');
        return JSON.parse(data || '[]');
    } catch (err) {
        return [];
    }
};

// Helper to read users safely
const getUsers = () => {
    if (!fs.existsSync(usersFilePath)) {
        fs.writeFileSync(usersFilePath, JSON.stringify([]));
        return [];
    }
    try {
        const data = fs.readFileSync(usersFilePath, 'utf8');
        return JSON.parse(data || '[]');
    } catch (err) {
        return [];
    }
};

// Helper to save users
const saveUsers = (users) => {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
};

// --- USER AUTHENTICATION ENDPOINTS ---

// SIGN UP API (Updated with upload.single middleware to process multipart FormData)
app.post('/api/signup', upload.single('profileImage'), (req, res) => {
    try {
        const { username, email, phone, password } = req.body;
        const users = getUsers();

        const existingUser = users.find(u => u.username === username || u.email === email);
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Username or Email already exists.' });
        }

        const newUser = {
            id: Date.now().toString(),
            username,
            email,
            phone,
            password,
            profileImage: req.file ? '/uploads/' + req.file.filename : ''
        };

        users.push(newUser);
        saveUsers(users);

        const { password: _, ...userWithoutPassword } = newUser;
        res.json({ success: true, user: userWithoutPassword });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ success: false, message: 'Server error during sign up!' });
    }
});

// LOGIN API
app.post('/api/login', (req, res) => {
    const { identifier, username, password } = req.body;
    const userIdentifier = identifier || username;
    const users = getUsers();

    const user = users.find(u => (u.username === userIdentifier || u.email === userIdentifier) && u.password === password);
    if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid username/email or password.' });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
});

// UPLOAD PROFILE PHOTO API
app.post('/api/user/upload-photo', upload.single('profileImage'), (req, res) => {
    const { userId } = req.body;
    let users = getUsers();

    const index = users.findIndex(u => u.id == userId);
    if (index !== -1) {
        if (req.file) {
            users[index].profileImage = '/uploads/' + req.file.filename;
            saveUsers(users);
            const { password: _, ...userWithoutPassword } = users[index];
            return res.json({ success: true, user: userWithoutPassword });
        }
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }
    res.status(404).json({ success: false, message: 'User not found.' });
});

// --- PRODUCT ENDPOINTS ---

// GET all products
app.get('/api/products', (req, res) => {
    res.json(getProducts());
});

// ADD product
app.post('/api/products/add', upload.single('image'), (req, res) => {
    const products = getProducts();
    const newProduct = {
        id: Date.now().toString(),
        ...req.body,
        image: req.file ? '/uploads/' + req.file.filename : ''
    };
    products.push(newProduct);
    fs.writeFileSync(productsFilePath, JSON.stringify(products, null, 2));
    res.json(newProduct);
});

// EDIT product
app.post('/api/products/edit', upload.single('image'), (req, res) => {
    let products = getProducts();
    const id = req.body.id;
    const index = products.findIndex(p => p.id == id);
    
    if (index !== -1) {
        products[index] = { ...products[index], ...req.body };
        if (req.file) {
            products[index].image = '/uploads/' + req.file.filename;
        }
        fs.writeFileSync(productsFilePath, JSON.stringify(products, null, 2));
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Product not found" });
    }
});

// DELETE product
app.delete('/api/products/:id', (req, res) => {
    let products = getProducts();
    products = products.filter(p => p.id != req.params.id);
    fs.writeFileSync(productsFilePath, JSON.stringify(products, null, 2));
    res.json({ success: true });
});

app.listen(process.env.PORT || 3000, () => console.log('Server running on port ' + (process.env.PORT || 3000)));