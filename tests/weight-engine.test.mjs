/**
 * Headless checks for nutrition + weight trend logic (no browser).
 * Run: node tests/weight-engine.test.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadScripts(files) {
    const sandbox = { console };
    sandbox.window = sandbox;
    const ctx = createContext(sandbox);
    for (const file of files) {
        runInContext(readFileSync(path.join(root, file), 'utf8'), ctx);
    }
    return sandbox;
}

const sandbox = loadScripts(['js/nutrition-core.js', 'js/weight-engine.js']);
const { calculateBMR, calorieTargetFrom } = sandbox.NutritionCore;
const { weeklyAverages, evaluateTrend, applyWeightLog, evaluateAndMaybeAdjust } = sandbox.WeightEngine;

assert.equal(calculateBMR(23, 183, 80, 'male'), 1834);
assert.equal(calculateBMR(23, 183, 80, 'female'), 1668);
assert.equal(calorieTargetFrom(2843, 'cut', 400), 2443);
assert.equal(calorieTargetFrom(2500, 'bulk', 500), 3000);

const brokenBulk = {
    goal: 'bulk',
    gender: 'male',
    age: 23,
    height: 175,
    startingWeight: 69,
    currentWeight: 69,
    activityLevel: 'moderate',
    calorieAdjustment: 500,
    bmr: null,
    tdee: null,
    calorieTarget: 500,
    macros: { proteinG: 31, carbsG: 69, fatG: 11 },
    trainingDays: ['monday'],
    snacks: { snack1: false, snack2: false },
    mealPlanDays: [{ name: 'Måndag', calories: 475, meals: [] }]
};
sandbox.NutritionCore.repairPlanCalories(brokenBulk);
assert.ok(brokenBulk.tdee > 2000, 'TDEE should be recalculated');
assert.equal(brokenBulk.calorieTarget, brokenBulk.tdee + 500);
assert.ok(brokenBulk.calorieTarget !== 500);
assert.ok(brokenBulk.macros.proteinG > 100);
assert.ok(brokenBulk.mealPlanDays[0].calories > 1000);

const plan = {
    goal: 'cut',
    gender: 'male',
    age: 23,
    height: 183,
    startingWeight: 80,
    currentWeight: 80,
    targetWeight: 75,
    activityLevel: 'moderate',
    calorieAdjustment: 400,
    bmr: 1834,
    tdee: 2843,
    calorieTarget: 2443,
    macros: { proteinPct: 35, carbsPct: 45, fatPct: 20, proteinG: 214, carbsG: 275, fatG: 54 },
    trainingDays: ['monday', 'wednesday', 'friday'],
    snacks: { snack1: false, snack2: false },
    mealPlanDays: [],
    weightLogs: [],
    adjustments: [],
    lastAdjustedAt: null
};

const start = new Date('2026-07-01');
for (let i = 0; i < 21; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const date = d.toISOString().slice(0, 10);
    const weightKg = Math.round((80 - i * 0.08) * 10) / 10;
    applyWeightLog(plan, weightKg, date);
}

assert.ok(weeklyAverages(plan.weightLogs).length >= 3);

const evaluation = evaluateTrend(plan, '2026-07-21');
assert.equal(evaluation.shouldAdjust, true, evaluation.reason);

const result = evaluateAndMaybeAdjust(plan);
assert.equal(result.adjusted, true);
assert.ok(result.plan.currentWeight < 80);
assert.ok(result.plan.adjustments.length === 1);
assert.ok(result.plan.calorieTarget > 0);

const noisy = {
    ...structuredClone(plan),
    currentWeight: 80,
    bmr: 1834,
    tdee: 2843,
    calorieTarget: 2443,
    weightLogs: [],
    adjustments: [],
    lastAdjustedAt: null,
    lastEvaluatedAt: null
};
['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04'].forEach((date, i) => {
    applyWeightLog(noisy, 80 + (i % 2 === 0 ? 0.2 : -0.1), date);
});
assert.equal(evaluateTrend(noisy, '2026-08-04').shouldAdjust, false);

const outlier = sandbox.WeightEngine.detectWeightOutlier(plan, 90);
assert.equal(outlier.isOutlier, true);
assert.match(outlier.message, /avvikande/i);
assert.equal(sandbox.WeightEngine.detectWeightOutlier(plan, plan.currentWeight).isOutlier, false);

const local = sandbox.WeightEngine.localToday();
assert.match(local, /^\d{4}-\d{2}-\d{2}$/);

console.log('All weight/nutrition tests passed');
