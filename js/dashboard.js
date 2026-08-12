/**
 * Dashboard + auth UI layered onto the existing glass design.
 */
(function (global) {
    let activePlanId = null;
    let dashboardScreen = 'home'; // home | plan | pdfs

    function $(id) {
        return document.getElementById(id);
    }

    function goalLabel(goal) {
        if (goal === 'bulk') return 'Bulk';
        if (goal === 'cut') return 'Deff';
        return 'Behålla';
    }

    function formatKg(value) {
        if (value == null || Number.isNaN(Number(value))) return '–';
        return `${Number(value).toFixed(1).replace(/\.0$/, '')} kg`;
    }

    function formatDate(value) {
        if (!value) return '–';
        const d = String(value).slice(0, 10);
        const [y, m, day] = d.split('-');
        return `${day}/${m}/${y}`;
    }

    function formatShortDate(value) {
        if (!value) return '';
        const d = String(value).slice(0, 10);
        const [, m, day] = d.split('-');
        return `${day}/${m}`;
    }

    function showToast(message, isError) {
        let el = $('account-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'account-toast';
            el.className = 'account-toast';
            document.body.appendChild(el);
        }
        el.textContent = message;
        el.classList.toggle('error', !!isError);
        el.classList.add('visible');
        clearTimeout(el._timer);
        el._timer = setTimeout(() => el.classList.remove('visible'), 3200);
    }

    function refreshAuthUi() {
        const user = AccountStore.currentUser();
        const loginBtn = $('auth-login-btn');
        const dashBtn = $('auth-dashboard-btn');
        const logoutBtn = $('auth-logout-btn');
        const userLabel = $('auth-user-label');
        const menuLogin = $('menu-login-btn');
        const menuDash = $('menu-dashboard-btn');
        const menuLogout = $('menu-logout-btn');

        if (user) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (dashBtn) dashBtn.style.display = 'inline-flex';
            if (logoutBtn) logoutBtn.style.display = 'inline-flex';
            if (userLabel) {
                userLabel.style.display = 'inline';
                userLabel.textContent = user.name || user.email;
            }
            if (menuLogin) menuLogin.style.display = 'none';
            if (menuDash) menuDash.style.display = 'flex';
            if (menuLogout) menuLogout.style.display = 'flex';
        } else {
            if (loginBtn) loginBtn.style.display = 'inline-flex';
            if (dashBtn) dashBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (userLabel) userLabel.style.display = 'none';
            if (menuLogin) menuLogin.style.display = 'flex';
            if (menuDash) menuDash.style.display = 'none';
            if (menuLogout) menuLogout.style.display = 'none';
        }
    }

    function openAuthModal(mode = 'login') {
        const modal = $('auth-modal');
        if (!modal) return;
        modal.classList.add('active');
        setAuthMode(mode);
    }

    function closeAuthModal() {
        $('auth-modal')?.classList.remove('active');
    }

    function setAuthMode(mode) {
        const isLogin = mode === 'login';
        $('auth-mode-login')?.classList.toggle('selected', isLogin);
        $('auth-mode-register')?.classList.toggle('selected', !isLogin);
        const nameGroup = $('auth-name-group');
        if (nameGroup) nameGroup.style.display = isLogin ? 'none' : 'block';
        const submit = $('auth-submit-btn');
        if (submit) submit.textContent = isLogin ? 'Logga in' : 'Skapa konto';
        const title = $('auth-modal-title');
        if (title) title.textContent = isLogin ? 'Logga in' : 'Skapa konto';
        modalMode = mode;
    }

    let modalMode = 'login';

    async function handleAuthSubmit(e) {
        e.preventDefault();
        const email = $('auth-email')?.value || '';
        const password = $('auth-password')?.value || '';
        const name = $('auth-name')?.value || '';
        try {
            if (modalMode === 'login') await AccountStore.login({ email, password });
            else await AccountStore.register({ email, password, name });
            closeAuthModal();
            refreshAuthUi();
            showToast(modalMode === 'login' ? 'Inloggad' : 'Konto skapat');
            dashboardScreen = 'home';
            activePlanId = null;
            renderDashboard();
        } catch (err) {
            showToast(err.message || 'Något gick fel', true);
        }
    }

    async function handleOAuth(provider) {
        try {
            showToast(provider === 'apple' ? 'Öppnar Apple…' : 'Öppnar Google…');
            await AccountStore.loginWithOAuth(provider);
        } catch (err) {
            showToast(err.message || 'Kunde inte starta inloggning', true);
        }
    }

    function openDashboard() {
        if (!AccountStore.currentUser()) {
            openAuthModal('login');
            return;
        }
        const view = $('dashboard-view');
        const wizard = $('wizard-view');
        if (view) view.style.display = 'block';
        if (wizard) wizard.style.display = 'none';
        if (!activePlanId) dashboardScreen = 'home';
        renderDashboard();
    }

    function closeDashboard() {
        $('dashboard-view') && ($('dashboard-view').style.display = 'none');
        $('wizard-view') && ($('wizard-view').style.display = 'block');
        activePlanId = null;
        dashboardScreen = 'home';
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function trendLabel(trend) {
        if (trend === 'nedåt') return 'Går ner';
        if (trend === 'uppåt') return 'Går upp';
        return 'Stabil';
    }

    function sortedVersionsOldestFirst(plan) {
        return [...(plan.versions || [])].sort((a, b) => {
            const da = String(a.createdAt || a.date || '');
            const db = String(b.createdAt || b.date || '');
            return da.localeCompare(db);
        });
    }

    function calorieAdjustExplainCopy(goal) {
        if (goal === 'cut') {
            return 'Kalorimålet justeras först när veckomedelvärdet av din vikt tydligt minskar över ca 2–3 veckor — inte efter en enstaka invägning. Då räknas ett nytt dagsmål utifrån det nya snittet.';
        }
        if (goal === 'bulk') {
            return 'Kalorimålet justeras först när veckomedelvärdet av din vikt tydligt ökar över ca 2–3 veckor — inte efter en enstaka invägning. Då räknas ett nytt dagsmål utifrån det nya snittet.';
        }
        return 'Kalorimålet justeras först när veckomedelvärdet av din vikt förändras tydligt över ca 2–3 veckor. Då räknas underhållskalorierna om utifrån det nya snittet så att du kan hålla vikten jämn.';
    }

    function renderWeightChart(logs) {
        const sorted = WeightEngine.sortLogs(logs).slice(-28);
        if (sorted.length < 2) {
            return `
                <div class="weight-chart-empty">
                    <p class="dashboard-empty">Logga vikt minst två dagar för att se grafen.</p>
                </div>
            `;
        }

        const weights = sorted.map((l) => l.weight);
        const minW = Math.min(...weights);
        const maxW = Math.max(...weights);
        const pad = Math.max(0.5, (maxW - minW) * 0.15 || 0.5);
        const yMin = Math.floor((minW - pad) * 10) / 10;
        const yMax = Math.ceil((maxW + pad) * 10) / 10;
        const ySpan = Math.max(yMax - yMin, 0.5);

        const width = 560;
        const height = 280;
        const margin = { top: 20, right: 20, bottom: 52, left: 58 };
        const plotW = width - margin.left - margin.right;
        const plotH = height - margin.top - margin.bottom;

        const points = sorted.map((l, i) => {
            const x = margin.left + (sorted.length === 1 ? plotW / 2 : (i / (sorted.length - 1)) * plotW);
            const y = margin.top + plotH - ((l.weight - yMin) / ySpan) * plotH;
            return { x, y, log: l };
        });

        const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
        const yTicks = 4;
        let yTickEls = '';
        for (let i = 0; i <= yTicks; i++) {
            const value = yMin + (ySpan * i) / yTicks;
            const y = margin.top + plotH - (i / yTicks) * plotH;
            yTickEls += `
                <line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" class="chart-grid" />
                <text x="${margin.left - 8}" y="${y + 4}" text-anchor="end" class="chart-tick">${value.toFixed(1)}</text>
            `;
        }

        const maxXLabels = Math.min(6, sorted.length);
        const xStep = Math.max(1, Math.ceil((sorted.length - 1) / Math.max(maxXLabels - 1, 1)));
        const xTickEls = points.map((p, i) => {
            if (i !== 0 && i !== points.length - 1 && i % xStep !== 0) return '';
            return `
                <line x1="${p.x}" y1="${margin.top}" x2="${p.x}" y2="${margin.top + plotH}" class="chart-grid-soft" />
                <text x="${p.x}" y="${height - 28}" text-anchor="middle" class="chart-tick">${formatShortDate(p.log.date)}</text>
            `;
        }).join('');

        const dots = points.map((p) => `
            <circle cx="${p.x}" cy="${p.y}" r="4" class="chart-dot">
                <title>${formatDate(p.log.date)}: ${p.log.weight} kg</title>
            </circle>
        `).join('');

        return `
            <div class="weight-chart-wrap">
                <span class="weight-chart-y-label">Vikt (kg)</span>
                <div class="weight-chart-main">
                    <svg class="weight-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Vikt i kilogram över tid och datum">
                        ${yTickEls}
                        ${xTickEls}
                        <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotH}" class="chart-axis" />
                        <line x1="${margin.left}" y1="${margin.top + plotH}" x2="${width - margin.right}" y2="${margin.top + plotH}" class="chart-axis" />
                        <polyline fill="none" stroke="rgba(0,122,255,0.95)" stroke-width="2.5" points="${polyline}"></polyline>
                        ${dots}
                    </svg>
                    <span class="weight-chart-x-label">Tid / datum</span>
                </div>
            </div>
            <p class="chart-range-note">${sorted.length} mätvärden · varje punkt är ett vägningstillfälle</p>
        `;
    }

    function buildPdfPreviewCard(plan, version, isCurrent) {
        const days = (version.mealPlanDays || []).slice(0, 3);
        return `
            <article class="pdf-preview-card ${isCurrent ? 'is-current' : ''}" data-version-id="${version.id}">
                <div class="pdf-preview-frame-wrap">
                    <div class="pdf-sheet-fallback" data-fallback-for="${version.id}">
                        <div class="pdf-sheet-bar">Kostschema</div>
                        <div class="pdf-sheet-title">${escapeHtml(plan.name)}</div>
                        <div class="pdf-sheet-meta">${formatDate(version.date)} · ${version.calorieTarget} kcal</div>
                        <div class="pdf-sheet-row">Vikt ${formatKg(version.weight)}</div>
                        <div class="pdf-sheet-row">Protein ${version.macros?.proteinG ?? '–'}g · Kolh ${version.macros?.carbsG ?? '–'}g · Fett ${version.macros?.fatG ?? '–'}g</div>
                        <div class="pdf-sheet-days">
                            ${days.map((d) => `<div>${escapeHtml(d.name)} · ${d.calories} kcal</div>`).join('') || '<div>Kostschema</div>'}
                        </div>
                    </div>
                    <iframe class="pdf-preview-frame" title="Förhandsvisning ${escapeHtml(version.label || 'kostschema')}" data-version-id="${version.id}" hidden></iframe>
                </div>
                <div class="pdf-preview-info">
                    ${isCurrent ? '<span class="pdf-current-badge">Nuvarande</span>' : ''}
                    <strong>${escapeHtml(version.label || 'Kostschema')}</strong>
                    <span>${formatDate(version.date)} · ${version.calorieTarget} kcal · ${formatKg(version.weight)}</span>
                    <small>${escapeHtml(version.reason || '')}</small>
                    <div class="pdf-preview-actions">
                        <button type="button" class="nav-btn primary pdf-open-btn" data-version-id="${version.id}">Öppna PDF</button>
                        <button type="button" class="nav-btn pdf-download-btn" data-version-id="${version.id}">Ladda ned</button>
                    </div>
                </div>
            </article>
        `;
    }

    function wireVersionButtons(root, plan) {
        async function withVersion(versionId, action) {
            try {
                const version = (plan.versions || []).find((v) => v.id === versionId);
                if (!version) throw new Error('Versionen hittades inte');
                await PlanPdfStore.ensurePdfForVersion(plan, version);
                const pdfId = `${plan.id}:${version.id}`;
                AccountStore.updatePlan(plan.id, (p) => {
                    const target = (p.versions || []).find((v) => v.id === version.id);
                    if (target && version.fileName) target.fileName = version.fileName;
                });
                await action(pdfId);
            } catch (err) {
                showToast(err.message || 'Kunde inte öppna PDF', true);
            }
        }

        root.querySelectorAll('.pdf-open-btn').forEach((btn) => {
            btn.addEventListener('click', () => withVersion(btn.dataset.versionId, async (pdfId) => {
                const ok = await PlanPdfStore.openStoredPdf(pdfId);
                if (!ok) throw new Error('PDF saknas');
                showToast('PDF öppnad');
            }));
        });
        root.querySelectorAll('.pdf-download-btn').forEach((btn) => {
            btn.addEventListener('click', () => withVersion(btn.dataset.versionId, async (pdfId) => {
                await PlanPdfStore.downloadStoredPdf(pdfId);
                showToast('PDF nedladdad');
            }));
        });
    }

    function renderDashboard() {
        const root = $('dashboard-content');
        if (!root || !AccountStore.currentUser()) return;

        if (dashboardScreen === 'pdfs' && activePlanId) {
            try {
                renderPdfLibrary(root, AccountStore.getPlan(activePlanId));
            } catch (err) {
                dashboardScreen = 'home';
                activePlanId = null;
                showToast(err.message, true);
                renderDashboard();
            }
            return;
        }

        if (dashboardScreen === 'plan' && activePlanId) {
            try {
                renderPlanDetail(root, AccountStore.getPlan(activePlanId));
            } catch (err) {
                dashboardScreen = 'home';
                activePlanId = null;
                showToast(err.message, true);
                renderDashboard();
            }
            return;
        }

        const plans = AccountStore.listPlans();
        root.innerHTML = `
            <div class="dashboard-header-row">
                <div>
                    <h2>Min dashboard</h2>
                    <p class="dashboard-subtitle">Välj ett kostschema för att följa det, eller öppna Mina Kostscheman för alla PDF-filer</p>
                </div>
                <button type="button" class="nav-btn" id="dashboard-back-wizard">Tillbaka till generatorn</button>
            </div>
            <div class="dashboard-section">
                <h3>Dina sparade planer</h3>
                ${plans.length === 0 ? `
                    <div class="dash-empty-card">
                        <p class="dashboard-empty">Du har inga sparade kostscheman ännu.</p>
                        <p class="dashboard-empty">Skapa ett i generatorn och klicka på <strong>Spara kostschema</strong>.</p>
                    </div>
                ` : `
                    <div class="saved-plans-list">
                        ${plans.map((p) => `
                            <div class="saved-plan-card-wrap">
                                <button type="button" class="saved-plan-card" data-plan-id="${p.id}">
                                    <div class="saved-plan-top">
                                        <span class="saved-plan-name">${escapeHtml(p.name)}</span>
                                        <span class="goal-pill goal-${escapeHtml(p.goal)}">${goalLabel(p.goal)}</span>
                                    </div>
                                    <div class="saved-plan-highlights">
                                        <span><strong>${formatKg(p.currentWeight)}</strong><small>nuvarande vikt</small></span>
                                        <span><strong>${p.calorieTarget} kcal</strong><small>dagens kalorimål</small></span>
                                    </div>
                                    <span class="saved-plan-updated">Öppna för att följa schemat →</span>
                                </button>
                                <button type="button" class="nav-btn primary mina-kostscheman-btn" data-plan-id="${p.id}">Mina Kostscheman</button>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;

        $('dashboard-back-wizard')?.addEventListener('click', closeDashboard);
        root.querySelectorAll('.saved-plan-card').forEach((btn) => {
            btn.addEventListener('click', () => {
                activePlanId = btn.dataset.planId;
                dashboardScreen = 'plan';
                renderDashboard();
            });
        });
        root.querySelectorAll('.mina-kostscheman-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                activePlanId = btn.dataset.planId;
                dashboardScreen = 'pdfs';
                renderDashboard();
            });
        });
    }

    function renderPdfLibrary(root, plan) {
        const versions = sortedVersionsOldestFirst(plan);
        const latestId = versions.length ? versions[versions.length - 1].id : null;

        root.innerHTML = `
            <div class="dashboard-header-row">
                <div>
                    <button type="button" class="text-link-btn" id="back-to-plan">← Tillbaka till ${escapeHtml(plan.name)}</button>
                    <h2>Mina Kostscheman</h2>
                    <p class="dashboard-subtitle">Alla PDF-versioner för “${escapeHtml(plan.name)}”, från äldsta till nyaste</p>
                </div>
                <button type="button" class="nav-btn" id="dashboard-back-home">Alla planer</button>
            </div>
            <div class="dashboard-section">
                ${versions.length === 0 ? `
                    <p class="dashboard-empty">Inga sparade PDF-filer ännu. Spara eller uppdatera planen för att skapa versioner.</p>
                ` : `
                    <div class="pdf-gallery">
                        ${versions.map((v) => buildPdfPreviewCard(plan, v, v.id === latestId)).join('')}
                    </div>
                `}
            </div>
        `;

        $('back-to-plan')?.addEventListener('click', () => {
            dashboardScreen = 'plan';
            renderDashboard();
        });
        $('dashboard-back-home')?.addEventListener('click', () => {
            dashboardScreen = 'home';
            activePlanId = null;
            renderDashboard();
        });
        wireVersionButtons(root, plan);
        versions.forEach(async (v) => {
            try {
                const record = await PlanPdfStore.ensurePdfForVersion(plan, v);
                const frame = root.querySelector(`.pdf-preview-frame[data-version-id="${v.id}"]`);
                const fallback = root.querySelector(`[data-fallback-for="${v.id}"]`);
                if (frame && record?.blob) {
                    const url = URL.createObjectURL(record.blob);
                    frame.src = `${url}#page=1&view=FitH`;
                    frame.hidden = false;
                    if (fallback) fallback.hidden = true;
                    setTimeout(() => URL.revokeObjectURL(url), 120_000);
                }
            } catch (_) {
                /* keep visual fallback card */
            }
        });
    }

    function renderPlanDetail(root, plan) {
        const stats = WeightEngine.weightStats(plan);
        const evaluation = WeightEngine.evaluateTrend(plan);
        const weeks = WeightEngine.weeklyAverages(plan.weightLogs || []);
        const adjustments = [...(plan.adjustments || [])].reverse();
        const todayLocal = WeightEngine.localToday();
        const changeText = stats.weightChange == null
            ? 'Ingen förändring ännu'
            : `${stats.weightChange > 0 ? '+' : ''}${stats.weightChange} kg sedan start`;
        const calorieTarget = plan.calorieTarget;
        const versions = sortedVersionsOldestFirst(plan);
        const latestVersion = versions.length ? versions[versions.length - 1] : null;

        root.innerHTML = `
            <div class="dashboard-header-row">
                <div>
                    <button type="button" class="text-link-btn" id="back-to-plans">← Alla planer</button>
                    <h2>${escapeHtml(plan.name)}</h2>
                    <p class="dashboard-subtitle">Mål: ${goalLabel(plan.goal)} · Skapad ${formatDate(plan.createdAt)}</p>
                </div>
                <div class="dash-header-actions">
                    <button type="button" class="nav-btn primary" id="open-mina-kostscheman">Mina Kostscheman</button>
                    <button type="button" class="nav-btn" id="dashboard-back-wizard">Till generatorn</button>
                </div>
            </div>

            <div class="dash-hero-cards">
                <div class="dash-hero-card">
                    <span class="dash-hero-label">Nuvarande vikt</span>
                    <span class="dash-hero-value">${formatKg(stats.currentWeight)}</span>
                    <span class="dash-hero-sub">Start ${formatKg(stats.startingWeight)}${stats.targetWeight != null ? ` · Mål ${formatKg(stats.targetWeight)}` : ''}</span>
                </div>
                <div class="dash-hero-card accent">
                    <span class="dash-hero-label">Dagens kalorimål</span>
                    <span class="dash-hero-value">${calorieTarget} kcal</span>
                    <span class="dash-hero-sub">${plan.goal === 'cut'
                        ? 'Ändras i takt med att din kroppsvikt minskar.'
                        : plan.goal === 'bulk'
                            ? 'Ändras i takt med din viktökning för att bibehålla ett kontrollerat kaloriöverskott.'
                            : 'Detta ska hållas för att bibehålla din nuvarande muskelmassa och styrka'}</span>
                </div>
                <div class="dash-hero-card">
                    <span class="dash-hero-label">Vikttrend</span>
                    <span class="dash-hero-value small">${trendLabel(stats.trend)}</span>
                    <span class="dash-hero-sub">${changeText}${stats.weeklyAverage != null ? ` · Veckomedel ${formatKg(stats.weeklyAverage)}` : ''}</span>
                </div>
            </div>

            <div class="dashboard-section follow-plan-section">
                <h3>Följ ditt kostschema</h3>
                <p class="section-help">Följ kalorimålet så gott du kan. Några kalorier upp eller ner spelar ingen större roll – det är helheten som räknas.</p>
                <div class="follow-calorie-banner">
                    <div>
                        <span class="follow-label">Ät idag</span>
                        <strong class="follow-calories">${calorieTarget} kcal</strong>
                    </div>
                    <div class="follow-macros">
                        <span>Protein <strong>${plan.macros.proteinG}g</strong></span>
                        <span>Kolhydrater <strong>${plan.macros.carbsG}g</strong></span>
                        <span>Fett <strong>${plan.macros.fatG}g</strong></span>
                    </div>
                </div>
                <div class="follow-days">
                    ${(plan.mealPlanDays || []).map((day) => `
                        <div class="follow-day">
                            <div class="follow-day-head">
                                <strong>${escapeHtml(day.name)}</strong>
                                <span>${day.calories} kcal · ${day.isTrainingDay ? 'Träning' : 'Vila'}</span>
                            </div>
                            <div class="follow-meals">
                                ${(day.meals || []).map((meal) => `
                                    <div class="follow-meal">
                                        <span>${escapeHtml(meal.name)}</span>
                                        <span>P ${meal.protein}g · K ${meal.carbs}g · F ${meal.fat}g</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('') || '<p class="dashboard-empty">Ingen måltidsfördelning sparad.</p>'}
                </div>
                <div class="follow-actions">
                    <button type="button" class="download-btn" id="dash-download-current-pdf">Ladda ned som PDF</button>
                    <button type="button" class="nav-btn" id="open-mina-kostscheman-2">Mina Kostscheman</button>
                </div>
            </div>

            <div class="dashboard-section">
                <h3>1. Logga dagens vikt</h3>
                <p class="section-help">Skriv in morgonvikten.</p>
                <div class="weight-log-form">
                    <div class="form-group">
                        <label for="dash-weight-input">Dagens vikt (kg)</label>
                        <input type="number" id="dash-weight-input" min="20" max="400" step="0.1" placeholder="t.ex. 79.6" inputmode="decimal">
                    </div>
                    <div class="form-group">
                        <label for="dash-weight-date">Datum</label>
                        <input type="date" id="dash-weight-date" value="${todayLocal}">
                    </div>
                    <button type="button" class="nav-btn primary" id="dash-log-weight">Spara dagens vikt</button>
                </div>
                <div id="weight-outlier-warning" class="weight-outlier-warning" hidden role="alert"></div>
                <div class="status-banner">
                    <strong>Status:</strong> ${escapeHtml(evaluation.reason || 'Fortsätt logga vikt regelbundet. Kalorimålet ligger kvar tills trenden är tydlig.')}
                </div>
            </div>

            <div class="dashboard-section">
                <h3>2. Din viktutveckling</h3>
                ${renderWeightChart(plan.weightLogs)}
                <div class="chart-adjust-explain" role="note">
                    <strong>När ändras kalorimålet?</strong>
                    <p>${escapeHtml(calorieAdjustExplainCopy(plan.goal))}</p>
                </div>
                <div class="weekly-averages">
                    <p class="week-avg-title">Senaste veckomedelvärden</p>
                    ${weeks.slice(-6).map((w) => `
                        <div class="week-avg-row">
                            <span>Vecka ${escapeHtml(w.week.split('-W')[1] || w.week)}</span>
                            <span><strong>${formatKg(w.average)}</strong> <small>${w.count} invägningar</small></span>
                        </div>
                    `).join('') || '<p class="dashboard-empty">Inga veckomedel ännu — logga vikt några dagar först.</p>'}
                </div>
            </div>

            ${adjustments.length === 0 ? '' : `
            <div class="dashboard-section">
                <h3>3. När systemet ändrat planen</h3>
                <div class="adjustment-list">
                    ${adjustments.map((a) => `
                        <div class="adjustment-item">
                            <strong>${formatDate(a.date)}</strong>
                            <p>Viktmedel: ${formatKg(a.previousWeightAverage)} → ${formatKg(a.newWeightAverage)}</p>
                            <p>Nytt kalorimål: ${a.previous.calorieTarget} → <strong>${a.next.calorieTarget} kcal</strong></p>
                            <small>${escapeHtml(a.reason || '')}</small>
                        </div>
                    `).join('')}
                </div>
            </div>
            `}
        `;

        $('back-to-plans')?.addEventListener('click', () => {
            activePlanId = null;
            dashboardScreen = 'home';
            renderDashboard();
        });
        $('dashboard-back-wizard')?.addEventListener('click', closeDashboard);
        const openPdfs = () => {
            dashboardScreen = 'pdfs';
            renderDashboard();
        };
        $('open-mina-kostscheman')?.addEventListener('click', openPdfs);
        $('open-mina-kostscheman-2')?.addEventListener('click', openPdfs);

        $('dash-download-current-pdf')?.addEventListener('click', async () => {
            try {
                let version = latestVersion;
                if (!version || version.calorieTarget !== plan.calorieTarget) {
                    version = NutritionCore.createVersionSnapshot(plan, {
                        label: 'Aktuell plan',
                        reason: 'Senaste kalorier och makron från kostschemat',
                        date: plan.updatedAt || new Date().toISOString()
                    });
                    AccountStore.updatePlan(plan.id, (p) => {
                        p.versions = p.versions || [];
                        if (!p.versions.some((v) => v.id === version.id)) p.versions.push(version);
                    });
                }
                const refreshed = AccountStore.getPlan(plan.id);
                const target = refreshed.versions.find((v) => v.id === version.id) || version;
                await PlanPdfStore.ensurePdfForVersion(refreshed, target);
                await PlanPdfStore.downloadStoredPdf(`${plan.id}:${target.id}`);
                showToast('PDF nedladdad');
            } catch (err) {
                try {
                    MealPlanPDF.exportMealPlanPdf(NutritionCore.toPdfPlan(plan));
                    showToast('PDF nedladdad');
                } catch (e2) {
                    showToast(e2.message || 'Kunde inte ladda ned PDF', true);
                }
            }
        });

        const weightInput = $('dash-weight-input');
        const dateInput = $('dash-weight-date');
        const warningEl = $('weight-outlier-warning');
        const saveBtn = $('dash-log-weight');
        let outlierAck = false;

        function refreshOutlierWarning() {
            const outlier = WeightEngine.detectWeightOutlier(plan, weightInput?.value);
            outlierAck = false;
            if (!warningEl) return outlier;
            if (outlier.isOutlier) {
                warningEl.hidden = false;
                warningEl.className = `weight-outlier-warning ${outlier.severity === 'high' ? 'high' : 'medium'}`;
                warningEl.innerHTML = `<strong>Vikten är väldigt avvikande</strong><p>${escapeHtml(outlier.message)}</p>`;
                if (saveBtn) saveBtn.textContent = 'Spara ändå';
            } else {
                warningEl.hidden = true;
                warningEl.textContent = '';
                if (saveBtn) saveBtn.textContent = 'Spara dagens vikt';
            }
            return outlier;
        }

        weightInput?.addEventListener('input', refreshOutlierWarning);

        saveBtn?.addEventListener('click', () => {
            try {
                const weight = parseFloat(weightInput.value);
                const date = dateInput.value || WeightEngine.localToday();
                const outlier = WeightEngine.detectWeightOutlier(plan, weight);
                if (outlier.isOutlier && !outlierAck) {
                    refreshOutlierWarning();
                    outlierAck = true;
                    showToast('Vikten ser avvikande ut — klicka igen för att spara ändå', true);
                    return;
                }
                let adjustedVersion = null;
                let toastMsg = 'Dagens vikt sparad';
                AccountStore.updatePlan(plan.id, (p) => {
                    const logResult = WeightEngine.applyWeightLog(p, weight, date);
                    const shouldReconcile = logResult.wasOverwrite && logResult.weightChanged;
                    const result = WeightEngine.evaluateAndMaybeAdjust(p, {
                        reconcile: shouldReconcile,
                        reason: shouldReconcile
                            ? 'Korrigerad viktlogg — kalorimålet räknades om utifrån uppdaterad vikttrend.'
                            : undefined
                    });
                    if (result.adjusted) {
                        adjustedVersion = result.version || null;
                        toastMsg = result.reconciled
                            ? `Kalorimålet omräknat till ${result.adjustment.next.calorieTarget} kcal`
                            : `Kostschemat uppdaterades till ${result.adjustment.next.calorieTarget} kcal`;
                    } else {
                        toastMsg = shouldReconcile ? 'Vikt korrigerad' : 'Dagens vikt sparad';
                    }
                });
                showToast(toastMsg);
                if (adjustedVersion) {
                    const refreshed = AccountStore.getPlan(plan.id);
                    PlanPdfStore.ensurePdfForVersion(refreshed, adjustedVersion).catch(() => {});
                    const vers = sortedVersionsOldestFirst(refreshed);
                    if (vers.length >= 2) {
                        PlanPdfStore.ensurePdfForVersion(refreshed, vers[vers.length - 2]).catch(() => {});
                    }
                }
                renderDashboard();
            } catch (err) {
                showToast(err.message || 'Kunde inte spara vikt', true);
            }
        });
    }

    function openSavePlanModal() {
        if (!AccountStore.currentUser()) {
            openAuthModal('login');
            showToast('Logga in för att spara kostschemat', true);
            return;
        }
        if (!global.state || !global.state.mealPlan) {
            showToast('Skapa ett kostschema först', true);
            return;
        }
        $('save-plan-modal')?.classList.add('active');
        const input = $('save-plan-name');
        if (input) {
            const goal = global.state.goal;
            const userName = (AccountStore.currentUser()?.name || '').trim();
            let suggested = 'Min bulk';
            if (goal === 'cut') suggested = 'Min deff';
            else if (goal === 'maintain') {
                suggested = userName
                    ? `Maintain ${userName}`
                    : 'Maintain + ditt namn';
            } else if (goal === 'bulk') {
                suggested = 'Min bulk';
            }
            input.value = suggested;
            input.placeholder = suggested;
        }
    }

    function closeSavePlanModal() {
        $('save-plan-modal')?.classList.remove('active');
    }

    function saveCurrentPlan() {
        try {
            const name = ($('save-plan-name')?.value || '').trim();
            if (!name) throw new Error('Ange ett namn för kostschemat');
            const st = global.state;
            const mealPlan = st.mealPlan;
            if (!mealPlan) throw new Error('Skapa ett kostschema först');

            let bmr = Number(st.bmr) || Number(mealPlan.userInfo?.bmr) || 0;
            let tdee = Number(st.tdee) || Number(mealPlan.userInfo?.tdee) || 0;
            if ((!tdee || !bmr) && st.age && st.height && st.weight && st.gender) {
                bmr = NutritionCore.calculateBMR(st.age, st.height, st.weight, st.gender);
                tdee = NutritionCore.calculateTDEE(bmr, st.activityLevel || 'moderate');
            }

            const calorieAdjustment = st.goal === 'maintain' ? 0 : (Number(st.calorieAdjustment) || 0);
            let calorieTarget = Number(mealPlan.dailyCalorieTarget);
            if (!Number.isFinite(calorieTarget) || calorieTarget <= 0) {
                calorieTarget = NutritionCore.calorieTargetFrom(tdee, st.goal, calorieAdjustment);
            }
            // Never persist only the surplus/deficit (e.g. 500) as the daily target
            if (calorieAdjustment > 0 && Math.abs(calorieTarget - calorieAdjustment) < 0.5) {
                calorieTarget = NutritionCore.calorieTargetFrom(tdee, st.goal, calorieAdjustment);
            }
            if (!Number.isFinite(calorieTarget) || calorieTarget < 800) {
                throw new Error('Kunde inte beräkna hela dagens kalorimål. Kontrollera BMR/TDEE i generatorn.');
            }

            const macros = NutritionCore.macrosForCalories(calorieTarget, st.goal, st.weight);
            const targetWeight = st.goal === 'maintain'
                ? null
                : (st.targetWeight != null && !Number.isNaN(Number(st.targetWeight))
                    ? Number(st.targetWeight)
                    : (parseFloat($('target-weight')?.value) || null));

            const mealPlanDays = (mealPlan.days || []).length
                ? mealPlan.days.map((day) => ({
                    name: day.name,
                    dayKey: day.dayKey || null,
                    isTrainingDay: !!day.isTrainingDay,
                    calories: day.calories,
                    meals: (day.meals || []).map((meal) => ({
                        name: meal.name,
                        protein: meal.protein,
                        carbs: meal.carbs,
                        fat: meal.fat,
                        calories: meal.calories != null
                            ? meal.calories
                            : Math.round((meal.protein * 4) + (meal.carbs * 4) + (meal.fat * 9))
                    }))
                }))
                : NutritionCore.rebuildMealPlanDays({
                    goal: st.goal,
                    snacks: st.snacks,
                    trainingDays: st.trainingDays
                }, calorieTarget);

            AccountStore.saveNewPlan({
                name,
                goal: st.goal,
                gender: st.gender,
                age: st.age,
                height: st.height,
                weight: st.weight,
                targetWeight,
                activityLevel: st.activityLevel,
                calorieAdjustment,
                bmr,
                tdee,
                calorieTarget,
                macros,
                trainingDays: st.trainingDays,
                snacks: st.snacks,
                mealPlanDays
            });

            const savedList = AccountStore.listPlans();
            const latest = savedList[0];
            if (latest) {
                AccountStore.updatePlan(latest.id, (p) => {
                    NutritionCore.repairPlanCalories(p);
                    p.versions = p.versions || [];
                    if (!p.versions.length) {
                        p.versions.push(NutritionCore.createVersionSnapshot(p, {
                            label: 'Ursprunglig plan',
                            reason: 'Första sparade kostschemat'
                        }));
                    }
                });
                const refreshed = AccountStore.getPlan(latest.id);
                const version = refreshed.versions[refreshed.versions.length - 1];
                if (version) PlanPdfStore.ensurePdfForVersion(refreshed, version).catch(() => {});
            }

            closeSavePlanModal();
            showToast(`Sparade “${name}”`);
            activePlanId = latest ? latest.id : null;
            dashboardScreen = latest ? 'plan' : 'home';
            openDashboard();
        } catch (err) {
            showToast(err.message || 'Kunde inte spara', true);
        }
    }

    function initAccountUi() {
        refreshAuthUi();

        if (global.ClerkAuth) {
            ClerkAuth.init().then(() => refreshAuthUi()).catch(() => {});
            ClerkAuth.onAuthChange(() => refreshAuthUi());
        }

        $('auth-login-btn')?.addEventListener('click', () => openAuthModal('login'));
        $('auth-dashboard-btn')?.addEventListener('click', openDashboard);
        $('auth-logout-btn')?.addEventListener('click', async () => {
            await AccountStore.logout();
            refreshAuthUi();
            closeDashboard();
            showToast('Utloggad');
        });
        $('auth-modal-close')?.addEventListener('click', closeAuthModal);
        $('auth-mode-login')?.addEventListener('click', () => setAuthMode('login'));
        $('auth-mode-register')?.addEventListener('click', () => setAuthMode('register'));
        $('auth-form')?.addEventListener('submit', handleAuthSubmit);
        $('auth-google-btn')?.addEventListener('click', () => handleOAuth('google'));
        $('auth-apple-btn')?.addEventListener('click', () => handleOAuth('apple'));
        $('auth-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'auth-modal') closeAuthModal();
        });

        document.addEventListener('click', (e) => {
            if (e.target.closest('#save-plan-btn')) {
                e.preventDefault();
                openSavePlanModal();
            }
        });
        $('save-plan-close')?.addEventListener('click', closeSavePlanModal);
        $('save-plan-confirm')?.addEventListener('click', saveCurrentPlan);
        $('save-plan-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'save-plan-modal') closeSavePlanModal();
        });
    }

    global.AccountUI = {
        initAccountUi,
        refreshAuthUi,
        openDashboard,
        openSavePlanModal,
        showToast
    };
})(window);
