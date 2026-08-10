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
                    fat: Math.round(dayFat * meal.distribution)
                }))
            };
        });
    }

    global.NutritionCore = {
        macroDistributions,
        activityMultipliers,
        calculateBMR,
        calculateTDEE,
        calorieTargetFrom,
        macrosForCalories,
        rebuildMealPlanDays
    };
})(window);
