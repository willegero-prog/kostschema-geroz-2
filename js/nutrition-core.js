/**
 * Shared nutrition calculations — mirrors script.js Mifflin-St Jeor + activity logic.
 * Used by saved-plan updates without changing the existing wizard calculator.
 */
(function (global) {
    const macroDistributions = {
        bulk: { protein: 25, carbs: 55, fat: 20 },
        maintain: { protein: 30, carbs: 50, fat: 20 },
        cut: { protein: 35, carbs: 45, fat: 20 }
    };

    const activityMultipliers = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        veryActive: 1.9
    };

    function calculateBMR(age, height, weight, gender) {
        const genderOffset = gender === 'female' ? -161 : 5;
        return Math.round((10 * weight) + (6.25 * height) - (5 * age) + genderOffset);
    }

    function calculateTDEE(bmr, activityLevel = 'moderate') {
        const multiplier = activityMultipliers[activityLevel] || activityMultipliers.moderate;
        return Math.round(bmr * multiplier);
    }

    function calorieTargetFrom(tdee, goal, calorieAdjustment) {
        const adj = Number(calorieAdjustment) || 0;
        if (goal === 'bulk') return Math.round(tdee + adj);
        if (goal === 'cut') return Math.round(tdee - adj);
        return Math.round(tdee);
    }

    function macrosForCalories(calories, goal) {
        const macros = macroDistributions[goal] || macroDistributions.maintain;
        return {
            proteinPct: macros.protein,
            carbsPct: macros.carbs,
            fatPct: macros.fat,
            proteinG: Math.round((calories * macros.protein / 100) / 4),
            carbsG: Math.round((calories * macros.carbs / 100) / 4),
            fatG: Math.round((calories * macros.fat / 100) / 9)
        };
    }

    function rebuildMealPlanDays(planSnapshot, calorieTarget) {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayNames = {
            monday: 'Måndag', tuesday: 'Tisdag', wednesday: 'Onsdag', thursday: 'Torsdag',
            friday: 'Fredag', saturday: 'Lördag', sunday: 'Söndag'
        };
        const snacks = planSnapshot.snacks || { snack1: false, snack2: false };
        const trainingDays = planSnapshot.trainingDays || [];
        const macros = macroDistributions[planSnapshot.goal] || macroDistributions.maintain;

        const mealOrder = [];
        mealOrder.push({ name: 'Frukost', distribution: snacks.snack1 ? 0.25 : (snacks.snack2 ? 0.30 : 0.30) });
        if (snacks.snack1) mealOrder.push({ name: 'Mellanmål', distribution: 0.10 });
        if (snacks.snack1 && snacks.snack2) mealOrder.push({ name: 'Lunch', distribution: 0.30 });
        else if (snacks.snack1 || snacks.snack2) mealOrder.push({ name: 'Lunch', distribution: 0.35 });
        else mealOrder.push({ name: 'Lunch', distribution: 0.40 });
        if (snacks.snack2) mealOrder.push({ name: 'Mellanmål', distribution: 0.10 });
        mealOrder.push({ name: 'Middag', distribution: snacks.snack2 ? 0.25 : (snacks.snack1 ? 0.30 : 0.30) });

        return days.map((day) => {
            const isTrainingDay = trainingDays.includes(day);
            const dayMultiplier = isTrainingDay ? 1.1 : 0.95;
            const dayCalories = Math.round(calorieTarget * dayMultiplier);
            const dayProtein = (dayCalories * macros.protein / 100) / 4;
            const dayCarbs = (dayCalories * macros.carbs / 100) / 4;
            const dayFat = (dayCalories * macros.fat / 100) / 9;

            return {
                name: dayNames[day],
                dayKey: day,
                isTrainingDay,
                calories: dayCalories,
                meals: mealOrder.map((meal) => ({
                    name: meal.name,
                    protein: Math.round(dayProtein * meal.distribution),
                    carbs: Math.round(dayCarbs * meal.distribution),
                    fat: Math.round(dayFat * meal.distribution),
                    calories: Math.round(dayCalories * meal.distribution)
                }))
            };
        });
    }

    function toPdfPlan(savedPlan, version = null) {
        const source = version || savedPlan;
        const days = (source.mealPlanDays || savedPlan.mealPlanDays || []).map((day) => ({
            name: day.name,
            isTrainingDay: !!day.isTrainingDay,
            calories: day.calories,
            meals: (day.meals || []).map((meal) => ({
                name: meal.name,
                protein: meal.protein,
                carbs: meal.carbs,
                fat: meal.fat,
                calories: meal.calories != null
                    ? meal.calories
                    : Math.round((meal.protein * 4) + (meal.carbs * 4) + (meal.fat * 9))
            }))
        }));

        return {
            planName: savedPlan.name,
            versionDate: source.date || source.createdAt || savedPlan.updatedAt,
            userInfo: {
                gender: savedPlan.gender,
                age: savedPlan.age,
                height: savedPlan.height,
                weight: source.weight != null ? source.weight : savedPlan.currentWeight,
                bmr: source.bmr != null ? source.bmr : savedPlan.bmr,
                tdee: source.tdee != null ? source.tdee : savedPlan.tdee,
                goal: savedPlan.goal,
                calorieAdjustment: savedPlan.goal === 'maintain'
                    ? 'Behålla'
                    : (savedPlan.calorieAdjustment ?? 0)
            },
            days
        };
    }

    function createVersionSnapshot(plan, meta = {}) {
        return {
            id: `ver_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
            createdAt: new Date().toISOString(),
            date: (meta.date || new Date().toISOString()).slice(0, 10),
            label: meta.label || 'Kostschema',
            reason: meta.reason || '',
            weight: plan.currentWeight,
            bmr: plan.bmr,
            tdee: plan.tdee,
            calorieTarget: plan.calorieTarget,
            macros: JSON.parse(JSON.stringify(plan.macros || {})),
            mealPlanDays: JSON.parse(JSON.stringify(plan.mealPlanDays || [])),
            fileName: meta.fileName || null
        };
    }

    global.NutritionCore = {
        macroDistributions,
        activityMultipliers,
        calculateBMR,
        calculateTDEE,
        calorieTargetFrom,
        macrosForCalories,
        rebuildMealPlanDays,
        toPdfPlan,
        createVersionSnapshot
    };
})(window);
