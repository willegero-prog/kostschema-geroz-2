/**
 * IndexedDB store for generated meal-plan PDF blobs per version.
 */
(function (global) {
    const DB_NAME = 'kostschema_pdfs_v1';
    const STORE = 'pdfs';

    function openDb() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(STORE)) {
                    db.createObjectStore(STORE, { keyPath: 'id' });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error || new Error('Kunde inte öppna PDF-lagring'));
        });
    }

    async function savePdf({ id, planId, versionId, fileName, blob }) {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put({
                id,
                planId,
                versionId,
                fileName,
                blob,
                savedAt: new Date().toISOString()
            });
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error || new Error('Kunde inte spara PDF'));
        });
    }

    async function getPdf(id) {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readonly');
            const req = tx.objectStore(STORE).get(id);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error || new Error('Kunde inte hämta PDF'));
        });
    }

    async function downloadStoredPdf(id) {
        const record = await getPdf(id);
        if (!record || !record.blob) return false;
        const url = URL.createObjectURL(record.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = record.fileName || 'kostplan.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return true;
    }

    async function ensurePdfForVersion(savedPlan, version) {
        const pdfId = `${savedPlan.id}:${version.id}`;
        const existing = await getPdf(pdfId);
        if (existing?.blob) return existing;

        const payload = NutritionCore.toPdfPlan(savedPlan, version);
        const result = MealPlanPDF.exportMealPlanPdf(payload, {
            returnBlob: true,
            fileName: version.fileName || `${MealPlanPDF.safeFileName(savedPlan.name)}-${version.date}.pdf`
        });
        version.fileName = result.fileName;
        await savePdf({
            id: pdfId,
            planId: savedPlan.id,
            versionId: version.id,
            fileName: result.fileName,
            blob: result.blob
        });
        return { id: pdfId, fileName: result.fileName, blob: result.blob };
    }

    global.PlanPdfStore = {
        savePdf,
        getPdf,
        downloadStoredPdf,
        ensurePdfForVersion
    };
})(window);
