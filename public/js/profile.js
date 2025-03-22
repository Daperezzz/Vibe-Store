document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/api/profile');
        const user = await res.json();

        document.getElementById('name').textContent = user.nombre;
        document.getElementById('address').textContent = user.direccion;
        document.getElementById('city').textContent = user.ciudad;
        document.getElementById('email').textContent = user.email;
        
    } catch (error) {
        console.error("Error al cargar perfil:", error);
        window.location.href = '/login';
    }

    
    document.getElementById('logout-button')?.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/logout', {
                method: 'POST'
            });
            if (res.ok) {
                window.location.href = '/';
            } else {
                alert('❌ Error al cerrar sesión');
            }
        } catch (err) {
            console.error('❌ Error al cerrar sesión:', err);
        }
    });
});
