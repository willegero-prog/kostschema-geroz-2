/**
 * Dashboard + auth UI layered onto the existing glass design.
 */
(function (global) {
    let activePlanId = null;

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
        const modal = $('auth-modal');
        if (modal) modal.classList.remove('active');
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
            renderDashboard();
        } catch (err) {
            showToast(err.message || 'Något gick fel', true);
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
        renderDashboard();
    }

    function closeDashboard() {
        const view = $('dashboard-view');
        const wizard = $('wizard-view');
        if (view) view.style.display = 'none';
        if (wizard) wizard.style.display = 'block';
        activePlanId = null;
    }

    function renderDashboard() {
        const root = $('dashboard-content');
        if (!root || !AccountStore.currentUser()) return;

        if (activePlanId) {
            try {
                renderPlanDetail(root, AccountStore.getPlan(activePlanId));
            } catch (err) {
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
                    <p class="dashboard-subtitle">Dina sparade kostscheman och viktuppföljning</p>
                </div>
                <button type="button" class="nav-btn" id="dashboard-back-wizard">Tillbaka till generatorn</button>
            </div>
            <div class="dashboard-section">
                <h3>Mina kostscheman</h3>
                ${plans.length === 0 ? `
                    <p class="dashboard-empty">Du har inga sparade kostscheman ännu. Skapa ett i generatorn och spara det till ditt konto.</p>
                ` : `
                    <div class="saved-plans-list">
                        ${plans.map((p) => `
                            <button type="button" class="saved-plan-card" data-plan-id="${p.id}">
                                <span class="saved-plan-name">${escapeHtml(p.name)}</span>
                                <span class="saved-plan-meta">${goalLabel(p.goal)} · ${formatKg(p.currentWeight)} · ${p.calorieTarget} kcal</span>
                                <span class="saved-plan-updated">Uppdaterad ${formatDate(p.updatedAt)}</span>
                            </button>
                        `).join('')}
                    </div>
                `}
            </div>
        `;

        $('dashboard-back-wizard')?.addEventListener('click', closeDashboard);
        root.querySelectorAll('.saved-plan-card').forEach((btn) => {
            btn.addEventListener('click', () => {
                activePlanId = btn.dataset.planId;
                renderDashboard();
            });
        });
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function renderSparkline(logs) {
        const sorted = WeightEngine.sortLogs(logs).slice(-28);
        if (sorted.length < 2) {
            return '<p class="dashboard-empty">Logga vikt några dagar för att se en trendgraf.</p>';
        }
        const weights = sorted.map((l) => l.weight);
        const min = Math.min(...weights);
        const max = Math.max(...weights);
        const span = Math.max(max - min, 0.5);
        const w = 320;
        const h = 90;
        const points = sorted.map((l, i) => {
            const x = (i / (sorted.length - 1)) * (w - 10) + 5;
            const y = h - 10 - ((l.weight - min) / span) * (h - 20);
            return `${x},${y}`;
        }).join(' ');
        return `
            <svg class="weight-sparkline" viewBox="0 0 ${w} ${h}" role="img" aria-label="Vikttrend">
                <polyline fill="none" stroke="rgba(0,122,255,0.9)" stroke-width="2.5" points="${points}"></polyline>
            </svg>
            <div class="sparkline-scale"><span>${formatKg(min)}</span><span>${formatKg(max)}</span></div>
        `;
    }

    function renderPlanDetail(root, plan) {
        const stats = WeightEngine.weightStats(plan);
        const evaluation = WeightEngine.evaluateTrend(plan);
        const weeks = WeightEngine.weeklyAverages(plan.weightLogs || []);
        const adjustments = [...(plan.adjustments || [])].reverse();

        root.innerHTML = `
            <div class="dashboard-header-row">
                <div>
                    <button type="button" class="text-link-btn" id="back-to-plans">← Mina kostscheman</button>
                    <h2>${escapeHtml(plan.name)}</h2>
                    <p class="dashboard-subtitle">${goalLabel(plan.goal)} · skapad ${formatDate(plan.createdAt)}</p>
                </div>
                <button type="button" class="nav-btn" id="dashboard-back-wizard">Till generatorn</button>
            </div>

            <div class="dashboard-section">
                <h3>Översikt</h3>
                <div class="plan-info dashboard-stats">
                    <div class="info-item"><span class="info-label">Startvikt</span><span class="info-value">${formatKg(stats.startingWeight)}</span></div>
                    <div class="info-item"><span class="info-label">Nuvarande vikt</span><span class="info-value">${formatKg(stats.currentWeight)}</span></div>
                    <div class="info-item"><span class="info-label">Målvikt</span><span class="info-value">${formatKg(stats.targetWeight)}</span></div>
                    <div class="info-item"><span class="info-label">Veckomedel</span><span class="info-value">${formatKg(stats.weeklyAverage)}</span></div>
                    <div class="info-item"><span class="info-label">Viktförändring</span><span class="info-value">${stats.weightChange == null ? '–' : `${stats.weightChange > 0 ? '+' : ''}${stats.weightChange} kg`}</span></div>
                    <div class="info-item"><span class="info-label">Vikttrend</span><span class="info-value">${stats.trend}</span></div>
                    <div class="info-item"><span class="info-label">Kalorimål</span><span class="info-value">${plan.calorieTarget} kcal</span></div>
                    <div class="info-item"><span class="info-label">Senast uppdaterad</span><span class="info-value">${formatDate(stats.lastUpdatedAt)}</span></div>
                </div>
                <p class="plan-explainer">${escapeHtml(WeightEngine.goalProgressCopy(plan))}</p>
            </div>

            <div class="dashboard-section">
                <h3>Logga dagens vikt</h3>
                <div class="weight-log-form">
                    <div class="form-group">
                        <label for="dash-weight-input">Vikt (kg)</label>
                        <input type="number" id="dash-weight-input" min="20" max="400" step="0.1" placeholder="t.ex. 79.6" inputmode="decimal">
                    </div>
                    <div class="form-group">
                        <label for="dash-weight-date">Datum</label>
                        <input type="date" id="dash-weight-date" value="${new Date().toISOString().slice(0, 10)}">
                    </div>
                    <button type="button" class="nav-btn primary" id="dash-log-weight">Spara invägning</button>
                </div>
                <p class="trend-status">${escapeHtml(evaluation.reason || '')}</p>
            </div>

            <div class="dashboard-section">
                <h3>Viktutveckling</h3>
                ${renderSparkline(plan.weightLogs)}
                <div class="weekly-averages">
                    ${weeks.slice(-6).map((w) => `
                        <div class="week-avg-row">
                            <span>${w.week}</span>
                            <span>${formatKg(w.average)} <small>(${w.count} invägningar)</small></span>
                        </div>
                    `).join('') || '<p class="dashboard-empty">Inga veckomedel ännu.</p>'}
                </div>
            </div>

            <div class="dashboard-section">
                <h3>Aktuellt kostschema</h3>
                <div class="plan-info">
                    <div class="info-item"><span class="info-label">BMR</span><span class="info-value">${plan.bmr} kcal</span></div>
                    <div class="info-item"><span class="info-label">TDEE</span><span class="info-value">${plan.tdee} kcal</span></div>
                    <div class="info-item"><span class="info-label">Protein</span><span class="info-value">${plan.macros.proteinG}g (${plan.macros.proteinPct}%)</span></div>
                    <div class="info-item"><span class="info-label">Kolhydrater</span><span class="info-value">${plan.macros.carbsG}g (${plan.macros.carbsPct}%)</span></div>
                    <div class="info-item"><span class="info-label">Fett</span><span class="info-value">${plan.macros.fatG}g (${plan.macros.fatPct}%)</span></div>
                </div>
                <div class="saved-day-list">
                    ${(plan.mealPlanDays || []).map((day) => `
                        <div class="day-section compact-day">
                            <div class="day-header">
                                <div>
                                    <span class="day-name">${day.name}</span>
                                    <span class="day-calories" style="font-size: 0.9rem; color: var(--text-secondary); margin-left: 10px;">${day.calories} kcal</span>
                                </div>
                                <span class="day-type ${day.isTrainingDay ? '' : 'rest'}">${day.isTrainingDay ? 'Träningsdag' : 'Vilodag'}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="dashboard-section">
                <h3>Justeringshistorik</h3>
                ${adjustments.length === 0 ? `
                    <p class="dashboard-empty">Inga automatiska justeringar ännu. Fortsätt logga vikt i 2–3 veckor.</p>
                ` : `
                    <div class="adjustment-list">
                        ${adjustments.map((a) => `
                            <div class="adjustment-item">
                                <strong>${formatDate(a.date)}</strong>
                                <p>Viktmedel: ${formatKg(a.previousWeightAverage)} → ${formatKg(a.newWeightAverage)}</p>
                                <p>Kalorimål: ${a.previous.calorieTarget} → ${a.next.calorieTarget} kcal</p>
                                <small>${escapeHtml(a.reason || '')}</small>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;

        $('back-to-plans')?.addEventListener('click', () => {
            activePlanId = null;
            renderDashboard();
        });
        $('dashboard-back-wizard')?.addEventListener('click', closeDashboard);
        $('dash-log-weight')?.addEventListener('click', () => {
            try {
                const weight = parseFloat($('dash-weight-input').value);
                const date = $('dash-weight-date').value;
                AccountStore.updatePlan(plan.id, (p) => {
                    WeightEngine.applyWeightLog(p, weight, date);
                    const result = WeightEngine.evaluateAndMaybeAdjust(p);
                    if (result.adjusted) {
                        showToast(`Kostschemat uppdaterades till ${result.adjustment.next.calorieTarget} kcal`);
                    } else {
                        showToast('Vikt sparad');
                    }
                });
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
        if (input && !input.value) {
            const goal = global.state.goal;
            input.value = goal === 'cut' ? 'Min deff' : goal === 'bulk' ? 'Bulk 2026' : 'Mitt underhåll';
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
            const plan = st.mealPlan;
            const calorieTarget = NutritionCore.calorieTargetFrom(st.tdee, st.goal, st.calorieAdjustment);
            const macros = NutritionCore.macrosForCalories(calorieTarget, st.goal);
            const targetWeight = st.targetWeight != null && !Number.isNaN(Number(st.targetWeight))
                ? Number(st.targetWeight)
                : (parseFloat($('target-weight')?.value) || null);

            AccountStore.saveNewPlan({
                name,
                goal: st.goal,
                gender: st.gender,
                age: st.age,
                height: st.height,
                weight: st.weight,
                targetWeight,
                activityLevel: st.activityLevel,
                calorieAdjustment: st.goal === 'maintain' ? 0 : st.calorieAdjustment,
                bmr: st.bmr,
                tdee: st.tdee,
                calorieTarget,
                macros,
                trainingDays: st.trainingDays,
                snacks: st.snacks,
                mealPlanDays: []
            });

            const savedList = AccountStore.listPlans();
            const latest = savedList[0];
            if (latest) {
                AccountStore.updatePlan(latest.id, (p) => {
                    p.mealPlanDays = NutritionCore.rebuildMealPlanDays(p, p.calorieTarget);
                });
            }

            closeSavePlanModal();
            showToast(`Sparade “${name}”`);
            openDashboard();
            if (latest) {
                activePlanId = latest.id;
                renderDashboard();
            }
        } catch (err) {
            showToast(err.message || 'Kunde inte spara', true);
        }
    }

    function initAccountUi() {
        refreshAuthUi();
        $('auth-login-btn')?.addEventListener('click', () => openAuthModal('login'));
        $('auth-dashboard-btn')?.addEventListener('click', openDashboard);
        $('auth-logout-btn')?.addEventListener('click', () => {
            AccountStore.logout();
            refreshAuthUi();
            closeDashboard();
            showToast('Utloggad');
        });
        $('auth-modal-close')?.addEventListener('click', closeAuthModal);
        $('auth-mode-login')?.addEventListener('click', () => setAuthMode('login'));
        $('auth-mode-register')?.addEventListener('click', () => setAuthMode('register'));
        $('auth-form')?.addEventListener('submit', handleAuthSubmit);
        $('auth-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'auth-modal') closeAuthModal();
        });

        $('save-plan-btn')?.addEventListener('click', openSavePlanModal);
        // Delegated binding for dynamically injected save button on step 6
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
