const dns = require('dns');
// Set public DNS servers to prevent DNS resolution errors on Atlas
dns.setServers(['1.1.1.1', '8.8.8.8']);

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');

const app = express();

app.use(cors());

// Parse JSON request bodies for standard API requests (e.g. non-file updates)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- MONGODB CONNECTION ---
const uri = 'mongodb+srv://kenkeyz:thisismeken1@cluster0.3d892cn.mongodb.net/?appName=Cluster0';

mongoose.connect(uri)
  .then(() => console.log('MongoDB connected successfully!'))
  .catch((err) => console.error('MongoDB connection error:', err));

// --- MONGOOSE SCHEMAS & MODELS ---
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, default: '' },
  password: { type: String, required: true },
  profileImage: { type: String, default: '' }
}, { timestamps: true });

// Transform output to expose string 'id' matching your original client expectations
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  }
});

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  category: String,
  description: String,
  image: { type: String, default: '' }
}, { strict: false, timestamps: true });

productSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  }
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);

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

// --- USER AUTHENTICATION ENDPOINTS ---

// SIGN UP API
app.post('/api/signup', upload.single('profileImage'), async (req, res) => {
  try {
    const { username, email, phone, password } = req.body;

    const cleanUsername = (username || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phone || '').trim();
    const cleanPassword = (password || '');

    // Check for existing user in MongoDB
    const existingUser = await User.findOne({
      $or: [
        { username: { $regex: new RegExp(`^${cleanUsername}$`, 'i') } },
        { email: cleanEmail }
      ]
    });

    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username or Email already exists.' });
    }

    const newUser = new User({
      username: cleanUsername,
      email: cleanEmail,
      phone: cleanPhone,
      password: cleanPassword,
      profileImage: req.file ? '/uploads/' + req.file.filename : ''
    });

    await newUser.save();

    const userObj = newUser.toJSON();
    delete userObj.password;

    res.json({ success: true, user: userObj });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ success: false, message: 'Server error during sign up!' });
  }
});

// LOGIN API
app.post('/api/login', async (req, res) => {
  try {
    const { identifier, username, password } = req.body;
    const rawIdentifier = identifier || username || '';
    const cleanIdentifier = rawIdentifier.trim().toLowerCase();
    const cleanPassword = password || '';

    const users = await User.find({});

    const user = users.find(u => {
      const matchUsername = u.username && u.username.toLowerCase() === cleanIdentifier;
      const matchEmail = u.email && u.email.toLowerCase() === cleanIdentifier;
      const matchPhone = u.phone && u.phone.trim() === rawIdentifier.trim();
      const matchPassword = u.password === cleanPassword;

      return (matchUsername || matchEmail || matchPhone) && matchPassword;
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username/email or password.' });
    }

    const userObj = user.toJSON();
    delete userObj.password;

    res.json({ success: true, user: userObj });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: 'Server error during sign in!' });
  }
});

// UPLOAD PROFILE PHOTO API
app.post('/api/user/upload-photo', upload.single('profileImage'), async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);

    if (user) {
      if (req.file) {
        user.profileImage = '/uploads/' + req.file.filename;
        await user.save();

        const userObj = user.toJSON();
        delete userObj.password;

        return res.json({ success: true, user: userObj });
      }
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }
    res.status(404).json({ success: false, message: 'User not found.' });
  } catch (err) {
    console.error("Upload photo error:", err);
    res.status(500).json({ success: false, message: 'Server error during photo upload!' });
  }
});

// --- PRODUCT ENDPOINTS ---

// GET all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (err) {
    console.error("Fetch products error:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// ADD product
app.post('/api/products/add', upload.single('image'), async (req, res) => {
  try {
    const newProduct = new Product({
      ...req.body,
      image: req.file ? '/uploads/' + req.file.filename : ''
    });
    await newProduct.save();
    res.json(newProduct);
  } catch (err) {
    console.error("Add product error:", err);
    res.status(500).json({ error: "Failed to add product" });
  }
});

// EDIT product
app.post('/api/products/edit', upload.single('image'), async (req, res) => {
  try {
    const id = req.body.id;
    const product = await Product.findById(id);

    if (product) {
      Object.assign(product, req.body);
      if (req.file) {
        product.image = '/uploads/' + req.file.filename;
      }
      await product.save();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Product not found" });
    }
  } catch (err) {
    console.error("Edit product error:", err);
    res.status(500).json({ error: "Failed to edit product" });
  }
});

// DELETE product
app.delete('/api/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('Server running on port ' + (process.env.PORT || 3000)));