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
            const { data } = await axios.get('http://localhost:4000/annonces');
            state.items = data;
            render();
            wireControls();
        } catch (err) {
            console.error('Erreur annonces:', err);
            sliderContainer.innerHTML = `<div class="notification-slide"><div class="notification-box"><p style="color:red;text-align:center;">Impossible de charger les notifications.</p></div></div>`;
        }
    };

    loadAnnonces();

    const ENTITLEMENTS = { 'Payé': 20, 'Maladie': 10, 'Personnel': 8 };

    /* -------------------- LEAVES: DAY DIFFERENCE (INCLUSIVE) -------------------- */
    const dayDiff = (start, end) => {
        const s = new Date(start);
        const e = new Date(end);
        return Math.max(1, Math.round((e - s) / (1000*60*60*24)) + 1);
    };

    /* -------------------- LEAVES: FETCH & UPDATE BALANCE -------------------- */
    const loadLeavesAndUpdateBalance = async () => {
        try {
            const { data: leaves } = await axios.get('http://localhost:4000/leaves');
            const usage = { 'Payé': 0, 'Maladie': 0, 'Personnel': 0 };
            leaves.forEach(l => {
                if (usage[l.type] != null && l.status === 'Approuvé') usage[l.type] += dayDiff(l.startDate, l.endDate);
            });

            document.querySelectorAll('.balance .leave-type, .balance .leave-type1, .balance .leave-type2, .balance .leave-type3').forEach(block => {
                const title = block.querySelector('h3')?.textContent?.trim();
                if (!title) return;
                let key = null;
                if (title.includes('annuel')) key = 'Payé';
                else if (title.includes('maladie')) key = 'Maladie';
                else if (title.includes('personnel')) key = 'Personnel';
                if (!key) return;

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
        } catch (err) { console.error('Erreur solde congés:', err); }
    };

    loadLeavesAndUpdateBalance();

    /* -------------------- REQUESTS: NUMBER TO ICONS -------------------- */
    const numberToIcons = (n) => String(n).split('').map(d => `<i class="fa-solid fa-${d}" style="color:#006a72;"></i>`).join('');

    /* -------------------- REQUESTS: FETCH & UPDATE COUNTS -------------------- */
    const loadRequestCounts = async () => {
        try {
            const { data: requests } = await axios.get('http://localhost:4000/requests');
            let pending = 0, approved = 0, refused = 0;
            requests.forEach(r => {
                if (r.status === 'En attente') pending++;
                else if (r.status === 'Approuvé') approved++;
                else if (r.status === 'Refusé') refused++;
            });

            const numBlocks = document.querySelectorAll('.requests .req .num');
            if (numBlocks[0]) numBlocks[0].innerHTML = numberToIcons(pending);
            if (numBlocks[1]) numBlocks[1].innerHTML = numberToIcons(approved);
            if (numBlocks[2]) numBlocks[2].innerHTML = numberToIcons(refused);

            const headingSubtitle = document.querySelector('.requests .on-going h4');
            if (headingSubtitle) headingSubtitle.textContent = `${pending} en attente`;
        } catch (err) { console.error('Erreur demandes:', err); }
    };

    loadRequestCounts();

    /* -------------------- EVENTS: FETCH & RENDER UPCOMING -------------------- */
    const loadEvents = async () => {
        const container = document.querySelector('.upcoming-list');
        if (!container) return;
        try {
            const { data: events } = await axios.get('http://localhost:4000/events');
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
            const data = await axios.get('http://localhost:4000/notifications').then(r=>r.data);
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
    // Using icon avatar, no initials element

    const loadCurrentUser = async () => {
        try {
            const users = await axios.get('http://localhost:4000/employees').then(r=>r.data);
            const user = users[0];
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
});