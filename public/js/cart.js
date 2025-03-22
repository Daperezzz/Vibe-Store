document.addEventListener('DOMContentLoaded', async () => {
  const cartIcon = document.getElementById('cart-icon');
  const cartModal = document.getElementById('cart-modal');
  const closeCartBtn = document.getElementById('close-cart');
  const cartItemsContainer = document.getElementById('cart-items');
  const cartCountSpan = document.getElementById('cart-count');

  cartIcon?.addEventListener('click', async () => {
    cartModal.style.display = 'flex';
    await cargarCarrito();
  });

  closeCartBtn?.addEventListener('click', () => {
    cartModal.style.display = 'none';
  });

  async function cargarCarrito() {
    try {
      const response = await fetch('/api/cart');
      const items = await response.json();
      cartItemsContainer.innerHTML = '';

      let totalItems = 0;

      items.forEach(item => {
        if (!item.productId || !item.productId.name) {
          console.warn('Producto no válido en carrito:', item);
          return;
        }

        totalItems += item.quantity;

        const div = document.createElement('div');
        div.classList.add('cart-item');
        div.innerHTML = `
          <img src="${item.productId.imagen}" alt="${item.productId.name}" class="cart-img">
          <div class="cart-info">
            <h4>${item.productId.name}</h4>
            <p><strong>Precio:</strong> $${item.productId.price}</p>
            <p><strong>Talla:</strong> ${item.productId.size}</p>
            <div class="quantity-controls">
              <button class="decrease" data-id="${item.productId._id}">−</button>
              <span>${item.quantity}</span>
              <button class="increase" data-id="${item.productId._id}">+</button>
            </div>
            <button class="ver-producto-btn" data-id="${item.productId._id}">Ver producto</button>
          </div>
        `;
        cartItemsContainer.appendChild(div);
      });

      if (cartCountSpan) {
        cartCountSpan.textContent = totalItems;
      }

      document.querySelectorAll('.increase').forEach(btn => {
        btn.addEventListener('click', () => {
          actualizarCantidad(btn.dataset.id, 1);
        });
      });

      document.querySelectorAll('.decrease').forEach(btn => {
        btn.addEventListener('click', () => {
          actualizarCantidad(btn.dataset.id, -1);
        });
      });

      document.querySelectorAll('.ver-producto-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const res = await fetch('/api/products');
          const productos = await res.json();
          const producto = productos.find(p => p._id === id);
          if (producto) mostrarDetalle(producto);
        });
      });

    } catch (err) {
      console.error('❌ Error al cargar carrito:', err);
    }
  }

  async function actualizarCantidad(productId, cambio) {
    try {
      await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: cambio })
      });
      await cargarCarrito();
    } catch (err) {
      console.error('❌ Error al actualizar cantidad:', err);
    }
  }

  function mostrarDetalle(producto) {
    document.getElementById('detail-image').src = producto.imagen;
    document.getElementById('detail-name').textContent = producto.name;
    document.getElementById('detail-price').textContent = producto.price;
    document.getElementById('detail-size').textContent = producto.size;
    document.getElementById('detail-description').textContent = producto.description;
    document.getElementById('product-detail-modal').style.display = 'flex';
  }

  const closeDetail = document.getElementById('close-product-detail');
  if (closeDetail) {
    closeDetail.addEventListener('click', () => {
      document.getElementById('product-detail-modal').style.display = 'none';
    });
  }

  await cargarCarrito();
});


window.cargarCarrito = cargarCarrito;
