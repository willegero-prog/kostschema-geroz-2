/**
 * Clerk-powered Google / Apple / email auth for the static site.
 */
(function (global) {
    let clerkReady = null;
    let publishableKey = '';
    const listeners = new Set();

    function notify() {
        listeners.forEach((fn) => {
            try { fn(getUser()); } catch (_) { /* ignore */ }
        });
    }

    function onAuthChange(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    }

    function deriveFrontendApi(key) {
        try {
            const part = String(key || '').split('_')[2];
            if (!part) return null;
            // Clerk publishable keys encode "<frontend-api>$"
            return atob(part).replace(/\$$/, '');
        } catch {
            return null;
        }
    }

    async function fetchConfig() {
        try {
            const res = await fetch('/api/auth-config', { credentials: 'same-origin' });
            if (!res.ok) throw new Error('auth-config failed');
            return await res.json();
        } catch {
            return {
                publishableKey: global.CLERK_PUBLISHABLE_KEY || '',
                configured: Boolean(global.CLERK_PUBLISHABLE_KEY)
            };
        }
    }

    function loadClerkScript(key, fapi) {
        return new Promise((resolve, reject) => {
            const existing = document.querySelector('script[data-clerk-publishable-key]');
            if (existing && global.Clerk) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = `https://${fapi}/npm/@clerk/clerk-js@5/dist/clerk.browser.js`;
            script.async = true;
            script.crossOrigin = 'anonymous';
            script.setAttribute('data-clerk-publishable-key', key);
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Kunde inte ladda Clerk'));
            document.head.appendChild(script);
        });
    }

    async function ensureClerk() {
        if (clerkReady) return clerkReady;
        clerkReady = (async () => {
            const config = await fetchConfig();
            publishableKey = config.publishableKey || '';
            if (!publishableKey) {
                throw new Error('Inloggning är inte konfigurerad ännu. Lägg till CLERK_PUBLISHABLE_KEY i Vercel.');
            }

            const fapi = deriveFrontendApi(publishableKey);
            if (!fapi) throw new Error('Ogiltig Clerk-nyckel');

            if (!global.Clerk) {
                await loadClerkScript(publishableKey, fapi);
            }

            // Wait briefly for CDN global
            let tries = 0;
            while (!global.Clerk && tries < 40) {
                await new Promise((r) => setTimeout(r, 50));
                tries += 1;
            }

            if (!global.Clerk) throw new Error('Clerk SDK laddades inte');

            if (typeof global.Clerk === 'function') {
                global.Clerk = new global.Clerk(publishableKey);
            }

            if (!global.Clerk.loaded) {
                await global.Clerk.load({
                    afterSignOutUrl: window.location.href.split('#')[0]
                });
            }

            global.Clerk.addListener?.(() => notify());
            notify();
            return global.Clerk;
        })().catch((err) => {
            clerkReady = null;
            throw err;
        });
        return clerkReady;
    }

    function getUser() {
        const clerk = global.Clerk;
        if (!clerk || !clerk.user) return null;
        const u = clerk.user;
        const email =
            u.primaryEmailAddress?.emailAddress
            || u.emailAddresses?.[0]?.emailAddress
            || '';
        return {
            id: u.id,
            email,
            name: u.fullName || u.firstName || email.split('@')[0] || '',
            imageUrl: u.imageUrl || null,
            provider: 'clerk'
        };
    }

    function isSignedIn() {
        return Boolean(global.Clerk?.user);
    }

    async function signInWithOAuth(provider) {
        const clerk = await ensureClerk();
        const strategy = provider === 'apple' ? 'oauth_apple' : 'oauth_google';
        const redirectUrl = `${window.location.origin}${window.location.pathname}`;
        await clerk.client.signIn.authenticateWithRedirect({
            strategy,
            redirectUrl,
            redirectUrlComplete: redirectUrl
        });
    }

    async function signInWithPassword({ email, password }) {
        const clerk = await ensureClerk();
        const result = await clerk.client.signIn.create({
            identifier: email,
            password
        });
        if (result.status === 'complete') {
            await clerk.setActive({ session: result.createdSessionId });
            notify();
            return getUser();
        }
        throw new Error('Kunde inte logga in. Kontrollera e-post och lösenord.');
    }

    async function signUpWithPassword({ email, password, name }) {
        const clerk = await ensureClerk();
        const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
        const result = await clerk.client.signUp.create({
            emailAddress: email,
            password,
            firstName: parts[0] || undefined,
            lastName: parts.slice(1).join(' ') || undefined
        });

        if (result.status === 'complete') {
            await clerk.setActive({ session: result.createdSessionId });
            notify();
            return getUser();
        }

        // Email verification may be required depending on Clerk settings
        if (result.status === 'missing_requirements') {
            throw new Error('Kontrollera din e-post för att slutföra kontot, eller logga in med Google/Apple.');
        }
        throw new Error('Kunde inte skapa konto.');
    }

    async function signOut() {
        if (!global.Clerk) return;
        await global.Clerk.signOut({ redirectUrl: window.location.href.split('#')[0] });
        notify();
    }

    async function init() {
        try {
            await ensureClerk();
            return { configured: true, user: getUser() };
        } catch (err) {
            return { configured: false, error: err.message, user: null };
        }
    }

    global.ClerkAuth = {
        init,
        ensureClerk,
        getUser,
        isSignedIn,
        signInWithOAuth,
        signInWithPassword,
        signUpWithPassword,
        signOut,
        onAuthChange
    };
})(window);
