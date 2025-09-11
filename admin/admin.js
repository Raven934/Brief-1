document.addEventListener('DOMContentLoaded', function() {
    let allRequests = [];
    let allEmployees = [];
    let filterState = 'all'; // Can be 'all', 'pending', or 'processed'
    
    // Initialize admin page
    init();
    
    async function init() {
        try {
            // Load data
            await loadEmployees();
            await loadRequests();
            await loadStatistics();
            
            // Setup event listeners
            setupEventListeners();
            
        } catch (error) {
            console.error('Erreur lors de l\'initialisation:', error);
        }
    }
    
    // Load employees data
    async function loadEmployees() {
        try {
            const response = await axios.get('http://localhost:3000/employees');
            allEmployees = response.data;
        } catch (error) {
            console.error('Erreur lors du chargement des employés:', error);
        }
    }
    
    // Load requests data
    async function loadRequests() {
        try {
            const response = await axios.get('http://localhost:3000/requests');
            allRequests = response.data;
            displayRequests(allRequests);
        } catch (error) {
            console.error('Erreur lors du chargement des demandes:', error);
        }
    }
    
    // Load and display statistics
    async function loadStatistics() {
        try {
            const pending = allRequests.filter(r => r.status === 'En attente').length;
            const approved = allRequests.filter(r => r.status === 'Approuvé').length;
            const rejected = allRequests.filter(r => r.status === 'Refusé').length;
            const total = allRequests.length;
            
            // Update stat cards
            document.querySelector('.stat-pending .stat-number').textContent = pending;
            document.querySelector('.stat-approved .stat-number').textContent = approved;
            document.querySelector('.stat-rejected .stat-number').textContent = rejected;
            document.querySelector('.stat-total .stat-number').textContent = total;
            
        } catch (error) {
            console.error('Erreur lors du chargement des statistiques:', error);
        }
    }
    
    // Display requests
    function displayRequests(requests) {
        const requestsContainer = document.querySelector('#requests-container');
        requestsContainer.innerHTML = '';

        if (requests.length === 0) {
            requestsContainer.innerHTML = `<div class="col-12"><div class="text-center py-5"><i class="fa-regular fa-folder-open fa-3x text-muted mb-3"></i><h5 class="text-muted">Aucune demande trouvée</h5></div></div>`;
            return;
        }

        requests.forEach(request => {
            const employee = allEmployees.find(emp => emp.id == request.employeeId);
            if (employee) {
                const cardHTML = createRequestCardHTML(request, employee);
                requestsContainer.insertAdjacentHTML('beforeend', cardHTML);
            }
        });
    }

    function createRequestCardHTML(request, employee) {
        const statusClass = getStatusClass(request.status);
        const statusBadgeClass = getStatusBadgeClass(request.status);
        const typeDisplay = getTypeDisplay(request.type);
        const startDate = new Date(request.startDate).toLocaleDateString('fr-FR');
        const endDate = new Date(request.endDate).toLocaleDateString('fr-FR');
        const duration = calculateDuration(request.startDate, request.endDate);

        return `
            <div class="col-xl-4 col-lg-6" id="request-card-${request.id}">
                <div class="request-card ${statusClass}">
                    <div class="card-header">
                        <div class="employee-info">
                            <div class="employee-avatar me-3">
                                ${employee.avatar ? `<img src="../${employee.avatar}" alt="${employee.name}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">` : `<div class="avatar-circle"></div>`}
                            </div>
                            <div class="employee-details">
                                <h5 class="employee-name">${employee.name}</h5>
                                <span class="employee-role">${employee.position}</span>
                            </div>
                        </div>
                        <span class="status-badge ${statusBadgeClass}">${request.status}</span>
                    </div>
                    <div class="card-body">
                        <div class="request-details">
                            <div class="detail-row"><span class="detail-label">Type:</span><span class="detail-value">${typeDisplay}</span></div>
                            <div class="detail-row"><span class="detail-label">Du:</span><span class="detail-value">${startDate}</span></div>
                            <div class="detail-row"><span class="detail-label">Au:</span><span class="detail-value">${endDate}</span></div>
                            <div class="detail-row"><span class="detail-label">Durée:</span><span class="detail-value">${duration} jour${duration > 1 ? 's' : ''}</span></div>
                            ${request.reason ? `<div class="detail-row"><span class="detail-label">Motif:</span><span class="detail-value">${request.reason}</span></div>` : ''}
                        </div>
                    </div>
                    <div class="card-footer">
                        ${request.status === 'En attente' ? `
                            <div class="action-buttons">
                                <button type="button" class="btn btn-approve" data-request-id="${request.id}" data-action="approve"><i class="fa-solid fa-check me-2"></i>Approuver</button>
                                <button type="button" class="btn btn-reject" data-request-id="${request.id}" data-action="reject"><i class="fa-solid fa-times me-2"></i>Refuser</button>
                            </div>
                        ` : request.status === 'Approuvé' ? `
                            <div class="action-buttons">
                                <button type="button" class="btn btn-view" data-request-id="${request.id}" data-action="view"><i class="fa-solid fa-eye me-2"></i>Voir</button>
                            </div>
                        ` : `
                            <div class="action-info">
                                <small class="text-muted">${request.status} le ${new Date(request.requestDate).toLocaleDateString('fr-FR')}</small>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    async function updateRequestCard(requestId) {
        try {
            const response = await axios.get(`http://localhost:3000/requests/${requestId}`);
            const request = response.data;
            const employee = allEmployees.find(emp => emp.id == request.employeeId);
            
            if (request && employee) {
                const cardElement = document.getElementById(`request-card-${request.id}`);
                if (cardElement) {
                    cardElement.outerHTML = createRequestCardHTML(request, employee);
                }
            }
            await loadStatistics();
        } catch (error) {
            console.error(`Erreur lors de la mise à jour de la carte de demande ${requestId}:`, error);
        }
    }
    
    // Setup event listeners
    function setupEventListeners() {
        // Status filter
        const statusFilter = document.querySelector('.status-filter');
        statusFilter.addEventListener('change', filterRequests);
        
        // Search functionality
        const searchInput = document.querySelector('.search-box input');
        searchInput.addEventListener('input', filterRequests);
        
        // Export button
        const exportBtn = document.querySelector('.btn-export');
        exportBtn.addEventListener('click', exportData);
        
        // Filter button
        const filterBtn = document.querySelector('.btn-filter');
        filterBtn.addEventListener('click', toggleRequestFilter);

        // Centralized event listener for action buttons
        document.addEventListener('click', function(e) {
            const button = e.target.closest('[data-action]');
            if (!button) return;

            // This is crucial to prevent the page from reloading
            e.preventDefault();
            
            const requestId = button.dataset.requestId;
            const action = button.dataset.action;
            
            switch(action) {
                case 'approve':
                    approveRequest(requestId);
                    break;
                case 'reject':
                    rejectRequest(requestId);
                    break;
                case 'view':
                    viewRequest(requestId);
                    break;
            }
        });
    }
    
    // Filter requests
    function filterRequests() {
        const statusFilterValue = document.querySelector('.status-filter').value;
        const searchTerm = document.querySelector('.search-box input').value.toLowerCase();
        
        let filtered = allRequests;

        // Main filter state ('all', 'pending', 'processed')
        if (filterState === 'pending') {
            filtered = filtered.filter(request => request.status === 'En attente');
        } else if (filterState === 'processed') {
            filtered = filtered.filter(request => request.status === 'Approuvé' || request.status === 'Refusé');
        }
        
        // Filter by status dropdown
        if (statusFilterValue) {
            const statusMap = {
                'pending': 'En attente',
                'approved': 'Approuvé',
                'rejected': 'Refusé'
            };
            filtered = filtered.filter(request => request.status === statusMap[statusFilterValue]);
        }
        
        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(request => {
                const employee = allEmployees.find(emp => emp.id == request.employeeId);
                return employee && employee.name.toLowerCase().includes(searchTerm);
            });
        }
        
        displayRequests(filtered);
    }

    // Toggle request filter
    function toggleRequestFilter() {
        const filterBtn = document.querySelector('.btn-filter');
        
        if (filterState === 'all') {
            filterState = 'pending';
            filterBtn.innerHTML = '<i class="fa-solid fa-filter-circle-xmark me-2"></i>En attente';
            filterBtn.classList.add('active');
        } else if (filterState === 'pending') {
            filterState = 'processed';
            filterBtn.innerHTML = '<i class="fa-solid fa-filter-circle-check me-2"></i>Traitées';
            filterBtn.classList.add('active');
        } else {
            filterState = 'all';
            filterBtn.innerHTML = '<i class="fa-solid fa-filter me-2"></i>Filtrer';
            filterBtn.classList.remove('active');
        }
        
        filterRequests();
    }
    
    // Approve a request
    async function approveRequest(requestId) {
        try {
            await axios.patch(`http://localhost:3000/requests/${requestId}`, { status: 'Approuvé' });
            const request = allRequests.find(r => r.id == requestId);
            if (request) request.status = 'Approuvé';
            await updateRequestCard(requestId);
        } catch (error) {
            console.error('Erreur lors de l\'approbation de la demande:', error);
        }
    }
    
    // Reject a request
    async function rejectRequest(requestId) {
        try {
            await axios.patch(`http://localhost:3000/requests/${requestId}`, { status: 'Refusé' });
            const request = allRequests.find(r => r.id == requestId);
            if (request) request.status = 'Refusé';
            await updateRequestCard(requestId);
        } catch (error) {
            console.error('Erreur lors du rejet de la demande:', error);
        }
    }
    
    // View a request (can be expanded later)
    function viewRequest(requestId) {
        console.log(`Viewing request ${requestId}`);
        // Placeholder for viewing details, maybe in a modal
    }
    
    // Export data
    function exportData() {
        const csvContent = generateCSV();
        downloadCSV(csvContent, 'demandes_conges.csv');
        showNotification('Données exportées avec succès!', 'success');
    }
    
    // Generate CSV
    function generateCSV() {
        const headers = ['ID', 'Employé', 'Type', 'Date début', 'Date fin', 'Durée', 'Statut', 'Date demande', 'Motif'];
        const rows = allRequests.map(request => {
            const employee = allEmployees.find(emp => emp.id == request.employeeId);
            const duration = calculateDuration(request.startDate, request.endDate);
            
            return [
                request.id,
                employee ? employee.name : 'Inconnu',
                getTypeDisplay(request.type),
                request.startDate,
                request.endDate,
                duration,
                request.status,
                request.requestDate,
                request.reason || ''
            ];
        });
        
        return [headers, ...rows].map(row => 
            row.map(field => `"${field}"`).join(',')
        ).join('\n');
    }
    
    // Download CSV
    function downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }
    
    // Toggle advanced filters
    function toggleAdvancedFilters() {
        showNotification('Filtres avancés - Fonctionnalité à venir', 'info');
    }
    
    // Helper functions
    function getStatusClass(status) {
        switch (status) {
            case 'En attente': return 'pending-card';
            case 'Approuvé': return 'approved-card';
            case 'Refusé': return 'rejected-card';
            default: return 'pending-card';
        }
    }
    
    function getStatusBadgeClass(status) {
        switch (status) {
            case 'En attente': return 'status-pending';
            case 'Approuvé': return 'status-approved';
            case 'Refusé': return 'status-rejected';
            default: return 'status-pending';
        }
    }
    
    function getTypeDisplay(type) {
        const typeMap = {
            'Payé': 'Congés payés',
            'Maladie': 'Congé maladie',
            'Personnel': 'Congé personnel'
        };
        return typeMap[type] || type;
    }
    
    function calculateDuration(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
});

