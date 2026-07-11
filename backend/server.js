const express = require('express');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const app = express();

app.use(cors());
// Note: We don't use express.json() with multer, as multer parses the FormData
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Helper to read products
const getProducts = () => JSON.parse(fs.readFileSync(path.join(__dirname, 'products.json'), 'utf8'));

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
    fs.writeFileSync('products.json', JSON.stringify(products, null, 2));
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
        fs.writeFileSync('products.json', JSON.stringify(products, null, 2));
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
    fs.writeFileSync('products.json', JSON.stringify(products, null, 2));
    res.json({ success: true });
});

app.listen(3000, () => console.log('Server running on port 3000'));