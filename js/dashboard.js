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
                    <p class="dashboard-subtitle">Här hittar du dina sparade kostscheman</p>
                </div>
                <button type="button" class="nav-btn" id="dashboard-back-wizard">Tillbaka till generatorn</button>
            </div>
            <div class="dashboard-section">
                <h3>Mina kostscheman</h3>
                ${plans.length === 0 ? `
                    <div class="dash-empty-card">
                        <p class="dashboard-empty">Du har inga sparade kostscheman ännu.</p>
                        <p class="dashboard-empty">Skapa ett i generatorn och klicka på <strong>Spara kostschema</strong>.</p>
                    </div>
                ` : `
                    <div class="saved-plans-list">
                        ${plans.map((p) => `
                            <button type="button" class="saved-plan-card" data-plan-id="${p.id}">
                                <div class="saved-plan-top">
                                    <span class="saved-plan-name">${escapeHtml(p.name)}</span>
                                    <span class="goal-pill goal-${escapeHtml(p.goal)}">${goalLabel(p.goal)}</span>
                                </div>
                                <div class="saved-plan-highlights">
                                    <span><strong>${formatKg(p.currentWeight)}</strong><small>nuvarande vikt</small></span>
                                    <span><strong>${p.calorieTarget} kcal</strong><small>dagligt mål</small></span>
                                </div>
                                <span class="saved-plan-updated">Senast uppdaterad ${formatDate(p.updatedAt)} · Öppna →</span>
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

    function trendLabel(trend) {
        if (trend === 'nedåt') return 'Går ner';
        if (trend === 'uppåt') return 'Går upp';
        return 'Stabil';
    }

    function renderSparkline(logs) {
        const sorted = WeightEngine.sortLogs(logs).slice(-28);
        if (sorted.length < 2) {
            return '<p class="dashboard-empty">Logga vikt några dagar för att se en enkel trendgraf.</p>';
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
            <div class="sparkline-scale"><span>Lägst ${formatKg(min)}</span><span>Högst ${formatKg(max)}</span></div>
        `;
    }

    function renderPlanDetail(root, plan) {
        const stats = WeightEngine.weightStats(plan);
        const evaluation = WeightEngine.evaluateTrend(plan);
        const weeks = WeightEngine.weeklyAverages(plan.weightLogs || []);
        const adjustments = [...(plan.adjustments || [])].reverse();
        const todayLocal = WeightEngine.localToday();
        const changeText = stats.weightChange == null
            ? '–'
            : `${stats.weightChange > 0 ? '+' : ''}${stats.weightChange} kg sedan start`;

        root.innerHTML = `
            <div class="dashboard-header-row">
                <div>
                    <button type="button" class="text-link-btn" id="back-to-plans">← Mina kostscheman</button>
                    <h2>${escapeHtml(plan.name)}</h2>
                    <p class="dashboard-subtitle">Mål: ${goalLabel(plan.goal)} · Skapad ${formatDate(plan.createdAt)}</p>
                </div>
                <button type="button" class="nav-btn" id="dashboard-back-wizard">Till generatorn</button>
            </div>

            <div class="dash-hero-cards">
                <div class="dash-hero-card">
                    <span class="dash-hero-label">Nuvarande vikt</span>
                    <span class="dash-hero-value">${formatKg(stats.currentWeight)}</span>
                    <span class="dash-hero-sub">Start ${formatKg(stats.startingWeight)}${stats.targetWeight != null ? ` · Mål ${formatKg(stats.targetWeight)}` : ''}</span>
                </div>
                <div class="dash-hero-card accent">
                    <span class="dash-hero-label">Dagens kalorimål</span>
                    <span class="dash-hero-value">${plan.calorieTarget} kcal</span>
                    <span class="dash-hero-sub">Uppdateras när vikttrenden är tydlig</span>
                </div>
                <div class="dash-hero-card">
                    <span class="dash-hero-label">Vikttrend</span>
                    <span class="dash-hero-value small">${trendLabel(stats.trend)}</span>
                    <span class="dash-hero-sub">${changeText} · Veckomedel ${formatKg(stats.weeklyAverage)}</span>
                </div>
            </div>

            <div class="dashboard-section">
                <h3>1. Logga dagens vikt</h3>
                <p class="section-help">Skriv in morgonvikten. Datumet är redan satt till idag.</p>
                <div class="weight-log-form">
                    <div class="form-group">
                        <label for="dash-weight-input">Dagens vikt (kg)</label>
                        <input type="number" id="dash-weight-input" min="20" max="400" step="0.1" placeholder="t.ex. 79.6" inputmode="decimal">
                    </div>
                    <div class="form-group">
                        <label for="dash-weight-date">Datum</label>
                        <input type="date" id="dash-weight-date" value="${todayLocal}">
                        <small id="dash-date-hint">Idag (${formatDate(todayLocal)})</small>
                    </div>
                    <button type="button" class="nav-btn primary" id="dash-log-weight">Spara dagens vikt</button>
                </div>
                <div id="weight-outlier-warning" class="weight-outlier-warning" hidden role="alert"></div>
                <div class="status-banner">
                    <strong>Status:</strong> ${escapeHtml(evaluation.reason || 'Fortsätt logga vikt regelbundet.')}
                </div>
            </div>

            <div class="dashboard-section">
                <h3>2. Din viktutveckling</h3>
                <p class="section-help">Enkel översikt över hur vikten rör sig över tid.</p>
                ${renderSparkline(plan.weightLogs)}
                <div class="weekly-averages">
                    <p class="week-avg-title">Senaste veckomedelvärden</p>
                    ${weeks.slice(-6).map((w) => `
                        <div class="week-avg-row">
                            <span>Vecka ${escapeHtml(w.week.split('-W')[1] || w.week)}</span>
                            <span><strong>${formatKg(w.average)}</strong> <small>${w.count} invägningar</small></span>
                        </div>
                    `).join('') || '<p class="dashboard-empty">Inga veckomedel ännu — logga vikt några dagar först.</p>'}
                </div>
                <p class="plan-explainer">${escapeHtml(WeightEngine.goalProgressCopy(plan))}</p>
            </div>

            <div class="dashboard-section">
                <h3>3. Ditt kostschema just nu</h3>
                <p class="section-help">Detta är vad planen använder efter senaste beräkningen.</p>
                <div class="dash-simple-grid">
                    <div class="dash-simple-item"><span>Kalorimål</span><strong>${plan.calorieTarget} kcal</strong></div>
                    <div class="dash-simple-item"><span>BMR</span><strong>${plan.bmr} kcal</strong></div>
                    <div class="dash-simple-item"><span>TDEE</span><strong>${plan.tdee} kcal</strong></div>
                    <div class="dash-simple-item"><span>Protein</span><strong>${plan.macros.proteinG}g</strong></div>
                    <div class="dash-simple-item"><span>Kolhydrater</span><strong>${plan.macros.carbsG}g</strong></div>
                    <div class="dash-simple-item"><span>Fett</span><strong>${plan.macros.fatG}g</strong></div>
                </div>
                <button type="button" class="download-btn dash-download-btn" id="dash-download-current-pdf">Ladda ned som PDF</button>
                <details class="dash-details">
                    <summary>Visa veckans dagar</summary>
                    <div class="saved-day-list">
                        ${(plan.mealPlanDays || []).map((day) => `
                            <div class="day-section compact-day">
                                <div class="day-header">
                                    <div>
                                        <span class="day-name">${day.name}</span>
                                        <span class="day-calories" style="font-size: 0.9rem; color: var(--text-secondary); margin-left: 10px;">${day.calories} kcal</span>
                                    </div>
                                    <span class="day-type ${day.isTrainingDay ? '' : 'rest'}">${day.isTrainingDay ? 'Träning' : 'Vila'}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </details>
            </div>

            <div class="dashboard-section">
                <h3>4. Sparade PDF-versioner</h3>
                <p class="section-help">Varje gång planen uppdateras sparas en ny PDF-version så du kan se tidigare kostscheman.</p>
                ${(!(plan.versions || []).length) ? `
                    <p class="dashboard-empty">Inga sparade versioner ännu.</p>
                ` : `
                    <div class="version-list">
                        ${[...(plan.versions || [])].reverse().map((v, idx) => `
                            <div class="version-item">
                                <div class="version-main">
                                    <strong>${escapeHtml(v.label || 'Kostschema')}</strong>
                                    <span>${formatDate(v.date)} · ${v.calorieTarget} kcal · ${formatKg(v.weight)}</span>
                                    <small>${escapeHtml(v.reason || '')}</small>
                                </div>
                                <button type="button" class="nav-btn version-download-btn" data-version-id="${v.id}">
                                    ${idx === 0 ? 'Ladda ned senaste PDF' : 'Ladda ned PDF'}
                                </button>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>

            <div class="dashboard-section">
                <h3>5. När systemet ändrat planen</h3>
                ${adjustments.length === 0 ? `
                    <p class="dashboard-empty">Inga automatiska justeringar ännu. Fortsätt logga vikt i cirka 2–3 veckor.</p>
                ` : `
                    <div class="adjustment-list">
                        ${adjustments.map((a) => `
                            <div class="adjustment-item">
                                <strong>${formatDate(a.date)}</strong>
                                <p>Viktmedel: ${formatKg(a.previousWeightAverage)} → ${formatKg(a.newWeightAverage)}</p>
                                <p>Nytt kalorimål: ${a.previous.calorieTarget} → <strong>${a.next.calorieTarget} kcal</strong></p>
                                <small>${escapeHtml(a.reason || '')}</small>
                                ${a.versionId ? `<button type="button" class="text-link-btn version-download-btn" data-version-id="${a.versionId}">Ladda ned PDF för denna uppdatering</button>` : ''}
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

        async function downloadVersionPdf(versionId) {
            try {
                let version = (plan.versions || []).find((v) => v.id === versionId);
                if (!version) {
                    // Fallback: current plan as live version
                    version = NutritionCore.createVersionSnapshot(plan, {
                        label: 'Aktuell plan',
                        reason: 'Nedladdning av aktuell version'
                    });
                }
                const pdfId = `${plan.id}:${version.id}`;
                const stored = await PlanPdfStore.getPdf(pdfId);
                if (stored?.blob) {
                    await PlanPdfStore.downloadStoredPdf(pdfId);
                    showToast('PDF nedladdad');
                    return;
                }
                const saved = await PlanPdfStore.ensurePdfForVersion(plan, version);
                // Persist filename onto version if newly created
                AccountStore.updatePlan(plan.id, (p) => {
                    p.versions = p.versions || [];
                    const target = p.versions.find((v) => v.id === version.id);
                    if (target) target.fileName = saved.fileName || target.fileName;
                    else p.versions.push(version);
                });
                await PlanPdfStore.downloadStoredPdf(pdfId);
                showToast('PDF nedladdad');
            } catch (err) {
                showToast(err.message || 'Kunde inte ladda ned PDF', true);
            }
        }

        $('dash-download-current-pdf')?.addEventListener('click', async () => {
            try {
                const live = NutritionCore.createVersionSnapshot(plan, {
                    label: 'Aktuell plan',
                    reason: 'Senaste kalorier och makron',
                    date: plan.updatedAt || new Date().toISOString()
                });
                const versions = plan.versions || [];
                const latest = versions[versions.length - 1];
                const target = (!latest || latest.calorieTarget !== plan.calorieTarget) ? live : latest;

                AccountStore.updatePlan(plan.id, (p) => {
                    p.versions = p.versions || [];
                    if (!p.versions.some((v) => v.id === target.id)) {
                        // Replace transient live id only when needed
                        if (target === live) p.versions.push(live);
                    }
                });
                const refreshed = AccountStore.getPlan(plan.id);
                const version = refreshed.versions.find((v) => v.id === target.id)
                    || refreshed.versions[refreshed.versions.length - 1]
                    || target;
                await PlanPdfStore.ensurePdfForVersion(refreshed, version);
                await PlanPdfStore.downloadStoredPdf(`${plan.id}:${version.id}`);
                showToast('PDF nedladdad');
                renderDashboard();
            } catch (err) {
                try {
                    MealPlanPDF.exportMealPlanPdf(NutritionCore.toPdfPlan(plan));
                    showToast('PDF nedladdad');
                } catch (e2) {
                    showToast(e2.message || 'Kunde inte ladda ned PDF', true);
                }
            }
        });

        root.querySelectorAll('.version-download-btn').forEach((btn) => {
            btn.addEventListener('click', () => downloadVersionPdf(btn.dataset.versionId));
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
        dateInput?.addEventListener('change', () => {
            const hint = $('dash-date-hint');
            if (!hint || !dateInput) return;
            if (dateInput.value === todayLocal) {
                hint.textContent = `Idag (${formatDate(todayLocal)})`;
            } else {
                hint.textContent = `Valt datum: ${formatDate(dateInput.value)}`;
            }
        });

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
                AccountStore.updatePlan(plan.id, (p) => {
                    WeightEngine.applyWeightLog(p, weight, date);
                    const result = WeightEngine.evaluateAndMaybeAdjust(p);
                    if (result.adjusted) {
                        adjustedVersion = result.version || null;
                        showToast(`Kostschemat uppdaterades till ${result.adjustment.next.calorieTarget} kcal`);
                    } else {
                        showToast('Dagens vikt sparad');
                    }
                });
                if (adjustedVersion) {
                    const refreshed = AccountStore.getPlan(plan.id);
                    PlanPdfStore.ensurePdfForVersion(refreshed, adjustedVersion).catch(() => {});
                    // Also ensure previous latest-1 is stored
                    const versions = refreshed.versions || [];
                    if (versions.length >= 2) {
                        PlanPdfStore.ensurePdfForVersion(refreshed, versions[versions.length - 2]).catch(() => {});
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
                    if (!p.mealPlanDays || !p.mealPlanDays.length) {
                        p.mealPlanDays = NutritionCore.rebuildMealPlanDays(p, p.calorieTarget);
                    }
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
                if (version) {
                    PlanPdfStore.ensurePdfForVersion(refreshed, version).catch(() => {});
                }
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
