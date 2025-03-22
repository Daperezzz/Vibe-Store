const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 5000;


mongoose.connect('mongodb://localhost:27017/vibe-store')
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.log('❌ Error al conectar a MongoDB:', err));


app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'vibestore_secret_key',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/vibe-store' }),
    cookie: { maxAge: 1000 * 60 * 60 * 24, httpOnly: true, secure: false }
}));
app.use(bodyParser.json());


const userSchema = new mongoose.Schema({
    nombre: String,
    direccion: String,
    ciudad: String,
    email: String,
    password: String,
    role: { type: String, default: 'user' } 
});
const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema({
    name: String,
    price: Number,
    size: String,
    description: String,
    imagen: String,
    stock: Number 
});
const Product = mongoose.model('Product', productSchema);

const cartSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    products: [{
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      quantity: Number
    }]
});
const Cart = mongoose.model('Cart', cartSchema);


app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/productos', (req, res) => res.sendFile(path.join(__dirname, 'views', 'producto.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/registro', (req, res) => res.sendFile(path.join(__dirname, 'views', 'registro.html')));
app.get('/perfil', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'views', 'perfil.html'));
});
app.get('/carrito', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'views', 'carrito.html'));
});
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});


app.post('/api/register', async (req, res) => {
    const { nombre, direccion, ciudad, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const newUser = new User({ nombre, direccion, ciudad, email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'Usuario registrado correctamente' });
    } catch (error) {
        res.status(400).json({ error: 'Error al registrar usuario' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }
        req.session.userId = user._id;
        res.status(200).json({ message: 'Inicio de sesión exitoso', redirectUrl: '/' });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(() => {
        res.status(200).json({ message: 'Sesión cerrada' });
    });
});

app.get('/api/profile', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'No autenticado' });
    try {
        const user = await User.findById(req.session.userId).select('-password');
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: 'Error interno' });
    }
});


app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});


app.post('/api/cart/add', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Debes iniciar sesión' });

    const { productId, quantity } = req.body;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ error: 'ID inválido' });
    }

    let cart = await Cart.findOne({ userId: req.session.userId });
    if (!cart) cart = new Cart({ userId: req.session.userId, products: [] });

    const index = cart.products.findIndex(p => p.productId.toString() === productId);
    if (index > -1) {
        cart.products[index].quantity += quantity;
        if (cart.products[index].quantity <= 0) {
            cart.products.splice(index, 1);
        }
    } else if (quantity > 0) {
        cart.products.push({ productId: new mongoose.Types.ObjectId(productId), quantity });
    }

    await cart.save();
    res.status(200).json({ message: 'Carrito actualizado' });
});

app.get('/api/cart', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'No autenticado' });
    const cart = await Cart.findOne({ userId: req.session.userId }).populate('products.productId');
    res.status(200).json(cart ? cart.products : []);
});

app.delete('/api/cart/remove/:productId', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Acceso denegado' });
    const cart = await Cart.findOne({ userId: req.session.userId });
    if (cart) {
        cart.products = cart.products.filter(p => p.productId.toString() !== req.params.productId);
        await cart.save();
    }
    res.status(200).json({ message: 'Producto eliminado del carrito' });
});

app.get('/api/dashboard', async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments();
        const mostExpensive = await Product.findOne().sort({ price: -1 });
        const cheapest = await Product.findOne().sort({ price: 1 });
        res.status(200).json({
            totalProducts,
            mostExpensive,
            cheapest
        });
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

app.post('/api/admin/products', async (req, res) => {
    const { secretKey, name, price, size, description, imagen, stock } = req.body;
    if (!req.session.userId) return res.status(401).json({ error: 'No autorizado' });
    if (secretKey !== 'estofado') return res.status(403).json({ error: 'Clave incorrecta' });
    try {
        const newProduct = new Product({ name, price, size, description, imagen, stock });
        await newProduct.save();
        res.status(201).json({ message: 'Producto agregado correctamente' });
    } catch (error) {
        res.status(400).json({ error: 'Error al agregar producto' });
    }
});

app.put('/api/admin/products/:id', async (req, res) => {
    const { secretKey, name, price, size, description, imagen, stock } = req.body;
    if (!req.session.userId) return res.status(401).json({ error: 'No autorizado' });
    if (secretKey !== 'estofado') return res.status(403).json({ error: 'Clave incorrecta' });
    try {
        const updated = await Product.findByIdAndUpdate(
            req.params.id,
            { name, price, size, description, imagen, stock },
            { new: true }
        );
        if (!updated) return res.status(404).json({ error: 'Producto no encontrado' });
        res.status(200).json({ message: 'Producto actualizado correctamente' });
    } catch (error) {
        console.error('❌ Error al actualizar producto:', error);
        res.status(500).json({ error: 'Error al actualizar' });
    }
});

app.delete('/api/admin/products/:id', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'No autorizado' });
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Producto eliminado correctamente' });
    } catch (error) {
        res.status(400).json({ error: 'Error al eliminar producto' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
