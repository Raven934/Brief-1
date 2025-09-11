/* -------------------- NOTIFICATION BUTTON & PANEL -------------------- */
    const notifBtn = document.getElementById('notifBtn');
    const notifPanel = document.getElementById('notifPanel');
    const notifList = document.getElementById('notifList');
    const notifBadge = document.getElementById('notifBadge');
    const markAllBtn = document.getElementById('markAllRead');
    let notifData = [];

    const timeAgo = iso => {
        const d = new Date(iso || Date.now());
        const diff = Date.now() - d.getTime();
        const sec = Math.floor(diff/1000); if (sec<60) return 'Maintenant';
        const min = Math.floor(sec/60); if (min<60) return `Il y a ${min} min`;
        const hr = Math.floor(min/60); if (hr<24) return `Il y a ${hr} h`;
        const day = Math.floor(hr/24); return day===1? 'Hier': `Il y a ${day} j`;
    };
    const renderNotifications = () => {
        if (!notifList) return;
        notifList.innerHTML = '';
        if (!notifData.length) {
            notifList.innerHTML = '<li><div class="notif-item"><div class="notif-text"><p>Aucune notification.</p></div></div></li>';
        } else {
            notifData.forEach(n => {
                const li = document.createElement('li');
                li.innerHTML = `
                  <div class="notif-item ${n.read? '':'unread'}" data-id="${n.id}">
                    <div class="icon"><i class="fa-solid ${n.read? 'fa-envelope-open':'fa-envelope'}"></i></div>
                    <div class="notif-text">
                      <h6>${n.message.split('.')[0] || 'Notification'}</h6>
                      <p>${n.message}</p>
                      <div class="notif-meta"><span>${timeAgo(n.date)}</span><span>${n.read? 'Lu':'Nouveau'}</span></div>
                    </div>
                  </div>`;
                notifList.appendChild(li);
            });
        }
        const unread = notifData.filter(n=>!n.read).length;
        if (notifBadge) {
            if (unread>0){ notifBadge.textContent = unread; notifBadge.hidden = false; } else { notifBadge.hidden = true; }
        }
    };

    const loadNotifications = async () => {
        try {
            const data = await axios.get('http://localhost:3000/notifications').then(r=>r.data);
            notifData = data.map(n=> ({...n, date: n.date || new Date().toISOString()})).sort((a,b)=> new Date(b.date)-new Date(a.date));
            renderNotifications();
        } catch (e) { console.error('Erreur notifications:', e); }
    };

    const togglePanel = () => {
        if (!notifPanel) return;
        const open = notifPanel.hidden;
        notifPanel.hidden = !open;
        notifBtn?.setAttribute('aria-expanded', String(open));
    };

    notifBtn?.addEventListener('click', e => { e.stopPropagation(); togglePanel(); });
    document.addEventListener('click', e => {
        if (!notifPanel || notifPanel.hidden) return;
        if (!notifPanel.contains(e.target) && e.target !== notifBtn) notifPanel.hidden = true;
    });

    notifList?.addEventListener('click', e => {
        const item = e.target.closest('.notif-item');
        if (!item) return;
        const id = +item.dataset.id;
        const n = notifData.find(x=>x.id===id);
        if (n && !n.read) { n.read = true; renderNotifications(); }
    });

    markAllBtn?.addEventListener('click', ()=>{
        notifData.forEach(n=> n.read = true);
        renderNotifications();
    });

    loadNotifications();
    
    /* -------------------- AVATAR PANEL (CUSTOM) -------------------- */
    const avatarBtn = document.getElementById('avatarBtn');
    const avatarPanel = document.getElementById('avatarPanel');
    const avatarNameEl = document.getElementById('avatarName');
    const avatarEmailEl = document.getElementById('avatarEmail');
    const avatarMenu = document.getElementById('avatarMenu');
   

    const loadCurrentUser = async () => {
        try {
            const user = await axios.get('http://localhost:3000/currentUser').then(r=>r.data);
            if (user) {
                avatarNameEl && (avatarNameEl.textContent = user.name);
                avatarEmailEl && (avatarEmailEl.textContent = user.email);
                const circle = avatarPanel?.querySelector('.avatar-circle');
                if (circle) circle.innerHTML = '<i class="fa-solid fa-user"></i>';
            }
        } catch(e){ console.error('Erreur chargement utilisateur:', e); }
    };

    const toggleAvatarPanel = () => {
        if (!avatarPanel) return;
        const open = avatarPanel.hidden;
        avatarPanel.hidden = !open;
        avatarBtn?.setAttribute('aria-expanded', String(open));
    };

    avatarBtn?.addEventListener('click', e => { e.stopPropagation(); toggleAvatarPanel(); });
    document.addEventListener('click', e => {
        if (!avatarPanel || avatarPanel.hidden) return;
        if (!avatarPanel.contains(e.target) && e.target !== avatarBtn) avatarPanel.hidden = true;
    });

    avatarMenu?.addEventListener('click', e => {
        const li = e.target.closest('li');
        if (!li) return;
        if (avatarPanel) avatarPanel.hidden = true; 
    });

    loadCurrentUser();

    /* -------------------- DYNAMIC NAVBAR & LOGOUT -------------------- */
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            const response = await axios.get('http://localhost:3000/currentUser');
            const currentUser = response.data;

            if (!currentUser || Object.keys(currentUser).length === 0) {
                // If no user is logged in, redirect to login page
                if (!window.location.pathname.includes('login.html')) {
                    window.location.href = '/login.html';
                }
                return;
            }

            const nav = document.querySelector('nav');
            if (nav) {
                if (currentUser.role === 'admin') {
                    nav.innerHTML = `
                        <a href="/admin/admin.html" class="${window.location.pathname.includes('admin.html') ? 'active' : ''}">Administration</a>
                    `;
                } else {
                    nav.innerHTML = `
                        <a href="/dashboard/dashboard.html" class="${window.location.pathname.includes('dashboard.html') ? 'active' : ''}">Tableau de bord</a>
                        <a href="/myleaves/leaves.html" class="${window.location.pathname.includes('leaves.html') ? 'active' : ''}">Mes Congés</a>
                        <a href="/requests/demand.html" class="${window.location.pathname.includes('demand.html') ? 'active' : ''}">Nouvelle Demande</a>
                    `;
                }
            }

            const logoutButton = document.getElementById('logout');
            if (logoutButton) {
                logoutButton.addEventListener('click', async () => {
                    try {
                        // Reset currentUser on the server to a guest state
                        await axios.put('http://localhost:3000/currentUser', { id: null, role: 'guest' });
                        // Redirect to login page
                        window.location.href = '/login.html';
                    } catch (error) {
                        console.error('Erreur lors de la déconnexion:', error);
                    }
                });
            }

        } catch (error) {
            console.error('Erreur lors de la vérification de l\'utilisateur:', error);
            // If there's an error fetching the user (e.g., server down), redirect to login
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = '/login.html';
            }
        }
    });
