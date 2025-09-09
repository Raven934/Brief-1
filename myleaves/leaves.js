document.addEventListener('DOMContentLoaded', async () => {
    
    /* -------------------- LOAD LEAVE STATISTICS -------------------- */
    const loadLeaveStatistics = async () => {
        try {
            
            const [currentUserRes, requestsRes] = await Promise.all([
                axios.get('http://localhost:3000/currentUser'),
                axios.get('http://localhost:3000/requests')
            ]);

            const currentUser = currentUserRes.data;
            const allRequests = requestsRes.data;
            const currentYear = new Date().getFullYear();

            console.log('loadLeaveStatistics - currentUser:', currentUser);
            console.log('loadLeaveStatistics - allRequests:', allRequests);

            
            const userRequestsThisYear = allRequests.filter(request => {
                const requestYear = new Date(request.startDate).getFullYear();
                console.log('Checking request:', request.id, 'employeeId:', request.employeeId, 'vs currentUser.id:', currentUser.id);
                return request.employeeId == currentUser.id && requestYear === currentYear; // Use == for loose comparison
            });

            console.log('loadLeaveStatistics - Found userRequestsThisYear:', userRequestsThisYear.length, userRequestsThisYear);

            const stats = {
                total: userRequestsThisYear.length,
                pending: userRequestsThisYear.filter(request => request.status === 'En attente').length,
                approved: userRequestsThisYear.filter(request => request.status === 'Approuvé').length,
                rejected: userRequestsThisYear.filter(request => request.status === 'Refusé').length
            };

         
            const totalLeavesEl = document.getElementById('totalLeaves');
            const pendingLeavesEl = document.getElementById('pendingLeaves');
            const approvedLeavesEl = document.getElementById('approvedLeaves');
            const rejectedLeavesEl = document.getElementById('rejectedLeaves');

            if (totalLeavesEl) totalLeavesEl.textContent = stats.total;
            if (pendingLeavesEl) pendingLeavesEl.textContent = stats.pending;
            if (approvedLeavesEl) approvedLeavesEl.textContent = stats.approved;
            if (rejectedLeavesEl) rejectedLeavesEl.textContent = stats.rejected;

            
            animateCounters();

            console.log('📊 Statistiques des congés de ' + currentUser.name + ' pour ' + currentYear + ':', {
                totalDemandes: stats.total,
                enAttente: stats.pending,
                approuvées: stats.approved,
                refusées: stats.rejected,
                détails: userRequestsThisYear
            });

            return { stats, userRequestsThisYear, currentUser };

        } catch (error) {
            console.error('Erreur lors du chargement des statistiques:', error);
            
        
            const statNumbers = document.querySelectorAll('.stat-number');
            statNumbers.forEach(el => {
                if (el.id) el.textContent = '—';
            });
        }
    };

    /* -------------------- ANIMATE COUNTERS -------------------- */
    const animateCounters = () => {
        const counters = document.querySelectorAll('.stat-number');
        
        counters.forEach(counter => {
            const target = parseInt(counter.textContent);
            if (isNaN(target)) return;
            
            counter.textContent = '0';
            
            const increment = target / 20; 
            let current = 0;
            
            const timer = setInterval(() => {
                current += increment;
                
                if (current >= target) {
                    counter.textContent = target;
                    clearInterval(timer);
                } else {
                    counter.textContent = Math.floor(current);
                }
            }, 50); 
        });
    };

    /* -------------------- LOAD AND DISPLAY RECENT LEAVES TABLE -------------------- */
    const loadRecentLeaves = async () => {
        try {
            const [currentUserRes, requestsRes, employeesRes] = await Promise.all([
                axios.get('http://localhost:3000/currentUser'),
                axios.get('http://localhost:3000/requests'),
                axios.get('http://localhost:3000/employees')
            ]);

            const currentUser = currentUserRes.data;
            const allRequests = requestsRes.data;
            const employees = employeesRes.data;

            const userRequests = allRequests
                .filter(request => {
                    console.log('Checking request:', request.id, 'employeeId:', request.employeeId, 'currentUser.id:', currentUser.id);
                    return request.employeeId == currentUser.id; // Use == for loose comparison
                })
                .sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate))
                .slice(0, 10); 

            console.log('Found userRequests:', userRequests.length, userRequests);

            
            const tableBody = document.querySelector('.requests-table tbody');
            if (tableBody) {
                tableBody.innerHTML = '';

                if (userRequests.length === 0) {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="6" style="text-align: center; padding: 2rem; color: #666;">
                                <i class="fa-solid fa-inbox" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                                Aucune demande de congé trouvée
                            </td>
                        </tr>
                    `;
                } else {
                    userRequests.forEach(request => {
                        const startDate = new Date(request.startDate);
                        const endDate = new Date(request.endDate);
                        const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                        
                      
                        const typeDisplayNames = {
                            'Payé': 'Congé annuel',
                            'Maladie': 'Congé maladie', 
                            'Personnel': 'Congé personnel'
                        };
                        
                        const displayType = typeDisplayNames[request.type] || request.type;
                        
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>LR${request.id.toString().padStart(3, '0')}</td>
                            <td>${displayType}</td>
                            <td>
                                ${startDate.toLocaleDateString('fr-FR')} - ${endDate.toLocaleDateString('fr-FR')}
                            </td>
                            <td>${days} jour${days > 1 ? 's' : ''}</td>
                            <td>
                                <span class="status ${request.status === 'Approuvé' ? 'approved' : request.status === 'En attente' ? 'pending' : 'rejected'}">
                                    ${request.status === 'Approuvé' ? 'Approuvée' : request.status}
                                </span>
                            </td>
                            <td class="actions">
                                <div class="action-buttons" style="display: flex; gap: 0.5rem; justify-content: center;">
                                    <button class="action-btn modify-btn" title="Modifier" 
                                            onclick="modifyRequest('LR${request.id.toString().padStart(3, '0')}')"
                                            ${request.status === 'Approuvé' ? 'disabled' : ''}>
                                        <i class="fa-solid fa-pen-to-square"></i>
                                    </button>
                                    <button class="action-btn delete-btn" title="Supprimer" 
                                            onclick="deleteRequest('LR${request.id.toString().padStart(3, '0')}')">
                                        <i class="fa-solid fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        `;
                        tableBody.appendChild(row);
                    });
                }
            }

        } catch (error) {
            console.error('Erreur lors du chargement des congés récents:', error);
        }
    };

    /* -------------------- VIEW LEAVE DETAILS -------------------- */
    window.viewLeaveDetails = (leaveId) => {
        console.log('Affichage des détails du congé:', leaveId);
        
        const numericId = parseInt(leaveId.replace('LR', ''));
        showLeaveDetailsModal(numericId);
    };

    /* -------------------- SHOW LEAVE DETAILS MODAL -------------------- */
    const showLeaveDetailsModal = async (leaveId) => {
        try {
            const { data: leaves } = await axios.get('http://localhost:3000/leaves');
            const leave = leaves.find(l => l.id === leaveId);
            
            if (!leave) {
                console.error('Congé non trouvé');
                return;
            }

            const startDate = new Date(leave.startDate).toLocaleDateString('fr-FR');
            const endDate = new Date(leave.endDate).toLocaleDateString('fr-FR');
            const days = Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1;

            const typeDisplayNames = {
                'Payé': 'Congé annuel',
                'Maladie': 'Congé maladie', 
                'Personnel': 'Congé personnel'
            };

           
            const modalHTML = `
                <div class="modal-overlay" id="leaveModal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Détails du congé LR${leaveId.toString().padStart(3, '0')}</h3>
                            <button class="modal-close" onclick="closeModal()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="detail-row">
                                <strong>Type de congé:</strong> ${typeDisplayNames[leave.type] || leave.type}
                            </div>
                            <div class="detail-row">
                                <strong>Période:</strong> ${startDate} - ${endDate}
                            </div>
                            <div class="detail-row">
                                <strong>Durée:</strong> ${days} jour${days > 1 ? 's' : ''}
                            </div>
                            <div class="detail-row">
                                <strong>Statut:</strong> 
                                <span class="status ${leave.status === 'Approuvé' ? 'approved' : leave.status === 'En attente' ? 'pending' : 'rejected'}">
                                    ${leave.status === 'Approuvé' ? 'Approuvée' : leave.status}
                                </span>
                            </div>
                            <div class="detail-row">
                                <strong>Date de demande:</strong> ${new Date(leave.requestDate).toLocaleDateString('fr-FR')}
                            </div>
                            ${leave.reason ? `<div class="detail-row"><strong>Motif:</strong> ${leave.reason}</div>` : ''}
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" onclick="closeModal()">Fermer</button>
                        </div>
                    </div>
                </div>
            `;

           
            document.body.insertAdjacentHTML('beforeend', modalHTML);

        } catch (error) {
            console.error('Erreur lors du chargement des détails:', error);
        }
    };

    /* -------------------- CLOSE MODAL -------------------- */
    window.closeModal = () => {
        const modal = document.getElementById('leaveModal');
        if (modal) {
            modal.remove();
        }
    };

    /* -------------------- MODIFY REQUEST -------------------- */
    window.modifyRequest = async (requestId) => {
        console.log('Modification de la demande:', requestId);
        
        const targetId = requestId.replace('LR', '').replace(/^0+/, ''); 
        
        try {
            const { data: requests } = await axios.get('http://localhost:3000/requests');
            console.log('All requests:', requests);
            console.log('Looking for ID:', targetId);
            
            
            const request = requests.find(r => {
                console.log('Comparing:', r.id, 'with', targetId);
                return r.id == targetId || r.id === targetId || r.id === parseInt(targetId);
            });
            
            console.log('Found request:', request);
            
            if (!request) {
                showNotification('Congé non trouvé', 'error');
                return;
            }

        
            if (request.status === 'Approuvé') {
                showNotification('Impossible de modifier un congé déjà approuvé', 'warning');
                return;
            }

            
            showModifyModal(request, targetId);

        } catch (error) {
            console.error('Erreur lors de la modification:', error);
            showNotification('Erreur lors du chargement des données', 'error');
        }
    };

    /* -------------------- SHOW MODIFY MODAL -------------------- */
    const showModifyModal = (request, requestId) => {
        const modalHTML = `
            <div class="modal-overlay" id="modifyModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Modifier le congé LR${request.id.toString().padStart(3, '0')}</h3>
                        <button class="modal-close" onclick="closeModifyModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="modifyForm">
                            <div class="form-group">
                                <label for="modifyType">Type de congé:</label>
                                <select id="modifyType" required>
                                    <option value="Payé" ${request.type === 'Payé' ? 'selected' : ''}>Congé annuel</option>
                                    <option value="Maladie" ${request.type === 'Maladie' ? 'selected' : ''}>Congé maladie</option>
                                    <option value="Personnel" ${request.type === 'Personnel' ? 'selected' : ''}>Congé personnel</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="modifyStartDate">Date de début:</label>
                                <input type="date" id="modifyStartDate" value="${request.startDate}" required>
                            </div>
                            <div class="form-group">
                                <label for="modifyEndDate">Date de fin:</label>
                                <input type="date" id="modifyEndDate" value="${request.endDate}" required>
                            </div>
                            <div class="form-group">
                                <label for="modifyReason">Motif (optionnel):</label>
                                <textarea id="modifyReason" rows="3" placeholder="Motif de la demande...">${request.reason || ''}</textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="closeModifyModal()">Annuler</button>
                        <button class="btn-primary" onclick="saveModification('${requestId}')">Enregistrer</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    };

    /* -------------------- CLOSE MODIFY MODAL -------------------- */
    window.closeModifyModal = () => {
        const modal = document.getElementById('modifyModal');
        if (modal) {
            modal.remove();
        }
    };

    /* -------------------- SAVE MODIFICATION -------------------- */
    window.saveModification = async (requestId) => {
        try {
            const type = document.getElementById('modifyType').value;
            const startDate = document.getElementById('modifyStartDate').value;
            const endDate = document.getElementById('modifyEndDate').value;
            const reason = document.getElementById('modifyReason').value;

          
            if (new Date(startDate) > new Date(endDate)) {
                showNotification('La date de début doit être antérieure à la date de fin', 'error');
                return;
            }

            
            const updateData = {
                type,
                startDate,
                endDate,
                reason,
                status: 'En attente' 
            };

            console.log('Updating request with ID:', requestId);
            const response = await axios.patch(`http://localhost:3000/requests/${requestId}`, updateData);

            if (response.status === 200) {
                
                const targetRequestId = `LR${requestId.toString().padStart(3, '0')}`;
                const tableRow = document.querySelector(`button[onclick="modifyRequest('${targetRequestId}')"]`);
                if (tableRow) {
                    const row = tableRow.closest('tr');
                    if (row) {
                        const cells = row.querySelectorAll('td');
                        const startDateFormatted = new Date(startDate).toLocaleDateString('fr-FR');
                        const endDateFormatted = new Date(endDate).toLocaleDateString('fr-FR');
                        const daysDiff = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
                        
                        
                        const typeDisplayNames = {
                            'Payé': 'Congé annuel',
                            'Maladie': 'Congé maladie', 
                            'Personnel': 'Congé personnel'
                        };
                        
                        const displayType = typeDisplayNames[type] || type;
                        
                       
                        if (cells[1]) cells[1].textContent = displayType;
                        if (cells[2]) cells[2].textContent = `${startDateFormatted} - ${endDateFormatted}`;
                        if (cells[3]) cells[3].textContent = `${daysDiff} jour${daysDiff > 1 ? 's' : ''}`;
                        if (cells[4]) cells[4].innerHTML = `<span class="status pending">En attente</span>`;
                        
                        
                        row.style.transition = 'background-color 0.5s ease';
                        row.style.backgroundColor = '#e8f5e8';
                        setTimeout(() => {
                            row.style.backgroundColor = '';
                        }, 1000);
                    }
                }
                
                
                await updateStatisticsOnly();
                
                showNotification('Congé modifié avec succès', 'success');
                closeModifyModal();
            }

        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            showNotification('Erreur lors de la sauvegarde', 'error');
        }
    };

    /* -------------------- DELETE REQUEST -------------------- */
    window.deleteRequest = async (requestId) => {
        console.log('Suppression de la demande:', requestId);
        
    
        const numericId = parseInt(requestId.replace('LR', ''));
        
       
        const confirmHTML = `
            <div class="modal-overlay" id="confirmModal">
                <div class="modal-content confirm-modal">
                    <div class="modal-header">
                        <h3>Confirmer la suppression</h3>
                    </div>
                    <div class="modal-body">
                        <p>Êtes-vous sûr de vouloir supprimer la demande ${requestId} ?</p>
                        <p class="warning-text">Cette action est irréversible.</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="closeConfirmModal()">Annuler</button>
                        <button class="btn-danger" onclick="confirmDelete(${numericId})">Supprimer</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', confirmHTML);
    };

    /* -------------------- CLOSE CONFIRM MODAL -------------------- */
    window.closeConfirmModal = () => {
        const modal = document.getElementById('confirmModal');
        if (modal) {
            modal.remove();
        }
    };

    /* -------------------- CONFIRM DELETE -------------------- */
    window.confirmDelete = async (leaveId) => {
        try {
            const response = await axios.delete(`http://localhost:3000/requests/${leaveId}`);
            
            if (response.status === 200) {
            
                const tableRow = document.querySelector(`button[onclick="deleteRequest('LR${leaveId.toString().padStart(3, '0')}')"]`);
                if (tableRow) {
                    const row = tableRow.closest('tr');
                    if (row) {
                        row.style.transition = 'opacity 0.3s ease';
                        row.style.opacity = '0';
                        setTimeout(() => row.remove(), 300);
                    }
                }
                
                
                await updateStatisticsOnly();
                
                showNotification('Demande supprimée avec succès', 'success');
                closeConfirmModal();
            }

        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            showNotification('Erreur lors de la suppression', 'error');
        }
    };

    /* -------------------- UPDATE STATISTICS ONLY -------------------- */
    const updateStatisticsOnly = async () => {
        try {
            const [currentUserRes, requestsRes] = await Promise.all([
                axios.get('http://localhost:3000/currentUser'),
                axios.get('http://localhost:3000/requests')
            ]);

            const currentUser = currentUserRes.data;
            const allRequests = requestsRes.data;
            const currentYear = new Date().getFullYear();

            
            const userRequestsThisYear = allRequests.filter(request => {
                const requestYear = new Date(request.startDate).getFullYear();
                return request.employeeId === currentUser.id && requestYear === currentYear;
            });

            
            const stats = {
                total: userRequestsThisYear.length,
                pending: userRequestsThisYear.filter(request => request.status === 'En attente').length,
                approved: userRequestsThisYear.filter(request => request.status === 'Approuvé').length,
                rejected: userRequestsThisYear.filter(request => request.status === 'Refusé').length
            };

            
            const totalLeavesEl = document.getElementById('totalLeaves');
            const pendingLeavesEl = document.getElementById('pendingLeaves');
            const approvedLeavesEl = document.getElementById('approvedLeaves');
            const rejectedLeavesEl = document.getElementById('rejectedLeaves');

            if (totalLeavesEl) animateCounter(totalLeavesEl, stats.total);
            if (pendingLeavesEl) animateCounter(pendingLeavesEl, stats.pending);
            if (approvedLeavesEl) animateCounter(approvedLeavesEl, stats.approved);
            if (rejectedLeavesEl) animateCounter(rejectedLeavesEl, stats.rejected);

        } catch (error) {
            console.error('Erreur lors de la mise à jour des statistiques:', error);
        }
    };

    /* -------------------- ANIMATE COUNTER -------------------- */
    const animateCounter = (element, target) => {
        const start = parseInt(element.textContent) || 0;
        const increment = target > start ? 1 : -1;
        const timer = setInterval(() => {
            const current = parseInt(element.textContent);
            if (current !== target) {
                element.textContent = current + increment;
            } else {
                clearInterval(timer);
            }
        }, 50);
    };

    /* -------------------- SHOW NOTIFICATION -------------------- */
    const showNotification = (message, type = 'info') => {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fa-solid ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">&times;</button>
        `;

        document.body.appendChild(notification);

      
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    };

    /* -------------------- LOAD LEAVE TYPE BREAKDOWN -------------------- */
    const loadLeaveTypeBreakdown = async () => {
        try {
            const { stats, userRequestsThisYear } = await loadLeaveStatistics();
            
           
            const typeBreakdown = {};
            userRequestsThisYear.forEach(request => {
                if (request.status === 'Approuvé') {
                    typeBreakdown[request.type] = (typeBreakdown[request.type] || 0) + 1;
                }
            });

            console.log('📈 Répartition par type de congé (approuvés):', typeBreakdown);

        } catch (error) {
            console.error('Erreur breakdown par type:', error);
        }
    };

    /* -------------------- INITIALIZE PAGE -------------------- */
    const initializePage = async () => {
        console.log('🚀 Initialisation de la page Mes Congés...');
        
       
        await Promise.all([
            loadLeaveStatistics(),
            loadRecentLeaves(),
            loadLeaveTypeBreakdown()
        ]);

        console.log('✅ Page Mes Congés initialisée avec succès');
    };


    initializePage();

    /* -------------------- REFRESH DATA PERIODICALLY -------------------- */
    setInterval(() => {
        loadLeaveStatistics();
        loadRecentLeaves();
    }, 30000);

});
