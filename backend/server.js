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

// Path to products.json
const productsFilePath = path.join(__dirname, 'products.json');

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

// GET all products
app.get('/api/products', (req, res) => {
    res.json(getProducts());
});

// ADD product
app.post('/api/products/add', upload.single('image'), (req, res) => {
    const products = getProducts();
    const newProduct = {
        id: Date.now().toString(), // Store as string for consistency
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
    const id = req.body.id; // Keep as string
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
    // Using loose equality (==) to match string or number IDs
    products = products.filter(p => p.id != req.params.id);
    fs.writeFileSync(productsFilePath, JSON.stringify(products, null, 2));
    res.json({ success: true });
});

app.listen(process.env.PORT || 3000, () => console.log('Server running on port ' + (process.env.PORT || 3000)));