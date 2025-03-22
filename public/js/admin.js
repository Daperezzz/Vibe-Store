document.addEventListener('DOMContentLoaded', () => {
    let modoEdicion = false;
    let productoEditandoId = null;

    
    localStorage.removeItem('adminKey');
    document.getElementById('admin-modal').style.display = 'flex';

    
    document.getElementById('submit-key').addEventListener('click', () => {
        const key = document.getElementById('admin-key').value;
        if (key === 'estofado') {
            localStorage.setItem('adminKey', key);
            document.getElementById('admin-modal').style.display = 'none';
            document.getElementById('admin-panel').style.display = 'block';
            cargarDashboard();
            cargarProductos();
        } else {
            alert('❌ Clave incorrecta. No tienes acceso.');
        }
    });

    
    document.getElementById('product-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const secretKey = localStorage.getItem('adminKey');
        const name = document.getElementById('name').value;
        const price = document.getElementById('price').value;
        const size = document.getElementById('size').value;
        const description = document.getElementById('description').value;
        const imagen = document.getElementById('imagen').value;
        const stock = document.getElementById('stock').value;

        const datos = { secretKey, name, price, size, description, imagen, stock };

        try {
            let response;
            if (modoEdicion && productoEditandoId) {
                response = await fetch(`/api/admin/products/${productoEditandoId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datos)
                });
            } else {
                response = await fetch('/api/admin/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datos)
                });
            }
            const data = await response.json();
            if (response.ok) {
                alert(modoEdicion ? '✅ Producto editado correctamente' : '✅ Producto agregado correctamente');
                resetFormulario();
                cargarProductos();
                cargarDashboard();
            } else {
                alert('❌ Error: ' + data.error);
            }
        } catch (error) {
            console.error('❌ Error al guardar producto:', error);
        }
    });

    async function cargarProductos() {
        try {
            const response = await fetch('/api/products');
            const productos = await response.json();
            const tbody = document.querySelector('#product-table tbody');
            tbody.innerHTML = '';

            productos.forEach(producto => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${producto.name}</td>
                    <td>$${producto.price}</td>
                    <td>${producto.size}</td>
                    <td>${producto.description}</td>
                    <td><img src="${producto.imagen}" width="50"></td>
                    <td>
                        <button class="edit-button" data-id="${producto._id}">✏️ Editar</button>
                        <button class="delete-button" data-id="${producto._id}">🗑️ Eliminar</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            document.querySelectorAll('.delete-button').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const productId = event.target.getAttribute('data-id');
                    await eliminarProducto(productId);
                });
            });

            document.querySelectorAll('.edit-button').forEach(button => {
                button.addEventListener('click', async (event) => {
                    const id = event.target.getAttribute('data-id');
                    const producto = productos.find(p => p._id === id);
                    if (producto) {
                        document.getElementById('name').value = producto.name;
                        document.getElementById('price').value = producto.price;
                        document.getElementById('size').value = producto.size;
                        document.getElementById('description').value = producto.description;
                        document.getElementById('imagen').value = producto.imagen;
                        document.getElementById('stock').value = producto.stock || 0;
                        modoEdicion = true;
                        productoEditandoId = id;
                        document.querySelector('#product-form button').textContent = '💾 Guardar Cambios';
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                });
            });

        } catch (error) {
            console.error('❌ Error al cargar productos:', error);
        }
    }

    async function eliminarProducto(productId) {
        if (!confirm('¿Seguro que deseas eliminar este producto?')) return;
        try {
            const response = await fetch(`/api/admin/products/${productId}`, { method: 'DELETE' });
            const data = await response.json();
            if (response.ok) {
                alert('✅ Producto eliminado');
                cargarProductos();
                cargarDashboard();
            } else {
                alert('❌ Error: ' + data.error);
            }
        } catch (error) {
            console.error('❌ Error al eliminar producto:', error);
        }
    }

    async function cargarDashboard() {
        try {
            const res = await fetch('/api/dashboard');
            const stats = await res.json();
            const dashboardDiv = document.getElementById('dashboard-stats');
            dashboardDiv.innerHTML = `
                <p><strong>Total de Productos:</strong> ${stats.totalProducts}</p>
                <p><strong>Producto más caro:</strong> ${stats.mostExpensive ? stats.mostExpensive.name + ' ($' + stats.mostExpensive.price + ')' : 'N/A'}</p>
                <p><strong>Producto más barato:</strong> ${stats.cheapest ? stats.cheapest.name + ' ($' + stats.cheapest.price + ')' : 'N/A'}</p>
            `;
        } catch (error) {
            console.error('❌ Error al cargar dashboard:', error);
        }
    }

    function resetFormulario() {
        modoEdicion = false;
        productoEditandoId = null;
        document.getElementById('product-form').reset();
        document.querySelector('#product-form button').textContent = '✅ Agregar Producto';
    }
});
