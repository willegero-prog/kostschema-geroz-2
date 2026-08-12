/**
 * Account + meal-plan persistence.
 * Auth identity comes from Clerk (Google / Apple / e-post).
 * Plans are stored per authenticated user id in localStorage.
 */
(function (global) {
    const STORAGE_KEY = 'kostschema_accounts_v2';
    const LEGACY_STORAGE_KEY = 'kostschema_accounts_v1';
    const SESSION_KEY = 'kostschema_session_v1';

    function uid(prefix) {
        return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    }

    function loadStore() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw) || { users: {} };
        } catch { /* fall through */ }

        // One-time migrate from preview local accounts
        try {
            const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || 'null');
            if (legacy?.users) {
                const migrated = { users: {} };
                Object.values(legacy.users).forEach((user) => {
                    if (!user?.id) return;
                    migrated.users[user.id] = {
                        id: user.id,
                        email: user.email,
                        name: user.name || '',
                        createdAt: user.createdAt || new Date().toISOString(),
                        plans: user.plans || {}
                    };
                });
                saveStore(migrated);
                return migrated;
            }
        } catch { /* ignore */ }

        return { users: {} };
    }

    function saveStore(store) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    }

    function ensureUserRecord(user) {
        const store = loadStore();
        if (!store.users[user.id]) {
            store.users[user.id] = {
                id: user.id,
                email: user.email || '',
                name: user.name || '',
                createdAt: new Date().toISOString(),
                plans: {}
            };
            // Import legacy plans if same email existed in old store
            try {
                const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || 'null');
                const email = String(user.email || '').toLowerCase();
                const old = email && legacy?.users ? legacy.users[email] : null;
                if (old?.plans && Object.keys(old.plans).length) {
                    store.users[user.id].plans = { ...old.plans };
                }
            } catch { /* ignore */ }
            saveStore(store);
        } else {
            const record = store.users[user.id];
            if (user.email && record.email !== user.email) record.email = user.email;
            if (user.name && record.name !== user.name) record.name = user.name;
            saveStore(store);
        }
        return store.users[user.id];
    }

    function currentUser() {
        if (global.ClerkAuth?.getUser) {
            const clerkUser = global.ClerkAuth.getUser();
            if (clerkUser?.id) {
                ensureUserRecord(clerkUser);
                return {
                    id: clerkUser.id,
                    email: clerkUser.email || '',
                    name: clerkUser.name || '',
                    provider: 'clerk'
                };
            }
        }

        // Legacy local session (only if Clerk is not active)
        try {
            const session = JSON.parse(localStorage.getItem(SESSION_KEY));
            if (!session?.userId && !session?.email) return null;
            const store = loadStore();
            const user = session.userId
                ? store.users[session.userId]
                : Object.values(store.users).find((u) => u.email === String(session.email || '').toLowerCase());
            if (!user) return null;
            return { id: user.id, email: user.email, name: user.name || '', provider: 'local' };
        } catch {
            return null;
        }
    }

    async function register({ email, password, name }) {
        if (global.ClerkAuth?.signUpWithPassword) {
            const user = await global.ClerkAuth.signUpWithPassword({ email, password, name });
            ensureUserRecord(user);
            return currentUser();
        }
        throw new Error('Skapa konto via Google, Apple eller e-post (Clerk).');
    }

    async function login({ email, password }) {
        if (global.ClerkAuth?.signInWithPassword) {
            const user = await global.ClerkAuth.signInWithPassword({ email, password });
            ensureUserRecord(user);
            return currentUser();
        }
        throw new Error('Logga in via Google, Apple eller e-post (Clerk).');
    }

    async function loginWithOAuth(provider) {
        if (!global.ClerkAuth?.signInWithOAuth) {
            throw new Error('Social inloggning är inte tillgänglig ännu.');
        }
        await global.ClerkAuth.signInWithOAuth(provider);
    }

    async function logout() {
        localStorage.removeItem(SESSION_KEY);
        if (global.ClerkAuth?.signOut) await global.ClerkAuth.signOut();
    }

    function requireUser() {
        const user = currentUser();
        if (!user) throw new Error('Du måste vara inloggad');
        return user;
    }

    function withUser(mutator) {
        const user = requireUser();
        const store = loadStore();
        ensureUserRecord(user);
        const record = store.users[user.id];
        if (!record) throw new Error('Användaren hittades inte');
        const result = mutator(record);
        saveStore(store);
        return result;
    }

    function listPlans() {
        const user = requireUser();
        const store = loadStore();
        ensureUserRecord(user);
        const userRecord = store.users[user.id];
        let dirty = false;
        const plans = Object.values(userRecord.plans || {}).map((p) => {
            const before = p.calorieTarget;
            if (global.NutritionCore) NutritionCore.repairPlanCalories(p);
            if (p.calorieTarget !== before) dirty = true;
            return p;
        });
        if (dirty) saveStore(store);
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
        ensureUserRecord(user);
        const plan = store.users[user.id].plans[planId];
        if (!plan) throw new Error('Kostschemat hittades inte');
        const before = plan.calorieTarget;
        if (global.NutritionCore) NutritionCore.repairPlanCalories(plan);
        if (plan.calorieTarget !== before) saveStore(store);
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

            if (global.NutritionCore) {
                NutritionCore.repairPlanCalories(plan);
                if (!plan.mealPlanDays.length) {
                    plan.mealPlanDays = NutritionCore.rebuildMealPlanDays(plan, plan.calorieTarget);
                }
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
        loginWithOAuth,
        logout,
        listPlans,
        getPlan,
        saveNewPlan,
        updatePlan,
        deletePlan,
        renamePlan
    };
})(window);
