# Future server API

Preview uses browser-local accounts (`js/account-store.js`).
When you are ready for multi-device sync on production, wire Neon/Clerk (or similar)
here and swap AccountStore to call these endpoints — without changing the UI.
