/**
 * Weight logging, weekly averages, trend evaluation, and plan auto-adjustment.
 * Avoids day-to-day noise: uses weekly means and a 14–21 day evaluation window.
 */
(function (global) {
    const EVAL_MIN_DAYS = 14;
    const EVAL_PREFERRED_DAYS = 21;
    const MIN_CHANGE_KG = 0.5;
    const MIN_CHANGE_PCT = 0.006; // 0.6%
    const ADJUST_COOLDOWN_DAYS = 14;

    function toDateOnly(value) {
        if (!value) return null;
        return String(value).slice(0, 10);
    }

    function parseDate(dateStr) {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(Date.UTC(y, m - 1, d));
    }

    function daysBetween(a, b) {
        const ms = parseDate(b) - parseDate(a);
        return Math.round(ms / (24 * 60 * 60 * 1000));
    }

    function isoWeekKey(dateStr) {
        const date = parseDate(dateStr);
        const tmp = new Date(date.getTime());
        tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
        return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    }

    function sortLogs(logs) {
        return [...(logs || [])].sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.createdAt).localeCompare(String(b.createdAt)));
    }

    function weeklyAverages(logs) {
        const groups = {};
        sortLogs(logs).forEach((log) => {
            const key = isoWeekKey(log.date);
            if (!groups[key]) groups[key] = { week: key, weights: [], dates: [] };
            groups[key].weights.push(Number(log.weight));
            groups[key].dates.push(log.date);
        });
        return Object.values(groups)
            .map((g) => ({
                week: g.week,
                average: Math.round((g.weights.reduce((s, w) => s + w, 0) / g.weights.length) * 10) / 10,
                count: g.weights.length,
                startDate: g.dates[0],
                endDate: g.dates[g.dates.length - 1]
            }))
            .sort((a, b) => a.week.localeCompare(b.week));
    }

    function latestWeeklyAverage(logs) {
        const weeks = weeklyAverages(logs);
        return weeks.length ? weeks[weeks.length - 1] : null;
    }

    function weightStats(plan) {
        const logs = sortLogs(plan.weightLogs || []);
        const latestLog = logs.length ? logs[logs.length - 1] : null;
        const week = latestWeeklyAverage(logs);
        const start = plan.startingWeight;
        const current = plan.currentWeight;
        const change = current != null && start != null
            ? Math.round((current - start) * 10) / 10
            : null;

        let trend = 'stabil';
        if (change != null) {
            if (change <= -0.5) trend = 'nedåt';
            else if (change >= 0.5) trend = 'uppåt';
        }

        return {
            startingWeight: start,
            currentWeight: current,
            targetWeight: plan.targetWeight,
            latestLoggedWeight: latestLog ? latestLog.weight : null,
            latestLogDate: latestLog ? latestLog.date : null,
            weeklyAverage: week ? week.average : null,
            weeklyAverageWeek: week ? week.week : null,
            weightChange: change,
            trend,
            logCount: logs.length,
            lastUpdatedAt: plan.updatedAt,
            lastAdjustedAt: plan.lastAdjustedAt
        };
    }

    function goalProgressCopy(plan) {
        const start = plan.startingWeight;
        const target = plan.targetWeight;
        const goal = plan.goal;
        if (goal === 'cut') {
            const targetText = target != null ? ` mot målvikt ${target} kg` : '';
            return `Planen bygger på en gradvis viktminskning från ${start} kg${targetText}. Systemet följer din vikttrend via veckomedelvärden och justerar kalorimålet först när trenden är tydlig över ca 2–3 veckor — inte efter en enstaka invägning.`;
        }
        if (goal === 'bulk') {
            const targetText = target != null ? ` mot målvikt ${target} kg` : '';
            return `Planen bygger på en gradvis viktökning från ${start} kg${targetText}. Kaloriöverskottet hålls relevant genom att energibehovet räknas om när vikttrenden visar en verklig förändring.`;
        }
        return `Planen bygger på viktunderhåll kring ${start} kg. När din faktiska kroppsvikt förändras över tid kan kalorimålet anpassas så att underhållet fortsätter stämma.`;
    }

    function canEvaluate(plan, today = toDateOnly(new Date().toISOString())) {
        const logs = sortLogs(plan.weightLogs || []);
        if (logs.length < 4) {
            return { ok: false, reason: 'Behöver fler invägningar (minst några dagar per vecka).' };
        }
        const first = logs[0].date;
        const span = daysBetween(first, today);
        if (span < EVAL_MIN_DAYS) {
            return { ok: false, reason: `Vänta tills du loggat i minst ${EVAL_MIN_DAYS} dagar (nu ${span}).` };
        }
        if (plan.lastAdjustedAt) {
            const sinceAdj = daysBetween(toDateOnly(plan.lastAdjustedAt), today);
            if (sinceAdj < ADJUST_COOLDOWN_DAYS) {
                return { ok: false, reason: `Senaste justeringen var för nyligen (${sinceAdj} dagar sedan).` };
            }
        }
        return { ok: true };
    }

    function evaluateTrend(plan, today = null) {
        const logsAll = sortLogs(plan.weightLogs || []);
        const referenceDay = today || (logsAll.length ? logsAll[logsAll.length - 1].date : toDateOnly(new Date().toISOString()));
        const gate = canEvaluate(plan, referenceDay);
        if (!gate.ok) {
            return { shouldAdjust: false, reason: gate.reason, stats: weightStats(plan) };
        }

        const logs = logsAll.filter((l) => daysBetween(l.date, referenceDay) <= EVAL_PREFERRED_DAYS + 7);
        const weeks = weeklyAverages(logs);
        if (weeks.length < 2) {
            return { shouldAdjust: false, reason: 'Behöver minst två veckomedelvärden.', stats: weightStats(plan) };
        }

        const older = weeks[Math.max(0, weeks.length - 3)];
        const newer = weeks[weeks.length - 1];
        const delta = Math.round((newer.average - older.average) * 10) / 10;
        const threshold = Math.max(MIN_CHANGE_KG, Math.round(plan.startingWeight * MIN_CHANGE_PCT * 10) / 10);
        const meaningful = Math.abs(delta) >= threshold;

        // Direction should align with goal intent OR be large enough for maintain/recalc
        let aligned = false;
        if (plan.goal === 'cut') aligned = delta <= -threshold || Math.abs(delta) >= threshold;
        else if (plan.goal === 'bulk') aligned = delta >= threshold || Math.abs(delta) >= threshold;
        else aligned = Math.abs(delta) >= threshold;

        if (!meaningful || !aligned) {
            return {
                shouldAdjust: false,
                reason: `Vikttrenden (${delta > 0 ? '+' : ''}${delta} kg mellan veckomedel) är för liten för att justera (tröskel ±${threshold} kg).`,
                delta,
                olderWeek: older,
                newerWeek: newer,
                stats: weightStats(plan)
            };
        }

        return {
            shouldAdjust: true,
            reason: `Tydlig vikttrend: veckomedel ${older.average} → ${newer.average} kg (${delta > 0 ? '+' : ''}${delta} kg).`,
            proposedWeight: newer.average,
            delta,
            olderWeek: older,
            newerWeek: newer,
            stats: weightStats(plan)
        };
    }

    function applyWeightLog(plan, weight, dateStr) {
        const date = toDateOnly(dateStr || new Date().toISOString());
        const numeric = Number(weight);
        if (!numeric || numeric < 20 || numeric > 400) {
            throw new Error('Ange en giltig vikt');
        }
        const existingIdx = (plan.weightLogs || []).findIndex((l) => l.date === date);
        const entry = {
            id: existingIdx >= 0 ? plan.weightLogs[existingIdx].id : `w_${Date.now().toString(36)}`,
            weight: Math.round(numeric * 10) / 10,
            date,
            createdAt: new Date().toISOString()
        };
        if (existingIdx >= 0) plan.weightLogs[existingIdx] = entry;
        else {
            plan.weightLogs = plan.weightLogs || [];
            plan.weightLogs.push(entry);
        }
        plan.weightLogs = sortLogs(plan.weightLogs);
        return entry;
    }

    function adjustPlanFromTrend(plan, evaluation) {
        if (!evaluation || !evaluation.shouldAdjust) return { adjusted: false, plan, evaluation };

        const Nutrition = global.NutritionCore;
        const previous = {
            currentWeight: plan.currentWeight,
            bmr: plan.bmr,
            tdee: plan.tdee,
            calorieTarget: plan.calorieTarget,
            macros: { ...plan.macros }
        };

        const newWeight = evaluation.proposedWeight;
        const bmr = Nutrition.calculateBMR(plan.age, plan.height, newWeight, plan.gender);
        const tdee = Nutrition.calculateTDEE(bmr, plan.activityLevel);
        const calorieTarget = Nutrition.calorieTargetFrom(tdee, plan.goal, plan.calorieAdjustment);
        const macros = Nutrition.macrosForCalories(calorieTarget, plan.goal);
        const mealPlanDays = Nutrition.rebuildMealPlanDays(plan, calorieTarget);

        plan.currentWeight = newWeight;
        plan.bmr = bmr;
        plan.tdee = tdee;
        plan.calorieTarget = calorieTarget;
        plan.macros = macros;
        plan.mealPlanDays = mealPlanDays;
        plan.lastAdjustedAt = new Date().toISOString();
        plan.lastEvaluatedAt = plan.lastAdjustedAt;

        const adjustment = {
            id: `adj_${Date.now().toString(36)}`,
            date: plan.lastAdjustedAt.slice(0, 10),
            createdAt: plan.lastAdjustedAt,
            reason: evaluation.reason,
            previousWeightAverage: evaluation.olderWeek ? evaluation.olderWeek.average : previous.currentWeight,
            newWeightAverage: evaluation.newerWeek ? evaluation.newerWeek.average : newWeight,
            previous: {
                weight: previous.currentWeight,
                bmr: previous.bmr,
                tdee: previous.tdee,
                calorieTarget: previous.calorieTarget
            },
            next: {
                weight: newWeight,
                bmr,
                tdee,
                calorieTarget
            }
        };
        plan.adjustments = plan.adjustments || [];
        plan.adjustments.push(adjustment);

        return { adjusted: true, plan, adjustment, evaluation };
    }

    function evaluateAndMaybeAdjust(plan) {
        const evaluation = evaluateTrend(plan);
        plan.lastEvaluatedAt = new Date().toISOString();
        if (!evaluation.shouldAdjust) {
            return { adjusted: false, plan, evaluation };
        }
        return adjustPlanFromTrend(plan, evaluation);
    }

    global.WeightEngine = {
        EVAL_MIN_DAYS,
        EVAL_PREFERRED_DAYS,
        weeklyAverages,
        latestWeeklyAverage,
        weightStats,
        goalProgressCopy,
        evaluateTrend,
        applyWeightLog,
        adjustPlanFromTrend,
        evaluateAndMaybeAdjust,
        sortLogs
    };
})(window);
