document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('/api/cart');
    const cartData = response.ok ? await response.json() : [];

    
    if (response.ok) {
      document.getElementById('login-link')?.classList.add('hidden');
      document.getElementById('register-link')?.classList.add('hidden');
      document.getElementById('user-icon')?.style.display = 'block';
      document.getElementById('cart-icon')?.style.display = 'block';
      document.getElementById('cart-count').textContent = cartData.length;

      
      document.getElementById('user-icon')?.addEventListener('click', () => {
        window.location.href = '/perfil';
      });

    } else {
      
      document.getElementById('user-icon')?.addEventListener('click', () => {
        document.getElementById('logout-modal').style.display = 'flex';
      });
    }

    
    document.getElementById('close-modal')?.addEventListener('click', () => {
      document.getElementById('logout-modal').style.display = 'none';
    });

    
    document.getElementById('logout-button')?.addEventListener('click', async () => {
      await fetch('/api/logout', { method: 'POST' });
      window.location.href = '/';
    });

  } catch (error) {
    console.warn("⚠️ Usuario no autenticado o error de conexión con /api/cart");
  }
});
