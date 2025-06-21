const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();
const PORT = 5001;

// Configuración MercadoPago
const mercadopago = new MercadoPagoConfig({
  accessToken: 'TEST-4044675009086167-062117-80d7c1261caaf08da6493b12aeda4e2b-2065633987'
});

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

// Modelos
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
  stock: Number,
  category: String
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

// Vistas
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
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'views', 'admin.html')));

// Registro/Login
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
  req.session.destroy(() => res.status(200).json({ message: 'Sesión cerrada' }));
});

app.get('/api/profile', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'No autenticado' });
  const user = await User.findById(req.session.userId).select('-password');
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.status(200).json(user);
});

// Productos
app.get('/api/products', async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

app.post('/api/admin/products', async (req, res) => {
  const { secretKey, name, price, size, description, imagen, stock } = req.body;
  if (secretKey !== 'estofado') return res.status(403).json({ error: 'Clave incorrecta' });
  const newProduct = new Product({ name, price, size, description, imagen, stock });
  await newProduct.save();
  res.status(201).json({ message: 'Producto agregado correctamente' });
});

app.put('/api/admin/products/:id', async (req, res) => {
  const { secretKey, name, price, size, description, imagen, stock } = req.body;
  if (secretKey !== 'estofado') return res.status(403).json({ error: 'Clave incorrecta' });
  const updated = await Product.findByIdAndUpdate(req.params.id, {
    name, price, size, description, imagen, stock
  }, { new: true });
  if (!updated) return res.status(404).json({ error: 'Producto no encontrado' });
  res.status(200).json({ message: 'Producto actualizado correctamente' });
});

app.delete('/api/admin/products/:id', async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.status(200).json({ message: 'Producto eliminado correctamente' });
});

// Carrito
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

// Crear preferencia MercadoPago
app.post('/crear-preferencia', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Usuario no autenticado' });

  const cart = await Cart.findOne({ userId: req.session.userId }).populate('products.productId');
  if (!cart || cart.products.length === 0)
    return res.status(400).json({ error: 'Carrito vacío' });

  const items = cart.products.map(p => ({
    title: p.productId.name,
    unit_price: p.productId.price,
    quantity: p.quantity
  }));

  const preference = {
    items,
    back_urls: {
      success: 'http://localhost:5001/success',
      failure: 'http://localhost:5001/failure',
      pending: 'http://localhost:5001/pending'
    }
  };

  const preferenceInstance = new Preference(mercadopago);
  const response = await preferenceInstance.create({ body: preference });

  res.json({ url: response.init_point });
});

// Ruta de éxito con boleta y correo
app.get('/success', async (req, res) => {
  if (!req.session.userId) return res.send('⚠️ No autenticado');

  try {
    const user = await User.findById(req.session.userId);
    const cart = await Cart.findOne({ userId: req.session.userId }).populate('products.productId');
    if (!cart || cart.products.length === 0) return res.send('⚠️ Carrito vacío');

    const productos = cart.products.map(p => ({
      name: p.productId.name,
      size: p.productId.size,
      quantity: p.quantity,
      price: p.productId.price
    }));

    const total = productos.reduce((sum, p) => sum + p.price * p.quantity, 0);

    const doc = new PDFDocument();
    const filePath = path.join(__dirname, `boleta_${Date.now()}.pdf`);
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(18).text('🧾 Boleta de Compra - VibeStore', { align: 'center' }).moveDown();
    productos.forEach(p => {
      doc.fontSize(12).text(`• ${p.name} (${p.size}) x${p.quantity} = $${p.price * p.quantity}`);
    });
    doc.moveDown();
    doc.fontSize(14).text(`Total: $${total}`, { align: 'right' });
    doc.text(`Fecha: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.end();

    stream.on('finish', async () => {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'vibestoreurban@gmail.com',
          pass: 'giujolpgjhptleeb'
        },
        tls: { rejectUnauthorized: false }
      });

      await transporter.sendMail({
        from: '"VibeStore" <vibestoreurban@gmail.com>',
        to: user.email,
        subject: '🧾 Boleta de tu compra en VibeStore',
        html: `<h2>¡Gracias por tu compra!</h2><p>Adjuntamos tu boleta en PDF.</p>`,
        attachments: [{ filename: 'boleta.pdf', path: filePath }]
      });

      await Cart.findOneAndUpdate({ userId: req.session.userId }, { products: [] });

      res.send(`
        <h2>✅ ¡Pago realizado con éxito!</h2>
        <p>Te hemos enviado la boleta al correo <strong>${user.email}</strong>.</p>
        <a href="/productos">← Volver a la tienda</a>
      `);

      setTimeout(() => fs.unlinkSync(filePath), 5000);
    });

  } catch (error) {
    console.error('❌ Error en /success:', error);
    res.send('❌ Error al procesar la boleta.');
  }
});

// Rutas adicionales
app.get('/failure', (req, res) => res.send('❌ El pago fue rechazado.'));
app.get('/pending', (req, res) => res.send('⏳ El pago está pendiente.'));

app.get('/api/dashboard', async (req, res) => {
  const totalProducts = await Product.countDocuments();
  const mostExpensive = await Product.findOne().sort({ price: -1 });
  const cheapest = await Product.findOne().sort({ price: 1 });
  res.status(200).json({ totalProducts, mostExpensive, cheapest });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
