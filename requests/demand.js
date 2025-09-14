let currentUser = null;

document.addEventListener('DOMContentLoaded', async function() {
    // -------------------- FETCH CURRENT USER DATA FIRST --------------------
    try {
        const { data: userData } = await axios.get("http://localhost:3000/currentUser");
        currentUser = userData;
    } catch (error) {
        console.error('Failed to load current user data:', error);
        return; 
    }

    const form = document.getElementById('leaveRequestForm');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const leaveTypeSelect = document.getElementById('leaveType');
    const reasonTextarea = document.getElementById('reason');

    const today = new Date().toISOString().split('T')[0];
    startDateInput.min = today;
    endDateInput.min = today;

    startDateInput.addEventListener('change', function() {
        endDateInput.min = this.value;
        if (endDateInput.value && endDateInput.value < this.value) {
            endDateInput.value = this.value;
        }
    });

    const charCounter = document.querySelector('.char-counter');
    reasonTextarea.addEventListener('input', function() {
        const remaining = 500 - this.value.length;
        charCounter.textContent = `${remaining} caractères restants`;
        if (remaining < 50) {
            charCounter.style.color = '#ff6b6b';
        } else {
            charCounter.style.color = '#666';
        }
    });

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const typeMap = {
            annual: 'Payé',
            sick: 'Maladie',
            personal: 'Personnel'
        };
        const normalizedType = typeMap[leaveTypeSelect.value] || leaveTypeSelect.value;

        const formData = {
            type: normalizedType,
            startDate: startDateInput.value,
            endDate: endDateInput.value,
            reason: reasonTextarea.value.trim(),
            employeeId: currentUser.id,
            status: 'En attente',
            requestDate: new Date().toISOString().split('T')[0]
        };

        if (new Date(formData.startDate) > new Date(formData.endDate)) {
            showNotification('La date de début doit être antérieure à la date de fin', 'error');
            return;
        }

        if (new Date(formData.startDate) < new Date()) {
            showNotification('La date de début ne peut pas être dans le passé', 'error');
            return;
        }

        try {
            const { data: requests } = await axios.get('http://localhost:3000/requests');
            const maxId = Math.max(...requests.map(r => parseInt(r.id))) || 0;
            formData.id = (maxId + 1).toString();

            const response = await axios.post('http://localhost:3000/requests', formData);

            if (response.status === 201) {
                showNotification('Demande de congé soumise avec succès!', 'success');
                form.reset();
                loadRecentRequests();
            }

        } catch (error) {
            console.error('Erreur lors de la soumission:', error);
            showNotification('Erreur lors de la soumission de la demande', 'error');
        }
    });

    loadRecentRequests(); 
});

/* -------------------- LOAD RECENT REQUESTS -------------------- */
async function loadRecentRequests() {
    if (!currentUser) {
        console.error('User data not available. Cannot load recent requests.');
        return;
    }

    try {
        const { data: requests } = await axios.get('http://localhost:3000/requests');
        const userRequests = requests
            .filter(request => request.employeeId == currentUser.id)
            .sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate))
            .slice(0, 3);

        const recentRequestsContainer = document.querySelector('.recent-requests');
        const existingItems = recentRequestsContainer.querySelectorAll('.request-item');

        existingItems.forEach(item => item.remove());

        if (userRequests.length === 0) {
            const noRequestsHTML = `
                <div class="request-item no-requests">
                    <div class="request-info">
                        <div class="request-type">Aucune demande récente</div>
                        <div class="request-dates">Votre première demande apparaîtra ici</div>
                    </div>
                </div>
            `;
            recentRequestsContainer.insertAdjacentHTML('beforeend', noRequestsHTML);
            return;
        }

        userRequests.forEach(request => {
            const typeDisplayNames = {
                'Payé': 'Congés payés',
                'Maladie': 'Congé maladie',
                'Personnel': 'Congé personnel',
                'annual': 'Congés payés',
                'sick': 'Congé maladie',
                'personal': 'Congé personnel'
            };

            const statusDisplayNames = {
                'En attente': 'En attente',
                'Approuvé': 'Approuvé',
                'Rejeté': 'Rejeté'
            };

            const startDate = new Date(request.startDate).toLocaleDateString('fr-FR');
            const endDate = new Date(request.endDate).toLocaleDateString('fr-FR');
            const statusClass = request.status === 'Approuvé' ? 'approved' :
                                 request.status === 'Rejeté' ? 'rejected' :
                                 request.status === 'En attente' ? 'pending' : '';

            const requestHTML = `
                <div class="request-item">
                    <div class="request-info">
                        <div class="request-type">${typeDisplayNames[request.type] || request.type}</div>
                        <div class="request-dates">${startDate} - ${endDate}</div>
                    </div>
                    <div class="request-status ${statusClass}">${statusDisplayNames[request.status] || request.status}</div>
                </div>
            `;

            recentRequestsContainer.insertAdjacentHTML('beforeend', requestHTML);
        });

    } catch (error) {
        console.error('Erreur lors du chargement des demandes récentes:', error);
    }
}

/* -------------------- NOTIFICATION SYSTEM -------------------- */
function showNotification(message, type = 'info') {
    const existingNotifs = document.querySelectorAll('.notification');
    existingNotifs.forEach(notif => notif.remove());

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}