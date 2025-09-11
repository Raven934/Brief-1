document.addEventListener('DOMContentLoaded', () => {
    /* -------------------- NAVIGATION BUTTONS -------------------- */
    const demandButton = document.getElementById("demand");
    if (demandButton) demandButton.addEventListener("click", () => window.location.href = "../requests/demand.html");

    const leavesButton = document.getElementById("leaves");
    if (leavesButton) leavesButton.addEventListener("click", () => window.location.href = "../myleaves/leaves.html");

    const sliderContainer = document.querySelector('.slider-container');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const indicatorsContainer = document.querySelector('.carousel-indicators-custom');
    const state = { items: [], index: 0, intervalId: null };

    /* -------------------- SLIDER: BUILD SLIDES HTML -------------------- */
    const buildSlidesHTML = items => items.map(a => `
        <div class="notification-slide">
          <div class="notification-box">
            <p><strong>${a.title}</strong></p>
            <p>${a.content}</p>
          </div>
        </div>`).join('');

    /* -------------------- SLIDER: BUILD INDICATORS HTML -------------------- */
    const buildIndicatorsHTML = items => items.map((_, i) => `<button type="button" class="indicator-btn${i===0?' active':''}" data-i="${i}"></button>`).join('');

    /* -------------------- SLIDER: UPDATE ACTIVE SLIDE -------------------- */
    const update = () => {
        if (!state.items.length) return;
        sliderContainer.style.transform = `translateX(-${state.index * 100}%)`;
        indicatorsContainer?.querySelectorAll('.indicator-btn').forEach((b,i) => {
            b.classList.toggle('active', i === state.index);
        });
    };

    /* -------------------- SLIDER: NAVIGATION HELPERS -------------------- */
    const go = n => { state.index = (n + state.items.length) % state.items.length; update(); };
    const next = () => go(state.index + 1);
    const prev = () => go(state.index - 1);

    /* -------------------- SLIDER: WIRE CONTROLS & AUTO PLAY -------------------- */
    const wireControls = () => {
        prevBtn?.addEventListener('click', prev);
        nextBtn?.addEventListener('click', next);
        indicatorsContainer?.addEventListener('click', e => {
            if (e.target.matches('.indicator-btn')) go(+e.target.dataset.i);
        });
        if (state.items.length > 1) state.intervalId = setInterval(next, 5000);
    };

    /* -------------------- SLIDER: RENDER DOM -------------------- */
    const render = () => {
        if (!sliderContainer) return;
        if (!state.items.length) {
            sliderContainer.innerHTML = `<div class="notification-slide"><div class="notification-box"><p style="text-align:center;">Aucune notification pour le moment.</p></div></div>`;
            indicatorsContainer && (indicatorsContainer.innerHTML = '');
            return;
        }
        sliderContainer.style.width = `${state.items.length * 100}%`;
        sliderContainer.innerHTML = buildSlidesHTML(state.items);
        if (indicatorsContainer) indicatorsContainer.innerHTML = buildIndicatorsHTML(state.items);
        update();
    };

    /* -------------------- FETCH: ANNOUNCES -------------------- */
    const loadAnnonces = async () => {
        try {
            const { data } = await axios.get('http://localhost:3000/annonces');
            state.items = data;
            render();
            wireControls();
        } catch (err) {
            console.error('Erreur annonces:', err);
            sliderContainer.innerHTML = `<div class="notification-slide"><div class="notification-box"><p style="color:red;text-align:center;">Impossible de charger les notifications.</p></div></div>`;
        }
    };

    loadAnnonces();

    /* -------------------- LEAVES: DAY DIFFERENCE (INCLUSIVE) -------------------- */
    const dayDiff = (start, end) => {
        const s = new Date(start);
        const e = new Date(end);
        return Math.max(1, Math.round((e - s) / (1000*60*60*24)) + 1);
    };

    /* -------------------- LEAVES: FETCH & UPDATE BALANCE -------------------- */
    const loadLeavesAndUpdateBalance = async () => {
        try {
            const { data: requests } = await axios.get('http://localhost:3000/requests');
            const { data: entitlements } = await axios.get('http://localhost:3000/entitlements');
            const { data: currentUser } = await axios.get('http://localhost:3000/currentUser');
            
            const ENTITLEMENTS = {};
            entitlements.forEach(ent => {
                ENTITLEMENTS[ent.type] = ent.total;
            });

            const currentYear = new Date().getFullYear();
            const currentUserRequests = requests.filter(r => {
                const startDate = new Date(r.startDate);
                return startDate.getFullYear() === currentYear && 
                       r.status === 'Approuvé' && 
                       r.employeeId == 1;
            });

           
            const usage = { 'Payé': 0, 'Maladie': 0, 'Personnel': 0 };
            const leaveStats = { 'Payé': [], 'Maladie': [], 'Personnel': [] };
            
            currentUserRequests.forEach(r => {
                if (usage[r.type] != null) {
                    const days = dayDiff(r.startDate, r.endDate);
                    usage[r.type] += days;
                    leaveStats[r.type].push({
                        startDate: r.startDate,
                        endDate: r.endDate,
                        days: days,
                        reason: r.reason || 'Non spécifié'
                    });
                }
            });

            
            document.querySelectorAll('.balance .leave-type, .balance .leave-type1, .balance .leave-type2, .balance .leave-type3').forEach(block => {
                const title = block.querySelector('h3')?.textContent?.trim();
                if (!title) return;
                let key = null;
                if (title.includes('annuel')) key = 'Payé';
                else if (title.includes('maladie')) key = 'Maladie';
                else if (title.includes('personnel')) key = 'Personnel';
                if (!key || !ENTITLEMENTS[key]) return;

                const total = ENTITLEMENTS[key];
                const used = usage[key];
                const remaining = Math.max(0, total - used);
                const percent = Math.min(100, Math.round((used / total) * 100));

                const progress = block.querySelector('progress');
                if (progress) { progress.max = total; progress.value = used; }
                const daysLeftEl = block.querySelector('.days-left');
                if (daysLeftEl) daysLeftEl.textContent = `${remaining} jours restants`;
                const usageEl = block.querySelector('.usage');
                if (usageEl) usageEl.textContent = `${used}/${total} (${percent}% utilisés)`;
            });

            
            console.log('🏖️ Statistiques des congés pour ' + currentYear + ' (Utilisateur: ' + currentUser.name + '):', {
                totalLeaves: currentUserRequests.length,
                usageByType: usage,
                entitlements: ENTITLEMENTS,
                remainingDays: {
                    'Payé': Math.max(0, ENTITLEMENTS['Payé'] - usage['Payé']),
                    'Maladie': Math.max(0, ENTITLEMENTS['Maladie'] - usage['Maladie']),
                    'Personnel': Math.max(0, ENTITLEMENTS['Personnel'] - usage['Personnel'])
                },
                detailedStats: leaveStats
            });

        } catch (err) { 
            console.error('Erreur solde congés:', err);
           
            const ENTITLEMENTS = { 'Payé': 20, 'Maladie': 10, 'Personnel': 8 };
        }
    };

    loadLeavesAndUpdateBalance();

    /* -------------------- REQUESTS: NUMBER TO ICONS -------------------- */
    const numberToIcons = (n) => String(n).split('').map(d => `<i class="fa-solid fa-${d}" style="color:#006a72;"></i>`).join('');

    /* -------------------- REQUESTS: FETCH & UPDATE COUNTS -------------------- */
    const loadRequestCounts = async () => {
        try {
            const [requestsResponse, currentUserResponse] = await Promise.all([
                axios.get('http://localhost:3000/requests'),
                axios.get('http://localhost:3000/currentUser')
            ]);
            
            const requests = requestsResponse.data || [];
            const currentUser = currentUserResponse.data;
            
           
            // Always focus on employeeId 1
            const currentUserRequests = requests.filter(request => request.employeeId == 1);
            
           
            const currentYear = new Date().getFullYear();
            const currentYearRequests = currentUserRequests.filter(request => {
                if (!request.startDate) return false;
                const requestDate = new Date(request.startDate);
                return requestDate.getFullYear() === currentYear;
            });

            
            let pending = 0, approved = 0, refused = 0, totalThisYear = 0;
            currentYearRequests.forEach(request => {
                totalThisYear++;
                if (request.status === 'En attente') pending++;
                else if (request.status === 'Approuvé') approved++;
                else if (request.status === 'Refusé') refused++;
            });

            
            const numBlocks = document.querySelectorAll('.requests .req .num');
            if (numBlocks[0]) numBlocks[0].innerHTML = numberToIcons(pending);
            if (numBlocks[1]) numBlocks[1].innerHTML = numberToIcons(approved);
            if (numBlocks[2]) numBlocks[2].innerHTML = numberToIcons(refused);

            const headingSubtitle = document.querySelector('.requests .on-going h4');
            if (headingSubtitle) headingSubtitle.textContent = `${pending} en attente`;

            
            console.log('📊 Statistiques des demandes de congés (Dashboard) - Employé #1:', {
                totalThisYear,
                statusBreakdown: { approved, pending, refused },
                userRequests: currentUserRequests,
                currentYearRequests: currentYearRequests
            });

        } catch (err) { 
            console.error('Erreur demandes:', err); 
        }
    };

    loadRequestCounts();

    /* -------------------- COMPREHENSIVE DASHBOARD STATS -------------------- */
    const loadComprehensiveStats = async () => {
        try {
            const [requestsRes, leavesRes, employeesRes] = await Promise.all([
                axios.get('http://localhost:3000/requests'),
                axios.get('http://localhost:3000/leaves'),
                axios.get('http://localhost:3000/employees')
            ]);

            const requests = requestsRes.data;
            const leaves = leavesRes.data;
            const employees = employeesRes.data;

            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth();

         
            const ytdRequests = requests.filter(r => new Date(r.requestDate).getFullYear() === currentYear);
            const ytdLeaves = leaves.filter(l => new Date(l.startDate).getFullYear() === currentYear);

            
            const thisMonthRequests = requests.filter(r => {
                const date = new Date(r.requestDate);
                return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
            });

           
            const employeeRequestCount = {};
            ytdRequests.forEach(r => {
                employeeRequestCount[r.employeeId] = (employeeRequestCount[r.employeeId] || 0) + 1;
            });

            const topEmployees = Object.entries(employeeRequestCount)
                .map(([id, count]) => ({
                    employee: employees.find(e => e.id == id),
                    requestCount: count
                }))
                .filter(item => item.employee)
                .sort((a, b) => b.requestCount - a.requestCount)
                .slice(0, 3);

            
            const approvedCount = ytdRequests.filter(r => r.status === 'Approuvé').length;
            const approvalRate = ytdRequests.length > 0 ? Math.round((approvedCount / ytdRequests.length) * 100) : 0;

           
            const monthlyDistribution = {};
            ytdRequests.forEach(r => {
                const month = new Date(r.requestDate).getMonth();
                monthlyDistribution[month] = (monthlyDistribution[month] || 0) + 1;
            });

            const peakMonth = Object.entries(monthlyDistribution)
                .sort(([,a], [,b]) => b - a)[0];

            const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

            
            const dashboardStats = {
                yearToDate: {
                    totalRequests: ytdRequests.length,
                    totalLeaves: ytdLeaves.length,
                    approvalRate: approvalRate,
                    thisMonthRequests: thisMonthRequests.length
                },
                trends: {
                    peakMonth: peakMonth ? monthNames[peakMonth[0]] : 'N/A',
                    peakMonthCount: peakMonth ? peakMonth[1] : 0,
                    averagePerMonth: Math.round(ytdRequests.length / (currentMonth + 1))
                },
                topEmployees: topEmployees,
                distribution: {
                    byStatus: {
                        approved: ytdRequests.filter(r => r.status === 'Approuvé').length,
                        pending: ytdRequests.filter(r => r.status === 'En attente').length,
                        refused: ytdRequests.filter(r => r.status === 'Refusé').length
                    },
                    byType: {
                        paid: ytdLeaves.filter(l => l.type === 'Payé').length,
                        sick: ytdLeaves.filter(l => l.type === 'Maladie').length,
                        personal: ytdLeaves.filter(l => l.type === 'Personnel').length
                    }
                }
            };

           
            console.log('📈 RAPPORT COMPLET DU TABLEAU DE BORD ' + currentYear + ':', dashboardStats);

           
            const statsDisplayEl = document.querySelector('.comprehensive-stats');
            if (statsDisplayEl) {
                statsDisplayEl.innerHTML = `
                    <div class="stats-summary">
                        <h3>Résumé ${currentYear}</h3>
                        <div class="summary-grid">
                            <div class="summary-item">
                                <strong>${ytdRequests.length}</strong>
                                <span>Demandes totales</span>
                            </div>
                            <div class="summary-item">
                                <strong>${approvalRate}%</strong>
                                <span>Taux d'approbation</span>
                            </div>
                            <div class="summary-item">
                                <strong>${thisMonthRequests.length}</strong>
                                <span>Ce mois-ci</span>
                            </div>
                            <div class="summary-item">
                                <strong>${peakMonth ? monthNames[peakMonth[0]] : 'N/A'}</strong>
                                <span>Mois le plus actif</span>
                            </div>
                        </div>
                    </div>
                `;
            }

        } catch (err) {
            console.error('Erreur statistiques complètes:', err);
        }
    };

    loadComprehensiveStats();

    /* -------------------- EVENTS: FETCH & RENDER UPCOMING -------------------- */
    const loadEvents = async () => {
        const container = document.querySelector('.upcoming-list');
        if (!container) return;
        try {
            const { data: events } = await axios.get('http://localhost:3000/events');
            container.querySelectorAll('.events').forEach(el => el.remove());
            if (!events.length) {
                const empty = document.createElement('div');
                empty.className = 'events';
                empty.innerHTML = '<h3>Aucun congé à venir…</h3>';
                container.appendChild(empty);
                return;
            }
            events.sort((a,b) => new Date(a.startDate) - new Date(b.startDate));
            const now = new Date();
            events.forEach(ev => {
                const start = new Date(ev.startDate);
                const end = new Date(ev.endDate);
                if (end < now) return;
                const div = document.createElement('div');
                div.className = 'events';
                const dateRange = start.toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year: start.getFullYear()!==end.getFullYear()? 'numeric': undefined }) + (end>start? ' – ' + end.toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year: start.getFullYear()!==end.getFullYear()? 'numeric': undefined }): '');
                div.innerHTML = `<h3>${ev.name}</h3><p>${dateRange}</p>`;
                container.appendChild(div);
            });
            if (!container.querySelector('.events')) {
                const empty = document.createElement('div');
                empty.className = 'events';
                empty.innerHTML = '<h3>Aucun congé à venir…</h3>';
                container.appendChild(empty);
            }
        } catch (err) { console.error('Erreur événements:', err); }
    };

    loadEvents();

    /* -------------------- LOAD CURRENT USER -------------------- */
    const loadCurrentUser = async () => {
        try {
            const { data: currentUser } = await axios.get('http://localhost:3000/currentUser');
            
           
            const userNameElements = document.querySelectorAll('.user-name, .current-user-name');
            userNameElements.forEach(el => {
                if (el) el.textContent = currentUser.name;
            });

            const userEmailElements = document.querySelectorAll('.user-email');
            userEmailElements.forEach(el => {
                if (el) el.textContent = currentUser.email;
            });

            const userPositionElements = document.querySelectorAll('.user-position');
            userPositionElements.forEach(el => {
                if (el) el.textContent = currentUser.position;
            });

            console.log('👤 Utilisateur connecté:', currentUser);

        } catch (err) {
            console.error('Erreur chargement utilisateur:', err);
        }
    };
    
    loadCurrentUser();
});