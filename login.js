document.addEventListener('DOMContentLoaded', () => {
    // Add a class to the body for login-specific styling
    document.body.classList.add('login-page');

    const loginForm = document.getElementById('login-form');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const [adminResponse, employeesResponse] = await Promise.all([
                axios.get('http://localhost:3000/admin'),
                axios.get('http://localhost:3000/employees')
            ]);
            const adminUser = adminResponse.data;
            const employees = employeesResponse.data;
            const allUsers = [adminUser, ...employees];

            const user = allUsers.find(u => u && u.email === email && u.password === password);

            if (user) {
                // 2. Set the logged-in user in currentUser using PUT
                await axios.put('http://localhost:3000/currentUser', {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.position === 'admin' ? 'admin' : 'employee' 
                });

                // 3. Redirect based on role
                if (user.position === 'admin') {
                    window.location.href = '/admin/admin.html';
                } else {
                    window.location.href = '/dashboard/dashboard.html';
                }
            } else {
                // Handle invalid credentials
                alert('Email ou mot de passe incorrect.');
            }
        } catch (error) {
            console.error('Erreur de connexion:', error);
            alert('Une erreur est survenue lors de la tentative de connexion.');
        }
    });
});
