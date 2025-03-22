document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('/api/cart');
    const cartData = response.ok ? await response.json() : [];

    // Mostrar elementos si el usuario está autenticado
    if (response.ok) {
      document.getElementById('login-link')?.classList.add('hidden');
      document.getElementById('register-link')?.classList.add('hidden');
      document.getElementById('user-icon')?.style.display = 'block';
      document.getElementById('cart-icon')?.style.display = 'block';
      document.getElementById('cart-count').textContent = cartData.length;

      // Redirigir al perfil al hacer click en el ícono de usuario
      document.getElementById('user-icon')?.addEventListener('click', () => {
        window.location.href = '/perfil';
      });

    } else {
      // Si no está autenticado, mostrar el modal de login al hacer clic
      document.getElementById('user-icon')?.addEventListener('click', () => {
        document.getElementById('logout-modal').style.display = 'flex';
      });
    }

    // Cerrar modal
    document.getElementById('close-modal')?.addEventListener('click', () => {
      document.getElementById('logout-modal').style.display = 'none';
    });

    // Cerrar sesión
    document.getElementById('logout-button')?.addEventListener('click', async () => {
      await fetch('/api/logout', { method: 'POST' });
      window.location.href = '/';
    });

  } catch (error) {
    console.warn("⚠️ Usuario no autenticado o error de conexión con /api/cart");
  }
});
