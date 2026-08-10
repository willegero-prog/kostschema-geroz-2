/**
 * Local account + meal-plan persistence for preview.
 * Data is scoped per user email in localStorage.
 * Structure is API-ready so a future Neon/Clerk backend can replace this adapter.
 */
(function (global) {
    const STORAGE_KEY = 'kostschema_accounts_v1';
    const SESSION_KEY = 'kostschema_session_v1';

    function uid(prefix) {
        return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    }

    function loadStore() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { users: {} };
        } catch {
            return { users: {} };
        }
    }

    function saveStore(store) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    }

    async function hashPassword(password, salt) {
        const enc = new TextEncoder();
        const data = enc.encode(`${salt}:${password}`);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    function getSession() {
        try {
            return JSON.parse(localStorage.getItem(SESSION_KEY));
        } catch {
            return null;
        }
    }

    function setSession(session) {
        if (!session) localStorage.removeItem(SESSION_KEY);
        else localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }

    function currentUser() {
        const session = getSession();
        if (!session || !session.email) return null;
        const store = loadStore();
        const user = store.users[session.email.toLowerCase()];
        if (!user) return null;
        return {
            id: user.id,
            email: user.email,
            name: user.name || '',
            createdAt: user.createdAt
        };
    }

    async function register({ email, password, name }) {
        const normalized = String(email || '').trim().toLowerCase();
        if (!normalized || !normalized.includes('@')) throw new Error('Ange en giltig e-postadress');
        if (!password || password.length < 6) throw new Error('Lösenordet måste vara minst 6 tecken');

        const store = loadStore();
        if (store.users[normalized]) throw new Error('Det finns redan ett konto med den e-postadressen');

        const salt = uid('salt');
        const passwordHash = await hashPassword(password, salt);
        const user = {
            id: uid('user'),
            email: normalized,
            name: (name || '').trim(),
            salt,
            passwordHash,
            createdAt: new Date().toISOString(),
            plans: {}
        };
        store.users[normalized] = user;
        saveStore(store);
        setSession({ email: normalized, userId: user.id });
        return currentUser();
    }

    async function login({ email, password }) {
        const normalized = String(email || '').trim().toLowerCase();
        const store = loadStore();
        const user = store.users[normalized];
        if (!user) throw new Error('Fel e-post eller lösenord');
        const passwordHash = await hashPassword(password, user.salt);
        if (passwordHash !== user.passwordHash) throw new Error('Fel e-post eller lösenord');
        setSession({ email: normalized, userId: user.id });
        return currentUser();
    }

    function logout() {
        setSession(null);
    }

    function requireUser() {
        const user = currentUser();
        if (!user) throw new Error('Du måste vara inloggad');
        return user;
    }

    function withUser(mutator) {
        const user = requireUser();
        const store = loadStore();
        const record = store.users[user.email];
        if (!record) throw new Error('Användaren hittades inte');
        const result = mutator(record);
        saveStore(store);
        return result;
    }

    function listPlans() {
        const user = requireUser();
        const store = loadStore();
        const plans = Object.values(store.users[user.email].plans || {});
        return plans
            .map((p) => ({
                id: p.id,
                name: p.name,
                goal: p.goal,
                startingWeight: p.startingWeight,
                currentWeight: p.currentWeight,
                targetWeight: p.targetWeight,
                calorieTarget: p.calorieTarget,
                updatedAt: p.updatedAt,
                createdAt: p.createdAt,
                lastEvaluatedAt: p.lastEvaluatedAt || null
            }))
            .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    }

    function getPlan(planId) {
        const user = requireUser();
        const store = loadStore();
        const plan = store.users[user.email].plans[planId];
        if (!plan) throw new Error('Kostschemat hittades inte');
        return JSON.parse(JSON.stringify(plan));
    }

    function saveNewPlan(payload) {
        return withUser((user) => {
            const id = uid('plan');
            const now = new Date().toISOString();
            const plan = {
                id,
                userId: user.id,
                name: payload.name.trim(),
                goal: payload.goal,
                gender: payload.gender,
                age: payload.age,
                height: payload.height,
                startingWeight: payload.weight,
                currentWeight: payload.weight,
                targetWeight: payload.targetWeight ?? null,
                activityLevel: payload.activityLevel,
                calorieAdjustment: payload.calorieAdjustment ?? 0,
                bmr: payload.bmr,
                tdee: payload.tdee,
                calorieTarget: payload.calorieTarget,
                macros: payload.macros,
                trainingDays: payload.trainingDays || [],
                snacks: payload.snacks || { snack1: false, snack2: false },
                mealPlanDays: payload.mealPlanDays || [],
                weightLogs: [
                    {
                        id: uid('w'),
                        weight: payload.weight,
                        date: now.slice(0, 10),
                        createdAt: now
                    }
                ],
                adjustments: [],
                versions: [],
                createdAt: now,
                updatedAt: now,
                lastEvaluatedAt: null,
                lastAdjustedAt: null
            };

            // Ensure meal days exist before first version snapshot
            if (!plan.mealPlanDays.length && global.NutritionCore) {
                plan.mealPlanDays = NutritionCore.rebuildMealPlanDays(plan, plan.calorieTarget);
            }
            if (global.NutritionCore) {
                const initial = NutritionCore.createVersionSnapshot(plan, {
                    label: 'Ursprunglig plan',
                    reason: 'Första sparade kostschemat',
                    date: now,
                    fileName: `${(global.MealPlanPDF ? MealPlanPDF.safeFileName(plan.name) : 'kostplan')}-${now.slice(0, 10)}.pdf`
                });
                plan.versions.push(initial);
            }

            user.plans[id] = plan;
            return JSON.parse(JSON.stringify(plan));
        });
    }

    function updatePlan(planId, updater) {
        return withUser((user) => {
            const plan = user.plans[planId];
            if (!plan) throw new Error('Kostschemat hittades inte');
            updater(plan);
            plan.updatedAt = new Date().toISOString();
            return JSON.parse(JSON.stringify(plan));
        });
    }

    function deletePlan(planId) {
        return withUser((user) => {
            if (!user.plans[planId]) throw new Error('Kostschemat hittades inte');
            delete user.plans[planId];
            return true;
        });
    }

    function renamePlan(planId, name) {
        return updatePlan(planId, (plan) => {
            plan.name = String(name || '').trim() || plan.name;
        });
    }

    global.AccountStore = {
        currentUser,
        register,
        login,
        logout,
        listPlans,
        getPlan,
        saveNewPlan,
        updatePlan,
        deletePlan,
        renamePlan
    };
})(window);
