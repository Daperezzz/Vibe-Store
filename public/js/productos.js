let productosTotales = [];
let paginaActual = 1;
const productosPorPagina = 4;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('/api/products');
    const productos = await response.json();

    
    productosTotales = productos.map(p => ({
      ...p,
      categoria: detectarCategoria(p.name) 
    }));

    renderProductos();
    renderPaginacion();
  } catch (error) {
    console.error('❌ Error al cargar productos:', error);
  }
});

function detectarCategoria(nombre) {
  const n = nombre.toLowerCase();
  if (n.includes("poleron")) return "poleron";
  if (n.includes("polera")) return "polera";
  if (n.includes("jeans")) return "jeans";
  if (n.includes("zapatilla")) return "zapatilla";
  return "otros";
}

function renderProductos() {
  const contenedor = document.getElementById('products');
  contenedor.innerHTML = '';

  const inicio = (paginaActual - 1) * productosPorPagina;
  const fin = inicio + productosPorPagina;
  const productosPagina = productosTotales.slice(inicio, fin);

  if (productosPagina.length === 0) {
    contenedor.innerHTML = `<p style="text-align:center;">No se encontraron productos.</p>`;
    return;
  }

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

function renderPaginacion() {
  const totalPaginas = Math.ceil(productosTotales.length / productosPorPagina);
  const contenedor = document.getElementById('pagination');
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

function showProductDetail(producto) {
  document.getElementById('detail-image').src = producto.imagen;
  document.getElementById('detail-name').textContent = producto.name;
  document.getElementById('detail-price').textContent = producto.price;
  document.getElementById('detail-size').textContent = producto.size;
  document.getElementById('detail-description').textContent = producto.description;
  document.getElementById('add-to-cart-btn').setAttribute('data-id', producto._id);
  document.getElementById('product-detail-modal').style.display = 'flex';
}

document.getElementById('close-product-detail').addEventListener('click', () => {
  document.getElementById('product-detail-modal').style.display = 'none';
});

document.getElementById('add-to-cart-btn').addEventListener('click', async function () {
  const productId = this.getAttribute('data-id');
  if (!productId) return alert('⚠️ Producto no válido');
  await addToCart(productId, 1);
  document.getElementById('product-detail-modal').style.display = 'none';
});

async function addToCart(productId, quantity) {
  try {
    const res = await fetch('/api/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity })
    });

    const data = await res.json();
    if (res.ok) {
  Swal.fire({
    icon: 'success',
    title: '¡Producto añadido!',
    text: 'Tu producto se ha añadido al carrito correctamente.',
    timer: 1800,
    showConfirmButton: false,
    toast: true,
    position: 'top-end',
    timerProgressBar: true
  });
} else {
  Swal.fire({
    icon: 'error',
    title: 'Error',
    text: data.error || 'No se pudo agregar al carrito'
  });
}
  } catch (err) {
    console.error('❌ Error al añadir al carrito:', err);
  }
}

document.getElementById('filter-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const categoria = document.getElementById('category').value;
  const talla = document.getElementById('size').value;

  try {
    const response = await fetch('/api/products');
    const productos = await response.json();

    productosTotales = productos.map(p => ({
      ...p,
      categoria: detectarCategoria(p.name)
    })).filter(producto => {
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

window.addEventListener('click', (e) => {
  const modal = document.getElementById('product-detail-modal');
  if (e.target === modal) {
    modal.style.display = 'none';
  }
});
