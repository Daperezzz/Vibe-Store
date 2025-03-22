let productosTotales = [];
let paginaActual = 1;
const productosPorPagina = 5;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('/api/products');
    productosTotales = await response.json();
    renderProductos();
    renderPaginacion();
  } catch (error) {
    console.error('❌ Error al cargar productos:', error);
  }
});

// ✅ Función para renderizar productos
function renderProductos() {
  const contenedor = document.getElementById('products');
  contenedor.innerHTML = '';

  const inicio = (paginaActual - 1) * productosPorPagina;
  const fin = inicio + productosPorPagina;
  const productosPagina = productosTotales.slice(inicio, fin);

  productosPagina.forEach(producto => {
    const div = document.createElement('div');
    div.classList.add('product');
    div.innerHTML = `
      <img src="${producto.imagen}" alt="${producto.name}">
      <h3>${producto.name}</h3>
      <p><strong>$${producto.price}</strong></p>
      <button class="ver-detalle-btn">Ver Producto</button>
      <button class="add-to-cart-btn">Añadir al Carrito</button>
    `;

    div.querySelector('.ver-detalle-btn').addEventListener('click', () => {
      showProductDetail(producto);
    });

    div.querySelector('.add-to-cart-btn').addEventListener('click', async () => {
      await addToCart(producto._id, 1);
    });

    contenedor.appendChild(div);
  });
}

// ✅ Paginación
function renderPaginacion() {
  const totalPaginas = Math.ceil(productosTotales.length / productosPorPagina);
  const contenedor = document.getElementById('pagination');
  if (!contenedor) return;

  contenedor.innerHTML = '';

  if (paginaActual > 1) {
    const anterior = document.createElement('button');
    anterior.textContent = '⬅ Anterior';
    anterior.onclick = () => {
      paginaActual--;
      renderProductos();
      renderPaginacion();
    };
    contenedor.appendChild(anterior);
  }

  if (paginaActual < totalPaginas) {
    const siguiente = document.createElement('button');
    siguiente.textContent = 'Siguiente ➡';
    siguiente.onclick = () => {
      paginaActual++;
      renderProductos();
      renderPaginacion();
    };
    contenedor.appendChild(siguiente);
  }
}

// ✅ Mostrar detalle del producto en modal
function showProductDetail(producto) {
  document.getElementById('detail-image').src = producto.imagen;
  document.getElementById('detail-name').textContent = producto.name;
  document.getElementById('detail-price').textContent = producto.price;
  document.getElementById('detail-size').textContent = producto.size;
  document.getElementById('detail-description').textContent = producto.description;
  document.getElementById('add-to-cart-btn').setAttribute('data-id', producto._id);
  document.getElementById('product-detail-modal').style.display = 'flex';
}

// ✅ Cerrar el modal
document.getElementById('close-product-detail').addEventListener('click', () => {
  document.getElementById('product-detail-modal').style.display = 'none';
});

// ✅ Añadir al carrito desde el modal
document.getElementById('add-to-cart-btn').addEventListener('click', async function () {
  const productId = this.getAttribute('data-id');
  if (!productId) {
    console.error('⚠️ productId no definido al intentar añadir al carrito');
    return alert('Error: producto no válido');
  }
  await addToCart(productId, 1);
  document.getElementById('product-detail-modal').style.display = 'none';
});

// ✅ Añadir al carrito
async function addToCart(productId, quantity) {
  try {
    const res = await fetch('/api/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity })
    });

    const data = await res.json();
    if (res.ok) {
      alert('✅ Producto añadido al carrito');
    } else {
      alert(data.error || '❌ No se pudo agregar al carrito');
    }
  } catch (err) {
    console.error('❌ Error al añadir al carrito:', err);
  }
}

// ✅ Filtrar productos
document.getElementById('filter-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const categoria = document.getElementById('category').value;
  const talla = document.getElementById('size').value;

  try {
    const response = await fetch('/api/products');
    const productos = await response.json();

    productosTotales = productos.filter(producto => {
      const coincideCategoria = categoria === 'all' || producto.categoria === categoria;
      const coincideTalla = talla === 'all' || producto.size === talla;
      return coincideCategoria && coincideTalla;
    });

    paginaActual = 1;
    renderProductos();
    renderPaginacion();
  } catch (error) {
    console.error('❌ Error al filtrar productos:', error);
  }
});
