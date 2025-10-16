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
    const buildIndicatorsHTML = items => items.map((_, i) => `<button type="button" class="indicator-btn${i === 0 ? ' active' : ''}" data-i="${i}"></button>`).join('');

    /* -------------------- SLIDER: UPDATE ACTIVE SLIDE -------------------- */
    const update = () => {
        if (!state.items.length) return;
        sliderContainer.style.transform = `translateX(-${state.index * 100}%)`;
        indicatorsContainer?.querySelectorAll(".indicator-btn").forEach((b, i) => {
            b.classList.toggle('active', i === state.index);
        });
    };

    /* -------------------- SLIDER: NAVIGATION HELPERS -------------------- */
    const go = n => {
        state.index = (n + state.items.length) % state.items.length;
        update();
    };

    /* -------------------- SLIDER: RENDER -------------------- */
    const render = () => {
        if (!state.items.length) {
            sliderContainer.innerHTML = `<div class="notification-slide"><div class="notification-box"><p style="text-align:center;">Aucune notification pour le moment.</p></div></div>`;
            if (indicatorsContainer) indicatorsContainer.innerHTML = "";
            return;
        }
        sliderContainer.style.width = `${state.items.length * 100}%`;
        sliderContainer.innerHTML = buildSlidesHTML(state.items);
        if (indicatorsContainer) indicatorsContainer.innerHTML = buildIndicatorsHTML(state.items);
        update();
    };

    /* -------------------- SLIDER: WIRE CONTROLS -------------------- */
    const wireControls = () => {
        if (prevBtn) prevBtn.addEventListener('click', () => go(state.index - 1));
        if (nextBtn) nextBtn.addEventListener('click', () => go(state.index + 1));
        if (indicatorsContainer) {
            indicatorsContainer.addEventListener('click', e => {
                if (e.target.classList.contains('indicator-btn')) {
                    go(Number(e.target.dataset.i));
                }
            });
        }
    };

    /* -------------------- FETCH: ANNOUNCES -------------------- */
    const loadAnnonces = async () => {
        try {
            const { data } = await axios.get('http://localhost:3000/annonces');
            state.items = data;
            render();
            wireControls();
        } catch (err) {
            console.error("Erreur annonces:", err);
            sliderContainer.innerHTML = `<div class="notification-slide"><div class="notification-box"><p style="color:red;text-align:center;">Impossible de charger les notifications.</p></div></div>`;
        }
    };
    loadAnnonces();

    /* -------------------- LEAVES: DAY DIFFERENCE (INCLUSIVE) -------------------- */
    // Helper to calculate the number of days between two dates (inclusive)
    const dayDiff = (start, end) => {
        const s = new Date(start);
        const e = new Date(end);
        return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
    };

    const loadLeavesAndUpdateBalance = async () => {
        try {
            const { data: requests } = await axios.get("http://localhost:3000/requests");
            const { data: entitlements } = await axios.get("http://localhost:3000/entitlements");
            const { data: currentUser } = await axios.get("http://localhost:3000/currentUser");

            const entitlementsMap = {};
            entitlements.forEach(ent => {
                entitlementsMap[ent.type] = ent.total;
            });
            const currentUserRequests = requests.filter(r => {
                return r.status === "Approuvé" &&
                    r.employeeId == currentUser.id;
            });

            const usage = { 'Payé': 0, 'Maladie': 0, 'Personnel': 0 };
            currentUserRequests.forEach(r => {
                if (usage[r.type] != null) {
                    const days = dayDiff(r.startDate, r.endDate);
                    usage[r.type] += days;
                  }
            });
            document.querySelectorAll('.balance .leave-type, .balance .leave-type1, .balance .leave-type2, .balance .leave-type3').forEach(block =>{
                const title=block.querySelector('h3')?.textContent?.trim();
                if(!title) return;
                let key = null;
                if (title.includes('annuel')) key = 'Payé';
                else if (title.includes('maladie')) key = 'Maladie';
                else if (title.includes('personnel')) key = 'Personnel';
                if (!key || !entitlementsMap[key]) return;

                const total = entitlementsMap[key];
                const used = usage[key]; 
                const remaining = Math.max(0, total - used); 
                const percent = Math.min(100, Math.round((used / total) * 100)); 
                const progress = block.querySelector('progress');
                if (progress){progress.max=total; progress.value=used}
                const daysLeftEl= block.querySelector('.days-left');
                if (daysLeftEl) daysLeftEl.textContent=`${remaining} jours restants`
                const usageEl= block.querySelector('.usage');
                if (usageEl) usageEl.textContent= `${used}/${total} (${percent}% utilisés)`

            })

        }catch(err){
            console.error('Erreur solde congés:', err)
        }
    };
loadLeavesAndUpdateBalance()
 /* -------------------- REQUESTS: NUMBER TO ICONS -------------------- */
const numberToIcons= (n)=> String(n).split('').map(d=>`<i class="fa-solid fa-${d}" style="color:#006a72;"></i>`).join('');
/* -------------------- REQUESTS: FETCH & UPDATE COUNTS -------------------- */
const loadRequestCounts= async ()=>{
    try{
        const[requestsResponse, currentUserResponse]= await Promise.all([ 
            axios.get('http://localhost:3000/requests'),
            axios.get('http://localhost:3000/currentUser')
        ])
        const requests=requestsResponse.data || [];
        const currentUser= currentUserResponse.data;
        const currentUserRequests=requests.filter(request => request.employeeId==currentUser.id);
        
       let pending = 0, approved = 0, refused = 0, totalThisYear = 0
       currentUserRequests.forEach(request=>{
        if (request.status==='En attente') pending++;
        else if (request.status==='Approuvé') approved++;
        else if (request.status==='Refusé') refused++;
       })
       const numBlocks = document.querySelectorAll('.requests .req .num');
            if (numBlocks[0]) numBlocks[0].innerHTML = numberToIcons(pending);
            if (numBlocks[1]) numBlocks[1].innerHTML = numberToIcons(approved);
            if (numBlocks[2]) numBlocks[2].innerHTML = numberToIcons(refused);

            const headingSubtitle = document.querySelector('.requests .on-going h4');
            if (headingSubtitle) headingSubtitle.textContent = `${pending} en attente`;
    }catch (err) { 
            console.error('Erreur demandes:', err); // Log error
        }
} 
 loadRequestCounts();
      /* -------------------- EVENTS: FETCH & RENDER UPCOMING -------------------- */

    const loadEvents= async ()=>{
       const container=document.querySelector('.upcoming-list');
       if (!container) return;
       try{
        const {data:events}=await axios.get('http://localhost:3000/events');
        container.querySelectorAll('.events').forEach(el=>el.remove());
        if(!events.length){
            const empty=document.createElement('div');
            empty.className= 'events'
            empty.innerHTML= '<h3>Aucun congé à venir…</h3>';
            container.appendChild(empty);
            return;
        }
        events.sort((a,b) => new Date(a.startDate) - new Date(b.startDate)); // Sort by start date
            const now = new Date();
            events.forEach(ev => {
                const start = new Date(ev.startDate);
                const end = new Date(ev.endDate);
                if (end < now) return; // Skip past events
                const div = document.createElement('div');
                div.className = 'events';
                const dateRange = start.toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year: start.getFullYear()!==end.getFullYear()? 'numeric': undefined }) + (end>start? ' – ' + end.toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year: start.getFullYear()!==end.getFullYear()? 'numeric': undefined }): '');
                div.innerHTML = `<h3>${ev.name}</h3><p>${dateRange}</p>`; // Event name and date
                container.appendChild(div);
            });
            if (!container.querySelector('.events')) {
                const empty = document.createElement('div');
                empty.className = 'events';
                empty.innerHTML = '<h3>Aucun congé à venir…</h3>'; // No events message
                container.appendChild(empty);
            }
        } catch (err) { console.error('Erreur événements:', err); } // Log error
    };
    loadEvents()

    /* -------------------- LOAD CURRENT USER -------------------- */
    if (typeof loadCurrentUser === 'function') loadCurrentUser();
});