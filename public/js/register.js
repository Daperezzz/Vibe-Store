document.getElementById('register-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const nombre = document.getElementById('register-nombre').value;
    const direccion = document.getElementById('register-direccion').value;
    const ciudad = document.getElementById('register-ciudad').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const errorMessage = document.getElementById('register-error-message');

    try {
        const response = await fetch('http://localhost:5000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre, direccion, ciudad, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Registro exitoso, ahora inicia sesión.');
            window.location.href = '/login';
        } else {
            errorMessage.textContent = data.error;
        }
    } catch (error) {
        errorMessage.textContent = 'Error en el servidor';
    }
});
