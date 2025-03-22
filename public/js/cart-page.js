document.addEventListener('DOMContentLoaded', async () => {
    const contenedor = document.getElementById('carrito-container');
  
    try {
      const res = await fetch('/api/cart');
      if (!res.ok) throw new Error('Carrito no disponible');
  
      const carrito = await res.json();
  
      if (carrito.length === 0) {
        contenedor.innerHTML = "<p>Tu carrito está vacío.</p>";
        return;
      }
  
      carrito.forEach(item => {
        const producto = item.productId;
        const div = document.createElement('div');
        div.classList.add('carrito-item');
        div.innerHTML = `
          <img src="${producto.imagen}" alt="${producto.name}" width="80">
          <h3>${producto.name}</h3>
          <p>Precio: $${producto.price}</p>
          <p>Talla: ${producto.size}</p>
          <div class="quantity-controls">
            <button class="decrease-btn" data-id="${producto._id}">−</button>
            <span>${item.quantity}</span>
            <button class="increase-btn" data-id="${producto._id}">+</button>
          </div>
          <button class="eliminar-btn" data-id="${producto._id}">Eliminar</button>
        `;
        contenedor.appendChild(div);
      });
  
      
      document.querySelectorAll('.increase-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          await actualizarCantidad(id, 1);
        });
      });
  
      document.querySelectorAll('.decrease-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          await actualizarCantidad(id, -1);
        });
      });
  
      
      document.querySelectorAll('.eliminar-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          await fetch(`/api/cart/remove/${id}`, { method: 'DELETE' });
          location.reload();
        });
      });
  
      
      document.getElementById('finalizar-compra-btn')?.addEventListener('click', () => {
        document.getElementById('formulario-pago').style.display = 'block';
        window.scrollTo(0, document.body.scrollHeight);
      });
  
      
      document.getElementById('pago-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
  
        const res = await fetch('/api/cart');
        const carrito = await res.json();
  
        if (!carrito.length) {
          alert("Tu carrito está vacío.");
          return;
        }
  
        
        let boletaHTML = `<h2>📃 Boleta VibeStore</h2><hr>`;
        let total = 0;
  
        for (const item of carrito) {
          const p = item.productId;
          const subtotal = p.price * item.quantity;
          total += subtotal;
          boletaHTML += `
            <p>🧾 <strong>${p.name}</strong> (${p.size}) x${item.quantity} = <strong>$${subtotal}</strong></p>
          `;
        }
  
        boletaHTML += `<hr><h3>Total: $${total}</h3><p>Gracias por tu compra 🧡</p>`;
  
        
        const boletaDiv = document.getElementById('boleta');
        boletaDiv.innerHTML = boletaHTML;
        boletaDiv.style.display = 'block';
  
        
        for (const item of carrito) {
          await fetch(`/api/cart/remove/${item.productId._id}`, { method: 'DELETE' });
        }
  
        
        document.getElementById('formulario-pago').style.display = 'none';
      });
  
    } catch (err) {
      contenedor.innerHTML = `<p>❌ Error: ${err.message}</p>`;
    }
  });
  
  
  async function actualizarCantidad(productId, cambio) {
    try {
      const res = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: cambio })
      });
  
      if (res.ok) {
        location.reload();
      } else {
        const data = await res.json();
        alert(data.error || 'No se pudo actualizar el carrito');
      }
    } catch (err) {
      console.error('❌ Error al actualizar cantidad:', err);
    }
  }
  