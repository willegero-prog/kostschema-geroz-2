/**
 * Public auth config for the static frontend.
 * Set CLERK_PUBLISHABLE_KEY (or NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) in Vercel.
 */
module.exports = function handler(req, res) {
    const publishableKey =
        process.env.CLERK_PUBLISHABLE_KEY
        || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
        || process.env.VITE_CLERK_PUBLISHABLE_KEY
        || '';

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({
        publishableKey,
        configured: Boolean(publishableKey),
        providers: ['google', 'apple', 'email_password']
    });
};
