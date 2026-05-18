// app.js - Main Application Logic

document.addEventListener('DOMContentLoaded', () => {

    store.seedFakeDataIfNeeded();

    // =============== DOM ELEMENTS ===============
    const navbar = document.getElementById('navbar');
    const userDisplay = document.getElementById('user-display');
    const views = {
        auth: document.getElementById('view-auth'),
        dashboard: document.getElementById('view-dashboard'),
        admin: document.getElementById('view-admin')
    };

    // Nav Buttons
    const navBtns = {
        dashboard: document.getElementById('nav-dashboard'),
        admin: document.getElementById('nav-admin'),
        logout: document.getElementById('btn-logout')
    };

    // Auth Form
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const btnLogin = document.getElementById('btn-login');
    const btnRegister = document.getElementById('btn-register');
    const authError = document.getElementById('auth-error');
    
    // Quick Login
    const authForm = document.getElementById('auth-form');
    const quickLoginContainer = document.getElementById('quick-login-container');
    const quickLoginEmail = document.getElementById('quick-login-email');
    const btnQuickLogin = document.getElementById('btn-quick-login');
    const btnShowNormalLogin = document.getElementById('btn-show-normal-login');

    // Matches
    const matchesContainer = document.getElementById('matches-container');
    const myPointsEl = document.getElementById('my-points');
    const stageFilter = document.getElementById('stage-filter');

    // Admin
    const adminAddMatchForm = document.getElementById('admin-add-match-form');
    const adminMatchesContainer = document.getElementById('admin-matches-container');

    // Modal
    const modal = document.getElementById('modal-overlay');
    const modalForm = document.getElementById('modal-form');
    const btnModalCancel = document.getElementById('btn-modal-cancel');
    const knockoutOptions = document.getElementById('modal-knockout-options');

    let currentPredictMatchId = null;

    // =============== INITIALIZATION ===============
    function init() {
        const user = auth.getCurrentUser();
        if (user) {
            updateUserPoints();
            showView('dashboard');
        } else {
            showView('auth');
        }
        renderLeaderboard();
        initTournamentPlayersList();
    }

    function initTournamentPlayersList() {
        const datalist = document.getElementById('tournament-players');
        if (!datalist) return;
        datalist.innerHTML = ''; 

        const matches = store.getMatches();
        const activeTeams = new Set();
        matches.forEach(m => {
            activeTeams.add(m.team1);
            activeTeams.add(m.team2);
        });

        const suggestedPlayers = [];
        activeTeams.forEach(team => {
            if (typeof PLAYERS_DB !== 'undefined' && PLAYERS_DB[team]) {
                suggestedPlayers.push(...PLAYERS_DB[team]);
            }
        });

        suggestedPlayers.sort().forEach(player => {
            const opt = document.createElement('option');
            opt.value = player;
            datalist.appendChild(opt);
        });
    }

    function switchNav(activeId) {
        ['dashboard', 'admin'].forEach(k => {
            if(navBtns[k]) navBtns[k].classList.remove('active');
        });
        if(navBtns[activeId]) navBtns[activeId].classList.add('active');
    }

    function showView(viewId) {
        Object.values(views).forEach(el => el.classList.add('hidden'));
        views[viewId].classList.remove('hidden');

        const user = auth.getCurrentUser();
        if (user) {
            navbar.classList.remove('hidden');
            userDisplay.textContent = `👤 ${user.email.split('@')[0]}`;
            
            navBtns.admin.classList.toggle('hidden', user.role !== 'admin');
            
            if (viewId === 'dashboard') { 
                switchNav('dashboard'); 
                const tPred = store.getTournamentPrediction(user.id);
                if(tPred) {
                    document.getElementById('user-top-scorer').value = tPred.topScorer || '';
                    document.getElementById('user-top-assister').value = tPred.topAssister || '';
                } else {
                    document.getElementById('user-top-scorer').value = '';
                    document.getElementById('user-top-assister').value = '';
                }

                const matches = store.getMatches();
                const now = new Date();
                const firstMatch = matches.length > 0 ? matches[0] : null;
                const isLocked = firstMatch && now > new Date(firstMatch.date);
                
                const scorerInput = document.getElementById('user-top-scorer');
                const assisterInput = document.getElementById('user-top-assister');
                const btnSave = document.querySelector('#user-tournament-form button[type="submit"]');
                
                if (scorerInput && assisterInput && btnSave) {
                    scorerInput.disabled = isLocked;
                    assisterInput.disabled = isLocked;
                    if (isLocked) {
                        btnSave.classList.add('hidden');
                    } else {
                        btnSave.classList.remove('hidden');
                    }
                }

                renderMatches(); 
            }
            if (viewId === 'admin') { 
                switchNav('admin'); 
                const tRes = store.getTournamentResults();
                if(tRes) {
                    document.getElementById('admin-top-scorer').value = tRes.topScorer || '';
                    document.getElementById('admin-top-assister').value = tRes.topAssister || '';
                }
                renderAdminMatches(); 
            }
        } else {
            navbar.classList.add('hidden');
            if (viewId === 'auth') {
                const creds = auth.getSavedCredentials();
                if (creds && creds.email) {
                    quickLoginEmail.textContent = creds.email;
                    quickLoginContainer.classList.remove('hidden');
                    authForm.classList.add('hidden');
                } else {
                    quickLoginContainer.classList.add('hidden');
                    authForm.classList.remove('hidden');
                }
            }
        }
    }

    function updateUserPoints() {
        const user = auth.getCurrentUser();
        if(!user) return;
        
        const preds = store.getPredictionsByUser(user.id);
        const matchPts = preds.reduce((sum, p) => sum + (p.points || 0), 0);
        
        const tPred = store.getTournamentPrediction(user.id);
        const tRes = store.getTournamentResults();
        const tournPts = window.calculateTournamentPoints(tPred, tRes);

        const total = matchPts + tournPts;
        myPointsEl.textContent = total;
        return total;
    }

    function calcAllPoints() {
        // Recalculate all predictions (used when a match completes)
        const matches = store.getMatches();
        let anyUpdates = false;

        store.db.predictions.forEach(p => {
            const match = matches.find(m => m.id === p.matchId);
            if (match && match.status === 'finished') {
                const pts = window.calculatePoints(p, match);
                if (p.points !== pts) {
                    store.updatePredictionPoints(p.id, pts);
                    anyUpdates = true;
                }
            }
        });
        return anyUpdates;
    }

    function updateTournamentLeaders() {
        const matches = store.getMatches().filter(m => m.status === 'finished');
        const goalCounts = {};
        const assistCounts = {};

        matches.forEach(m => {
            const processScorers = (scorersArr) => {
                if(!scorersArr) return;
                scorersArr.forEach(s => {
                    const name = s.name.trim();
                    if (s.type === 'goal') {
                        goalCounts[name] = (goalCounts[name] || 0) + 1;
                    } else if (s.type === 'assist') {
                        assistCounts[name] = (assistCounts[name] || 0) + 1;
                    }
                });
            };
            processScorers(m.scorers_t1);
            processScorers(m.scorers_t2);
        });

        let maxGoals = 0;
        for (let name in goalCounts) if (goalCounts[name] > maxGoals) maxGoals = goalCounts[name];
        
        let maxAssists = 0;
        for (let name in assistCounts) if (assistCounts[name] > maxAssists) maxAssists = assistCounts[name];

        let topScorers = [];
        if (maxGoals > 0) topScorers = Object.keys(goalCounts).filter(name => goalCounts[name] === maxGoals);

        let topAssisters = [];
        if (maxAssists > 0) topAssisters = Object.keys(assistCounts).filter(name => assistCounts[name] === maxAssists);

        store.updateTournamentResults(topScorers, topAssisters);
    }

    // =============== AUTH EVENTS ===============
    btnShowNormalLogin.addEventListener('click', () => {
        quickLoginContainer.classList.add('hidden');
        authForm.classList.remove('hidden');
        emailInput.value = '';
        passwordInput.value = '';
    });

    btnQuickLogin.addEventListener('click', () => {
        const creds = auth.getSavedCredentials();
        if (creds) {
            try {
                auth.login(creds.email, creds.password);
                authError.classList.add('hidden');
                init();
            } catch (err) {
                authError.textContent = 'שגיאת התחברות: בחלוף הזמן נראה שהפרטים השתנו.';
                authError.classList.remove('hidden');
                quickLoginContainer.classList.add('hidden');
                authForm.classList.remove('hidden');
            }
        }
    });

    btnLogin.addEventListener('click', (e) => {
        e.preventDefault();
        if(!emailInput.value || !passwordInput.value) return;
        try {
            auth.login(emailInput.value, passwordInput.value);
            authError.classList.add('hidden');
            init();
            emailInput.value = ''; passwordInput.value = '';
        } catch (err) {
            authError.textContent = err.message;
            authError.classList.remove('hidden');
        }
    });

    btnRegister.addEventListener('click', (e) => {
        e.preventDefault();
        if(!emailInput.value || !passwordInput.value) return;
        try {
            auth.register(emailInput.value, passwordInput.value);
            authError.classList.add('hidden');
            init();
            emailInput.value = ''; passwordInput.value = '';
        } catch (err) {
            authError.textContent = err.message;
            authError.classList.remove('hidden');
        }
    });

    navBtns.logout.addEventListener('click', () => {
        auth.logout();
        init();
    });

    // =============== NAVIGATION ===============
    navBtns.dashboard.addEventListener('click', () => showView('dashboard'));
    navBtns.admin.addEventListener('click', () => showView('admin'));

    stageFilter.addEventListener('change', () => renderMatches());

    // =============== RENDER SYSTEM ===============
    function renderMatches() {
        const user = auth.getCurrentUser();
        matchesContainer.innerHTML = '';
        const allMatches = store.getMatches();
        const filter = stageFilter.value;

        const filtered = filter === 'all' ? allMatches : allMatches.filter(m => m.stage === filter);

        const stageHeb = {
            'Group Stage': 'שלב הבתים',
            'Round of 32': '32 האחרונות',
            'Round of 16': 'שמינית גמר',
            'Quarter-finals': 'רבע גמר',
            'Semi-finals': 'חצי גמר',
            'Final': 'גמר'
        };

        filtered.forEach(m => {
            const pred = store.getPrediction(user.id, m.id);
            const card = document.createElement('div');
            card.className = 'match-card';
            
            const isKnockout = m.stage !== 'Group Stage';
            const isMatchLocked = new Date() > new Date(m.date);
            
            let statusHtml = '';
            let btnHtml = '';
            let matchTeamsHtml = '';

            if (m.status === 'finished') {
                let scorersHtml = '';
                if ((m.scorers_t1 && m.scorers_t1.length > 0) || (m.scorers_t2 && m.scorers_t2.length > 0)) {
                    const formatScorers = (arr) => arr.map(s => `${s.name} ${s.type === 'goal' ? '⚽' : '👟'}`).join(', ');
                    const t1S = m.scorers_t1?.length ? formatScorers(m.scorers_t1) : '';
                    const t2S = m.scorers_t2?.length ? formatScorers(m.scorers_t2) : '';
                    scorersHtml = `<div style="font-size:0.75rem; color:#94a3b8; margin-top:0.5rem; display:flex; justify-content:space-between;">
                        <span>${t1S}</span>
                        <span>${t2S}</span>
                    </div>`;
                }

                let predResultHtml = pred ? `הניחוש שלך: ${pred.score1} - ${pred.score2} ${pred.score1_p != null ? '(פנדלים: '+pred.score1_p+'-'+pred.score2_p+')' : pred.score1_et != null ? '(הארכה: '+pred.score1_et+'-'+pred.score2_et+')' : ''}` : 'לא הוזן ניחוש';

                statusHtml = `
                    <div class="match-status">
                        <div class="status-finished">הסתיים ${m.score1_p != null ? '(פנדלים: '+m.score1_p+'-'+m.score2_p+')' : m.score1_et != null ? '(הארכה: '+m.score1_et+'-'+m.score2_et+')' : ''}</div>
                        ${scorersHtml}
                        <div class="prediction-box" style="margin-top:0.5rem;">${predResultHtml}</div>
                        ${pred ? `<div class="status-points">+${pred.points || 0} נק'</div>` : ''}
                    </div>
                `;

                matchTeamsHtml = `
                <div class="match-teams">
                    <span>${store.getTeamFlag(m.team1)} ${m.team1} <strong>${m.score1}</strong></span>
                    <span class="match-vs">-</span>
                    <span><strong>${m.score2}</strong> ${m.team2} ${store.getTeamFlag(m.team2)}</span>
                </div>`;
            } else {
                matchTeamsHtml = `
                <div class="match-teams">
                    <span>${store.getTeamFlag(m.team1)} ${m.team1}</span>
                    <span class="match-vs">vs</span>
                    <span>${store.getTeamFlag(m.team2)} ${m.team2}</span>
                </div>`;

                if (pred) {
                    statusHtml = `
                        <div class="match-status">
                            <div class="prediction-box">הניחוש שלי: ${pred.score1} - ${pred.score2} ${pred.score1_p != null ? '(פנדלים: '+pred.score1_p+'-'+pred.score2_p+')' : pred.score1_et != null ? '(הארכה: '+pred.score1_et+'-'+pred.score2_et+')' : ''}</div>
                        </div>
                    `;
                    if (isMatchLocked) {
                        btnHtml = `<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; margin-top:0.5rem;">זמן הניחוש עבר</div>`;
                    } else {
                        btnHtml = `<button class="btn secondary" onclick="openPredictModal('${m.id}')">ערוך ניחוש</button>`;
                    }
                } else {
                    if (isMatchLocked) {
                        btnHtml = `<div style="text-align:center; color:var(--text-muted); font-size:0.8rem; margin-top:0.5rem;">זמן הניחוש עבר</div>`;
                    } else {
                        btnHtml = `<button class="btn primary" onclick="openPredictModal('${m.id}')">נחש תוצאה</button>`;
                    }
                }
            }

            card.innerHTML = `
                <div class="match-header">
                    <span>${stageHeb[m.stage] || m.stage}</span>
                    <span>${new Date(m.date).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                </div>
                ${matchTeamsHtml}
                <div class="match-odds">
                    <div class="odds-1" style="flex: ${m.winProb1}">${m.winProb1}% ניצחון</div>
                    <div class="odds-x" style="flex: ${m.drawProb}">${m.drawProb}% תיקו</div>
                    <div class="odds-2" style="flex: ${m.winProb2}">${m.winProb2}% ניצחון</div>
                </div>
                ${statusHtml}
                ${btnHtml}
            `;
            matchesContainer.appendChild(card);
        });
    }

    function renderLeaderboard() {
        const tbody = document.getElementById('leaderboard-body');
        tbody.innerHTML = '';

        const users = store.getUsers();
        const rows = users.map(u => {
            const preds = store.getPredictionsByUser(u.id);
            const matchPts = preds.reduce((sum, p) => sum + (p.points || 0), 0);
            
            const tPred = store.getTournamentPrediction(u.id);
            const tRes = store.getTournamentResults();
            const tournPts = window.calculateTournamentPoints(tPred, tRes);
            
            return { id: u.id, email: u.email, points: matchPts + tournPts };
        }).sort((a,b) => b.points - a.points);

        rows.forEach((r, idx) => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.onclick = () => window.openUserProfileModal(r.id);
            tr.innerHTML = `
                <td>#${idx + 1}</td>
                <td>${r.email.split('@')[0]}</td>
                <td><strong>${r.points}</strong> נק'</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // =============== USER PROFILE MODAL ===============
    window.openUserProfileModal = (userId) => {
        const modal = document.getElementById('modal-user-profile');
        const container = document.getElementById('modal-user-predictions-list');
        const user = store.getUsers().find(u => u.id === userId);
        if (!user) return;
        
        document.getElementById('modal-user-title').textContent = `פירוט בניחושים: ${user.email.split('@')[0]}`;
        container.innerHTML = '';
        
        const preds = store.getPredictionsByUser(userId);
        if(preds.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:var(--text-muted)">טרם הוזנו ניחושים.</p>';
        } else {
            preds.forEach(p => {
                const m = store.getMatch(p.matchId);
                if(!m) return;
                
                const isFinished = m.status === 'finished';
                const pts = p.points || 0;
                
                let actualScoreStr = isFinished ? `${m.score1}-${m.score2}` : 'טרם התקיים';
                if (isFinished && m.score1_p != null) actualScoreStr += ` (פ' ${m.score1_p}-${m.score2_p})`;
                else if (isFinished && m.score1_et != null) actualScoreStr += ` (ה' ${m.score1_et}-${m.score2_et})`;

                let predScoreStr = `${p.score1}-${p.score2}`;
                if (p.score1_p != null) predScoreStr += ` (פ' ${p.score1_p}-${p.score2_p})`;
                else if (p.score1_et != null) predScoreStr += ` (ה' ${p.score1_et}-${p.score2_et})`;

                container.innerHTML += `
                    <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; border: 1px solid var(--border);">
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:0.5rem; margin-bottom:0.5rem;">
                            <strong>${store.getTeamFlag(m.team1)} ${m.team1} vs ${m.team2} ${store.getTeamFlag(m.team2)}</strong>
                            <span style="font-size:0.8rem; color:var(--text-muted)">${new Date(m.date).toLocaleString([], {month:'short', day:'numeric'})}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size:0.9rem;">
                            <div>
                                <div style="color:var(--text-muted)">תוצאה בפועל: <strong style="color:white">${actualScoreStr}</strong></div>
                                <div>הניחוש: <strong>${predScoreStr}</strong></div>
                            </div>
                            ${isFinished ? `
                                <div style="display:flex; align-items:center; justify-content:center; background:${pts>0?'rgba(16,185,129,0.2)':'rgba(239,68,68,0.2)'}; color:${pts>0?'#10b981':'#ef4444'}; width:40px; height:40px; border-radius:50%; font-weight:bold;">
                                    ${pts}
                                </div>
                            ` : `<div style="display:flex; align-items:center; justify-content:center; color:var(--text-muted); font-size:0.8rem;">ממתין</div>`}
                        </div>
                    </div>
                `;
            });
            
            // Add Tournament Predictions
            const tPred = store.getTournamentPrediction(user.id);
            if (tPred && (tPred.topScorer || tPred.topAssister)) {
                container.innerHTML += `
                    <div style="background: rgba(59, 130, 246, 0.1); padding: 1rem; border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.3);">
                        <strong style="display:block; margin-bottom:0.5rem; text-align:center;">🏆 ניחושי טורניר</strong>
                        ${tPred.topScorer ? `<div>מלך השערים: <strong>${tPred.topScorer}</strong></div>` : ''}
                        ${tPred.topAssister ? `<div>מלך הבישולים: <strong>${tPred.topAssister}</strong></div>` : ''}
                    </div>
                `;
            }
        }
        
        modal.classList.remove('hidden');
    };

    // =============== PREDICT MODAL (REGULAR USERS) ===============
    window.openPredictModal = (matchId) => {
        const m = store.getMatch(matchId);
        if(!m) return;
        currentPredictMatchId = matchId;

        document.getElementById('modal-subtitle').innerHTML = `${store.getTeamFlag(m.team1)} <span style="vertical-align:middle;">${m.team1} vs ${m.team2}</span> ${store.getTeamFlag(m.team2)}`;
        document.getElementById('modal-team1-label').innerHTML = `<span style="vertical-align:middle;">${m.team1}</span> ${store.getTeamFlag(m.team1)}`;
        document.getElementById('modal-team2-label').innerHTML = `${store.getTeamFlag(m.team2)} <span style="vertical-align:middle;">${m.team2}</span>`;
        
        const pred = store.getPrediction(auth.getCurrentUser().id, matchId);
        document.getElementById('modal-score1').value = pred ? pred.score1 : '';
        document.getElementById('modal-score2').value = pred ? pred.score2 : '';
        document.getElementById('modal-score1-et').value = pred && pred.score1_et != null ? pred.score1_et : '';
        document.getElementById('modal-score2-et').value = pred && pred.score2_et != null ? pred.score2_et : '';
        document.getElementById('modal-score1-p').value = pred && pred.score1_p != null ? pred.score1_p : '';
        document.getElementById('modal-score2-p').value = pred && pred.score2_p != null ? pred.score2_p : '';
        
        const isKnockout = m.stage !== 'Group Stage';
        
        const checkDrawShow = () => {
            const sc1 = document.getElementById('modal-score1').value;
            const sc2 = document.getElementById('modal-score2').value;
            const sCET1 = document.getElementById('modal-score1-et');
            const sCET2 = document.getElementById('modal-score2-et');
            const sCP1 = document.getElementById('modal-score1-p');
            const sCP2 = document.getElementById('modal-score2-p');
            const koOpt = document.getElementById('modal-knockout-options');
            const pOpt = document.getElementById('modal-penalties-options');

            if (isKnockout && sc1 === sc2 && sc1 !== '') {
                koOpt.classList.remove('hidden');
                sCET1.required = true;
                sCET2.required = true;

                if (sCET1.value === sCET2.value && sCET1.value !== '') {
                    pOpt.classList.remove('hidden');
                    sCP1.required = true;
                    sCP2.required = true;
                } else {
                    pOpt.classList.add('hidden');
                    sCP1.required = false;
                    sCP2.required = false;
                    sCP1.value = '';
                    sCP2.value = '';
                }
            } else {
                koOpt.classList.add('hidden');
                if (pOpt) pOpt.classList.add('hidden');
                sCET1.required = false;
                sCET2.required = false;
                sCP1.required = false;
                sCP2.required = false;
                sCET1.value = '';
                sCET2.value = '';
                sCP1.value = '';
                sCP2.value = '';
            }
        };

        checkDrawShow();
        document.getElementById('modal-score1').oninput = checkDrawShow;
        document.getElementById('modal-score2').oninput = checkDrawShow;
        document.getElementById('modal-score1-et').oninput = checkDrawShow;
        document.getElementById('modal-score2-et').oninput = checkDrawShow;

        modal.classList.remove('hidden');
    };

    btnModalCancel.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    modalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const m = store.getMatch(currentPredictMatchId);
        if (m && new Date() > new Date(m.date)) {
            alert('זמן הניחוש למשחק זה עבר!');
            modal.classList.add('hidden');
            return;
        }

        const sc1 = document.getElementById('modal-score1').value;
        const sc2 = document.getElementById('modal-score2').value;
        const sc1et = document.getElementById('modal-score1-et').value;
        const sc2et = document.getElementById('modal-score2-et').value;
        const sc1p = document.getElementById('modal-score1-p').value;
        const sc2p = document.getElementById('modal-score2-p').value;

        store.upsertPrediction({
            id: 'p_' + Date.now().toString(),
            matchId: currentPredictMatchId,
            userId: auth.getCurrentUser().id,
            score1: parseInt(sc1),
            score2: parseInt(sc2),
            score1_et: sc1et !== '' ? parseInt(sc1et) : null,
            score2_et: sc2et !== '' ? parseInt(sc2et) : null,
            score1_p: sc1p !== '' ? parseInt(sc1p) : null,
            score2_p: sc2p !== '' ? parseInt(sc2p) : null,
            points: 0
        });

        modal.classList.add('hidden');
        renderMatches();
    });

    // =============== ADMIN LOGIC ===============
    adminAddMatchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        store.addMatch({
            id: 'm_' + Date.now().toString(),
            team1: document.getElementById('admin-t1').value,
            team2: document.getElementById('admin-t2').value,
            stage: document.getElementById('admin-stage').value,
            date: document.getElementById('admin-date').value,
            winProb1: parseInt(document.getElementById('admin-p1').value),
            drawProb: parseInt(document.getElementById('admin-px').value),
            winProb2: parseInt(document.getElementById('admin-p2').value),
            status: 'upcoming',
            score1: null, score2: null, drawResult: null
        });
        adminAddMatchForm.reset();
        renderAdminMatches();
        alert('!המשחק נוסף בהצלחה');
    });

    function renderAdminMatches() {
        adminMatchesContainer.innerHTML = '';
        const upcomingMatches = store.getMatches().filter(m => m.status === 'upcoming');
        
        if (upcomingMatches.length === 0) {
            adminMatchesContainer.innerHTML = '<p style="color:var(--text-muted)">.אין משחקים שממתינים לעדכון תוצאה</p>';
            return;
        }

        upcomingMatches.forEach(m => {
            const html = `
                <div class="match-card" style="padding:1rem;">
                    <div class="match-teams" style="font-size:1rem; margin-bottom:0.5rem; justify-content:space-around;">
                        <span>${store.getTeamFlag(m.team1)} <span style="vertical-align:middle;">${m.team1}</span></span>
                        <span>vs</span>
                        <span><span style="vertical-align:middle;">${m.team2}</span> ${store.getTeamFlag(m.team2)}</span>
                    </div>
                    <button type="button" class="btn primary" style="padding:6px; font-size:0.8rem; height:auto; width:100%;" onclick="openAdminResolveModal('${m.id}')">עדכן תוצאה סופית</button>
                </div>
            `;
            adminMatchesContainer.innerHTML += html;
        });
    }

    // =============== ADMIN RESOLVE MODAL ===============
    let currentAdminMatchId = null;
    const adminResolveModal = document.getElementById('modal-admin-resolve');
    const adminResolveForm = document.getElementById('admin-resolve-form');

    window.openAdminResolveModal = (matchId) => {
        const m = store.getMatch(matchId);
        if(!m) return;
        currentAdminMatchId = matchId;

        document.getElementById('admin-resolve-subtitle').innerHTML = `${store.getTeamFlag(m.team1)} <span style="vertical-align:middle;">${m.team1} vs ${m.team2}</span> ${store.getTeamFlag(m.team2)}`;
        document.getElementById('admin-resolve-team1-label').innerHTML = m.team1;
        document.getElementById('admin-resolve-team2-label').innerHTML = m.team2;
        
        document.getElementById('admin-scorers-team1-title').textContent = m.team1;
        document.getElementById('admin-scorers-team2-title').textContent = m.team2;

        adminResolveForm.reset();
        document.getElementById('admin-scorers-list-1').innerHTML = '';
        document.getElementById('admin-scorers-list-2').innerHTML = '';

        const isKnockout = m.stage !== 'Group Stage';
        document.getElementById('admin-knockout-options').classList.toggle('hidden', !isKnockout);
        
        adminResolveModal.classList.remove('hidden');
    };

    document.getElementById('btn-admin-modal-close').addEventListener('click', () => adminResolveModal.classList.add('hidden'));
    document.getElementById('btn-admin-modal-cancel').addEventListener('click', () => adminResolveModal.classList.add('hidden'));

    function createScorerInput() {
        const div = document.createElement('div');
        div.style = 'display:flex; gap:0.25rem; font-size:0.8rem;';
        div.innerHTML = `
            <input type="text" list="tournament-players" placeholder="שם שחקן" style="flex:1; width:50%; min-width:0; color:black; background:white; padding:4px;" class="scorer-name" required>
            <select style="width: auto; padding: 2px; color:black; background:white;" class="scorer-type">
                <option value="goal">כובש</option>
                <option value="assist">מבשל</option>
            </select>
            <button type="button" class="btn secondary" onclick="this.parentElement.remove()" style="padding:2px 6px;">✕</button>
        `;
        return div;
    }

    document.getElementById('btn-add-scorer-1').addEventListener('click', () => {
        document.getElementById('admin-scorers-list-1').appendChild(createScorerInput());
    });
    document.getElementById('btn-add-scorer-2').addEventListener('click', () => {
        document.getElementById('admin-scorers-list-2').appendChild(createScorerInput());
    });

    adminResolveForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const m = store.getMatch(currentAdminMatchId);
        if(!m) return;
        
        const isKnockout = m.stage !== 'Group Stage';
        const sc1 = document.getElementById('admin-score1').value;
        const sc2 = document.getElementById('admin-score2').value;
        let sc1et = null, sc2et = null, sc1p = null, sc2p = null;
        
        if (isKnockout) {
            const et1_val = document.getElementById('admin-score1-et').value;
            const et2_val = document.getElementById('admin-score2-et').value;
            const p1_val = document.getElementById('admin-score1-p').value;
            const p2_val = document.getElementById('admin-score2-p').value;
            
            if (sc1 === sc2 && (!et1_val || !et2_val)) {
                alert('!חובה להזין תוצאת הארכה במקרה של תיקו ב-90 דקות');
                return;
            }

            if (et1_val !== '') sc1et = parseInt(et1_val);
            if (et2_val !== '') sc2et = parseInt(et2_val);
            if (p1_val !== '') sc1p = parseInt(p1_val);
            if (p2_val !== '') sc2p = parseInt(p2_val);
        }

        const parseScorers = (listId) => {
            const arr = [];
            document.getElementById(listId).querySelectorAll('div').forEach(div => {
                const name = div.querySelector('.scorer-name').value.trim();
                const type = div.querySelector('.scorer-type').value;
                if(name) arr.push({ name, type });
            });
            return arr;
        };

        store.updateMatch(currentAdminMatchId, {
            status: 'finished',
            score1: parseInt(sc1),
            score2: parseInt(sc2),
            score1_et: sc1et,
            score2_et: sc2et,
            score1_p: sc1p,
            score2_p: sc2p,
            scorers_t1: parseScorers('admin-scorers-list-1'),
            scorers_t2: parseScorers('admin-scorers-list-2')
        });

        updateTournamentLeaders();
        calcAllPoints();
        updateUserPoints();
        renderAdminMatches();
        adminResolveModal.classList.add('hidden');
        alert('!המשחק עודכן והנקודות חולקו בהצלחה');
    });

    // Kickoff
    init();

    // =============== TOURNAMENT PREDICTIONS ===============
    const userTournamentForm = document.getElementById('user-tournament-form');
    const userTournamentMsg = document.getElementById('user-tournament-msg');
    if (userTournamentForm) {
        userTournamentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const matches = store.getMatches();
            const now = new Date();
            if (matches.length > 0 && now > new Date(matches[0].date)) {
                alert('זמן הניחוש לטורניר עבר!');
                return;
            }
            const scorer = document.getElementById('user-top-scorer').value;
            const assister = document.getElementById('user-top-assister').value;
            store.upsertTournamentPrediction(auth.getCurrentUser().id, scorer, assister);
            updateUserPoints();
            userTournamentMsg.classList.remove('hidden');
            setTimeout(() => userTournamentMsg.classList.add('hidden'), 3000);
            renderLeaderboard();
        });
    }

    const adminTournamentForm = document.getElementById('admin-tournament-form');
    if (adminTournamentForm) {
        adminTournamentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const scorer = document.getElementById('admin-top-scorer').value;
            const assister = document.getElementById('admin-top-assister').value;
            store.updateTournamentResults(scorer, assister);
            updateUserPoints();
            renderLeaderboard();
            alert('תוצאות הטורניר עודכנו!');
        });
    }
});
