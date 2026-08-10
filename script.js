// State management
const state = {
    currentStep: 1,
    goal: null,
    gender: null,
    age: null,
    height: null,
    weight: null,
    activityLevel: 'moderate',
    bmr: null,
    tdee: null,
    calorieAdjustment: null,
    targetWeight: null,
    trainingDays: [],
    mealStructure: null,
    snacks: {
        snack1: false, // Between breakfast and lunch
        snack2: false  // Between lunch and dinner
    },
    mealPlan: null
};

// Macro distribution based on goal
const macroDistributions = {
    bulk: { protein: 25, carbs: 55, fat: 20 },
    maintain: { protein: 30, carbs: 50, fat: 20 },
    cut: { protein: 35, carbs: 45, fat: 20 }
};

// BMR and TDEE calculation functions
function calculateBMR(age, height, weight, gender) {
    // Mifflin-St Jeor Equation
    // Male:   BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) + 5
    // Female: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) - 161
    const genderOffset = gender === 'female' ? -161 : 5;
    const bmr = (10 * weight) + (6.25 * height) - (5 * age) + genderOffset;
    return Math.round(bmr);
}

function calculateTDEE(bmr, activityLevel = 'moderate') {
    // Activity multipliers:
    // Sedentary (little/no exercise): 1.2
    // Light (light exercise 1-3 days/week): 1.375
    // Moderate (moderate exercise 3-5 days/week): 1.55
    // Active (hard exercise 6-7 days/week): 1.725
    // Very Active (very hard exercise, physical job): 1.9
    // Default to moderate (1.55) for general use
    const multipliers = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        veryActive: 1.9
    };
    const multiplier = multipliers[activityLevel] || multipliers.moderate;
    return Math.round(bmr * multiplier);
}

function updateBMRAndTDEE() {
    const ageInput = document.getElementById('age');
    const heightInput = document.getElementById('height');
    const weightInput = document.getElementById('weight');
    const bmrInput = document.getElementById('bmr');
    const tdeeInput = document.getElementById('tdee');

    const age = parseFloat(ageInput.value);
    const height = parseFloat(heightInput.value);
    const weight = parseFloat(weightInput.value);

    if (state.gender && age && height && weight && age > 0 && height > 0 && weight > 0) {
        const bmr = calculateBMR(age, height, weight, state.gender);
        const tdee = calculateTDEE(bmr, state.activityLevel);

        bmrInput.value = bmr;
        tdeeInput.value = tdee;

        state.bmr = bmr;
        state.tdee = tdee;
        state.age = age;
        state.height = height;
        state.weight = weight;
    } else {
        bmrInput.value = '';
        tdeeInput.value = '';
        state.bmr = null;
        state.tdee = null;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.state = state;
    initializeEventListeners();
    updateStepDisplay();
    setupBMRAutoCalculation();
    setupHamburgerMenu();
    if (window.AccountUI) AccountUI.initAccountUi();
    wireAccountMenuButtons();
    
    // Set default activity level button as selected
    const defaultActivityBtn = document.querySelector('.activity-btn[data-activity="moderate"]');
    if (defaultActivityBtn) {
        defaultActivityBtn.classList.add('selected');
        defaultActivityBtn.setAttribute('data-selected', 'true');
    }
});

function wireAccountMenuButtons() {
    const closeMenu = () => {
        document.getElementById('hamburger-icon')?.classList.remove('active');
        document.getElementById('hamburger-overlay')?.classList.remove('active');
    };

    document.getElementById('menu-login-btn')?.addEventListener('click', () => {
        closeMenu();
        document.getElementById('auth-login-btn')?.click();
    });
    document.getElementById('menu-dashboard-btn')?.addEventListener('click', () => {
        closeMenu();
        AccountUI.openDashboard();
    });
    document.getElementById('menu-logout-btn')?.addEventListener('click', () => {
        closeMenu();
        document.getElementById('auth-logout-btn')?.click();
    });
}

function setupHamburgerMenu() {
    const hamburgerIcon = document.getElementById('hamburger-icon');
    const hamburgerOverlay = document.getElementById('hamburger-overlay');
    const infoBtn = document.getElementById('info-btn');
    const infoModal = document.getElementById('info-modal');
    const infoModalClose = document.getElementById('info-modal-close');
    
    hamburgerIcon.addEventListener('click', () => {
        hamburgerIcon.classList.toggle('active');
        hamburgerOverlay.classList.toggle('active');
    });
    
    hamburgerOverlay.addEventListener('click', (e) => {
        if (e.target === hamburgerOverlay) {
            hamburgerIcon.classList.remove('active');
            hamburgerOverlay.classList.remove('active');
        }
    });
    
    infoBtn.addEventListener('click', () => {
        hamburgerIcon.classList.remove('active');
        hamburgerOverlay.classList.remove('active');
        infoModal.classList.add('active');
    });
    
    infoModalClose.addEventListener('click', () => {
        infoModal.classList.remove('active');
    });
    
    infoModal.addEventListener('click', (e) => {
        if (e.target === infoModal) {
            infoModal.classList.remove('active');
        }
    });
}

function setupBMRAutoCalculation() {
    const ageInput = document.getElementById('age');
    const heightInput = document.getElementById('height');
    const weightInput = document.getElementById('weight');

    ageInput.addEventListener('input', updateBMRAndTDEE);
    heightInput.addEventListener('input', updateBMRAndTDEE);
    weightInput.addEventListener('input', updateBMRAndTDEE);
}

function initializeEventListeners() {
    // Goal selection
    document.querySelectorAll('.goal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.goal-btn').forEach(b => b.classList.remove('selected'));
            e.currentTarget.classList.add('selected');
            state.goal = e.currentTarget.dataset.goal;
            updateCalorieLabel();
        });
    });

    // Day selection
    document.querySelectorAll('.day-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const day = e.currentTarget.dataset.day;
            if (e.currentTarget.classList.contains('selected')) {
                e.currentTarget.classList.remove('selected');
                state.trainingDays = state.trainingDays.filter(d => d !== day);
            } else {
                e.currentTarget.classList.add('selected');
                state.trainingDays.push(day);
            }
        });
    });

    // Snack selection
    document.querySelectorAll('.snack-toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const snackNum = e.currentTarget.dataset.snack;
            const snackKey = snackNum === '1' ? 'snack1' : 'snack2';
            
            // Toggle snack selection
            state.snacks[snackKey] = !state.snacks[snackKey];
            e.currentTarget.classList.toggle('selected', state.snacks[snackKey]);
        });
    });

    // Navigation buttons - use event delegation since buttons are in multiple steps
    document.addEventListener('click', (e) => {
        if (e.target.id === 'next-btn' || e.target.closest('#next-btn')) {
            e.preventDefault();
            nextStep();
        }
        if (e.target.id === 'prev-btn' || e.target.closest('#prev-btn')) {
            e.preventDefault();
            prevStep();
        }
    });

    // PDF download + restart (supports top buttons injected into meal plan + bottom restart)
    document.addEventListener('click', (e) => {
        if (e.target.closest('.download-btn')) {
            e.preventDefault();
            downloadPDF();
        }
        if (e.target.closest('.restart-btn')) {
            e.preventDefault();
            restartMealPlan();
        }
    });

    // Gender selection
    document.querySelectorAll('.gender-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.gender-btn').forEach(b => {
                b.classList.remove('selected');
                b.removeAttribute('data-selected');
                b.setAttribute('aria-pressed', 'false');
            });
            e.currentTarget.classList.add('selected');
            e.currentTarget.setAttribute('data-selected', 'true');
            e.currentTarget.setAttribute('aria-pressed', 'true');
            state.gender = e.currentTarget.dataset.gender;
            updateBMRAndTDEE();
        });
    });

    // Activity level selection
    document.querySelectorAll('.activity-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.activity-btn').forEach(b => {
                b.classList.remove('selected');
                b.removeAttribute('data-selected');
            });
            e.currentTarget.classList.add('selected');
            e.currentTarget.setAttribute('data-selected', 'true');
            state.activityLevel = e.currentTarget.dataset.activity;
            updateBMRAndTDEE();
        });
    });
}

function updateCalorieLabel() {
    const label = document.getElementById('calorie-label');
    const help = document.getElementById('calorie-help');
    const input = document.getElementById('calorie-adjustment');
    const guidance = document.getElementById('calorie-guidance');
    const bulkGuidance = document.getElementById('bulk-guidance');
    const cutGuidance = document.getElementById('cut-guidance');
    const guidanceTitle = document.getElementById('guidance-title');
    
    if (state.goal === 'bulk') {
        label.textContent = 'Kaloriöverskott (kcal)';
        help.textContent = 'Ange det dagliga kaloriöverskottet du vill uppnå';
        input.disabled = false;
        input.value = '';
        if (guidance) {
            guidance.style.display = 'block';
            if (bulkGuidance) bulkGuidance.style.display = 'block';
            if (cutGuidance) cutGuidance.style.display = 'none';
            if (guidanceTitle) guidanceTitle.textContent = 'Vad är ett rimligt kaloriöverskott?';
        }
    } else if (state.goal === 'cut') {
        label.textContent = 'Kaloriunderskott (kcal)';
        help.textContent = 'Ange det dagliga kaloriunderskottet du vill uppnå';
        input.disabled = false;
        input.value = '';
        if (guidance) {
            guidance.style.display = 'block';
            if (bulkGuidance) bulkGuidance.style.display = 'none';
            if (cutGuidance) cutGuidance.style.display = 'block';
            if (guidanceTitle) guidanceTitle.textContent = 'Vad är ett rimligt kaloriunderskott?';
        }
    } else {
        label.textContent = 'Kalorijustering (kcal)';
        help.textContent = 'Maintain - kalorier kommer att sättas för att behålla din nuvarande vikt';
        input.disabled = true;
        input.value = '0';
        if (guidance) {
            guidance.style.display = 'none';
        }
    }
}

function nextStep() {
    if (!validateCurrentStep()) {
        return;
    }

    if (state.currentStep < 6) {
        state.currentStep++;
        updateStepDisplay();
        
        if (state.currentStep === 6) {
            generateMealPlan();
        }
    }
}

function prevStep() {
    if (state.currentStep > 1) {
        state.currentStep--;
        updateStepDisplay();
    }
}

function restartMealPlan() {
    // Reset state
    state.currentStep = 1;
    state.goal = null;
    state.gender = null;
    state.age = null;
    state.height = null;
    state.weight = null;
    state.activityLevel = 'moderate';
    state.bmr = null;
    state.tdee = null;
    state.calorieAdjustment = null;
    state.targetWeight = null;
    state.trainingDays = [];
    state.snacks = {
        snack1: false,
        snack2: false
    };
    state.mealPlan = null;
    
    // Reset form inputs
    document.getElementById('age').value = '';
    document.getElementById('height').value = '';
    document.getElementById('weight').value = '';
    document.getElementById('bmr').value = '';
    document.getElementById('tdee').value = '';
    document.getElementById('calorie-adjustment').value = '';
    const targetWeightEl = document.getElementById('target-weight');
    if (targetWeightEl) targetWeightEl.value = '';
    
    // Reset selected buttons
    document.querySelectorAll('.goal-btn').forEach(b => b.classList.remove('selected'));
    document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('selected'));
    document.querySelectorAll('.snack-toggle-btn').forEach(b => b.classList.remove('selected'));
    document.querySelectorAll('.gender-btn').forEach(b => {
        b.classList.remove('selected');
        b.removeAttribute('data-selected');
        b.setAttribute('aria-pressed', 'false');
    });
    document.querySelectorAll('.activity-btn').forEach(b => {
        b.classList.remove('selected');
        b.removeAttribute('data-selected');
    });
    
    // Set default activity level
    const defaultActivityBtn = document.querySelector('.activity-btn[data-activity="moderate"]');
    if (defaultActivityBtn) {
        defaultActivityBtn.classList.add('selected');
        defaultActivityBtn.setAttribute('data-selected', 'true');
    }
    
    // Clear meal plan display
    document.getElementById('meal-plan-content').innerHTML = '';
    
    // Update display
    updateStepDisplay();
    updateCalorieLabel();
}

function validateCurrentStep() {
    switch (state.currentStep) {
        case 1:
            if (!state.goal) {
                alert('Vänligen välj ditt mål');
                return false;
            }
            break;
        case 2:
            state.age = parseInt(document.getElementById('age').value);
            state.height = parseFloat(document.getElementById('height').value);
            state.weight = parseFloat(document.getElementById('weight').value);
            state.bmr = parseFloat(document.getElementById('bmr').value);
            state.tdee = parseFloat(document.getElementById('tdee').value);
            
            if (!state.gender) {
                alert('Vänligen välj kön (Man eller Kvinna)');
                return false;
            }

            if (!state.age || !state.height || !state.weight) {
                alert('Vänligen fyll i Ålder, Längd och Vikt. BMR och TDEE beräknas automatiskt.');
                return false;
            }
            
            if (!state.bmr || !state.tdee) {
                alert('BMR och TDEE beräknas. Vänligen se till att Kön, Ålder, Längd och Vikt är giltiga.');
                return false;
            }
            break;
        case 3:
            const calorieInput = document.getElementById('calorie-adjustment').value;
            const targetWeightInput = document.getElementById('target-weight')?.value;
            state.targetWeight = targetWeightInput ? parseFloat(targetWeightInput) : null;
            if (state.goal === 'maintain') {
                state.calorieAdjustment = 0;
            } else {
                if (!calorieInput || calorieInput.trim() === '') {
                    alert('Vänligen ange ett kaloriöverskott eller underskott');
                    return false;
                }
                state.calorieAdjustment = parseFloat(calorieInput);
                if (isNaN(state.calorieAdjustment) || state.calorieAdjustment < 0) {
                    alert('Vänligen ange en giltig kalorijustering (0 eller högre)');
                    return false;
                }
            }
            break;
        case 4:
            if (state.trainingDays.length === 0) {
                alert('Vänligen välj minst en träningsdag');
                return false;
            }
            break;
        case 5:
            // Meal structure is always valid (at least 3 meals are always included)
            // Snacks are optional, so no validation needed
            break;
    }
    return true;
}

function updateStepDisplay() {
    // Update step indicators
    document.querySelectorAll('.step').forEach((step, index) => {
        const stepNum = index + 1;
        step.classList.remove('active', 'completed');
        if (stepNum < state.currentStep) {
            step.classList.add('completed');
        } else if (stepNum === state.currentStep) {
            step.classList.add('active');
        }
    });

    // Update step content
    document.querySelectorAll('.step-content').forEach((content, index) => {
        content.classList.remove('active');
        if (index + 1 === state.currentStep) {
            content.classList.add('active');
        }
    });

    // Update navigation buttons in the active step only
    const activeStepContent = document.querySelector('.step-content.active');
    if (activeStepContent) {
        const prevBtn = activeStepContent.querySelector('#prev-btn');
        const nextBtn = activeStepContent.querySelector('#next-btn');
        
        if (prevBtn) {
            prevBtn.style.display = state.currentStep > 1 ? 'flex' : 'none';
        }
        if (nextBtn) {
            nextBtn.style.display = state.currentStep < 6 ? 'flex' : 'none';
        }
    }
    
    // Hide buttons in inactive steps
    document.querySelectorAll('.step-content:not(.active)').forEach(stepContent => {
        const prevBtn = stepContent.querySelector('#prev-btn');
        const nextBtn = stepContent.querySelector('#next-btn');
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
    });
}

// Day name translations
const dayNames = {
    'monday': 'Måndag',
    'tuesday': 'Tisdag',
    'wednesday': 'Onsdag',
    'thursday': 'Torsdag',
    'friday': 'Fredag',
    'saturday': 'Lördag',
    'sunday': 'Söndag'
};

// Helper to display meal name with emoji
function getMealDisplayName(name) {
    switch (name) {
        case 'Frukost':
            return '☀️ Frukost';
        case 'Lunch':
            return '🍽️ Lunch';
        case 'Middag':
            return '🌙 Middag';
        case 'Mellanmål':
            return '🍎 Mellanmål';
        default:
            return name;
    }
}

function generateMealPlan() {
    const macros = macroDistributions[state.goal];
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    // Calculate daily calories
    let baseCalories = state.tdee;
    if (state.goal === 'bulk') {
        baseCalories += state.calorieAdjustment;
    } else if (state.goal === 'cut') {
        baseCalories -= state.calorieAdjustment;
    }
    // maintain uses TDEE as is

    // Calorie adjustment health rating
    let calorieRating = {
        level: 'neutral',
        label: 'Neutral',
        description: 'Kalorimålet är neutralt.',
        color: 'neutral'
    };
    if (state.goal !== 'maintain') {
        const adj = state.calorieAdjustment || 0;
        const ratio = adj > 0 && state.tdee ? adj / state.tdee : 0;
        if (ratio <= 0.15) {
            calorieRating.level = 'good';
            calorieRating.color = 'green';
            calorieRating.label = state.goal === 'bulk' ? '🟢 Rimligt överskott' : '🟢 Rimligt underskott';
            calorieRating.description = 'Ditt kaloriöverskott/underskott ligger på en hälsosam nivå.';
        } else if (ratio <= 0.25) {
            calorieRating.level = 'medium';
            calorieRating.color = 'yellow';
            calorieRating.label = state.goal === 'bulk' ? '🟡 Ganska högt överskott' : '🟡 Ganska stort underskott';
            calorieRating.description = 'Detta kan fungera kortsiktigt, men var uppmärksam på sömn, energi och återhämtning.';
        } else {
            calorieRating.level = 'high';
            calorieRating.color = 'red';
            calorieRating.label = state.goal === 'bulk' ? '🔴 Mycket högt överskott' : '🔴 Mycket stort underskott';
            calorieRating.description = 'Detta kaloriupplägg kan vara för aggressivt. Överväg att minska skillnaden.';
        }
    }

    // Calculate macros per gram
    const proteinPerGram = 4; // calories per gram
    const carbsPerGram = 4;
    const fatPerGram = 9;

    // Calculate total macros for the day
    const totalProtein = (baseCalories * macros.protein / 100) / proteinPerGram;
    const totalCarbs = (baseCalories * macros.carbs / 100) / carbsPerGram;
    const totalFat = (baseCalories * macros.fat / 100) / fatPerGram;

    // Adjust for training days (add 10% more calories on training days)
    const trainingDayMultiplier = 1.1;
    const restDayMultiplier = 0.95;

    const mealPlan = {
        userInfo: {
            gender: state.gender,
            age: state.age,
            height: state.height,
            weight: state.weight,
            bmr: state.bmr,
            tdee: state.tdee,
            goal: state.goal,
            calorieAdjustment: state.goal === 'maintain' ? 'Behålla' : state.calorieAdjustment
        },
        macros: macros,
        days: [],
        calorieRating
    };

    // Build meal names based on selected snacks
    const mealNamesList = [];
    const mealDistribution = {};
    
    // Always start with Breakfast
    mealNamesList.push('Frukost');
    mealDistribution['Frukost'] = state.snacks.snack1 ? 0.25 : (state.snacks.snack2 ? 0.30 : 0.30);
    
    // Add first snack if selected (between breakfast and lunch)
    if (state.snacks.snack1) {
        mealNamesList.push('Mellanmål');
        mealDistribution['Mellanmål'] = 0.10;
    }
    
    // Always include Lunch
    mealNamesList.push('Lunch');
    if (state.snacks.snack1 && state.snacks.snack2) {
        mealDistribution['Lunch'] = 0.30;
    } else if (state.snacks.snack1 || state.snacks.snack2) {
        mealDistribution['Lunch'] = 0.35;
    } else {
        mealDistribution['Lunch'] = 0.40;
    }
    
    // Add second snack if selected (between lunch and dinner)
    if (state.snacks.snack2) {
        mealNamesList.push('Mellanmål');
        // For the second snack, we need to track it separately
        // We'll use the order to determine which snack it is
    }
    
    // Always end with Dinner
    mealNamesList.push('Middag');
    mealDistribution['Middag'] = state.snacks.snack2 ? 0.25 : (state.snacks.snack1 ? 0.30 : 0.30);
    
    // Create a meal order array to track distribution
    const mealOrder = [];
    let snackCount = 0;
    
    mealNamesList.forEach((name, index) => {
        if (name === 'Mellanmål') {
            snackCount++;
            mealOrder.push({ name: 'Mellanmål', index: snackCount, distribution: 0.10 });
        } else {
            mealOrder.push({ name: name, distribution: mealDistribution[name] });
        }
    });

    days.forEach(day => {
        const isTrainingDay = state.trainingDays.includes(day);
        const dayMultiplier = isTrainingDay ? trainingDayMultiplier : restDayMultiplier;
        
        const dayCalories = baseCalories * dayMultiplier;
        const dayProtein = (dayCalories * macros.protein / 100) / proteinPerGram;
        const dayCarbs = (dayCalories * macros.carbs / 100) / carbsPerGram;
        const dayFat = (dayCalories * macros.fat / 100) / fatPerGram;

        const dayPlan = {
            name: dayNames[day],
            isTrainingDay: isTrainingDay,
            calories: Math.round(dayCalories),
            meals: []
        };

        mealOrder.forEach(meal => {
            const mealPercent = meal.distribution;
            dayPlan.meals.push({
                name: meal.name,
                protein: Math.round(dayProtein * mealPercent),
                carbs: Math.round(dayCarbs * mealPercent),
                fat: Math.round(dayFat * mealPercent),
                calories: Math.round(dayCalories * mealPercent)
            });
        });

        mealPlan.days.push(dayPlan);
    });

    // Calculate average daily macros for template
    let totalWeekCalories = 0;
    let totalWeekProtein = 0;
    let totalWeekCarbs = 0;
    let totalWeekFat = 0;
    
    mealPlan.days.forEach(day => {
        totalWeekCalories += day.calories;
        day.meals.forEach(meal => {
            totalWeekProtein += meal.protein;
            totalWeekCarbs += meal.carbs;
            totalWeekFat += meal.fat;
        });
    });
    
    const avgCalories = Math.round(totalWeekCalories / 7);
    const avgProtein = Math.round(totalWeekProtein / 7);
    const avgCarbs = Math.round(totalWeekCarbs / 7);
    const avgFat = Math.round(totalWeekFat / 7);

    mealPlan.template = {
        calories: avgCalories,
        protein: avgProtein,
        carbs: avgCarbs,
        fat: avgFat,
        meals: mealOrder.map((meal, index) => {
            // Calculate average for this meal
            let mealTotalProtein = 0;
            let mealTotalCarbs = 0;
            let mealTotalFat = 0;
            
            mealPlan.days.forEach(day => {
                // Use index to get the correct meal (handles duplicate "Snack" names)
                const mealData = day.meals[index];
                if (mealData) {
                    mealTotalProtein += mealData.protein;
                    mealTotalCarbs += mealData.carbs;
                    mealTotalFat += mealData.fat;
                }
            });
            
            return {
                name: meal.name,
                protein: Math.round(mealTotalProtein / 7),
                carbs: Math.round(mealTotalCarbs / 7),
                fat: Math.round(mealTotalFat / 7)
            };
        })
    };

    state.mealPlan = mealPlan;
    displayMealPlan(mealPlan);
}

function displayMealPlan(plan) {
    const content = document.getElementById('meal-plan-content');
    
    let html = `
        <div class="plan-header">
            <h3>Din Personliga Kostplan</h3>
            <div class="plan-info">
                <div class="info-item">
                    <span class="info-label">Kön</span>
                    <span class="info-value">${plan.userInfo.gender === 'female' ? 'Kvinna' : 'Man'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Ålder</span>
                    <span class="info-value">${plan.userInfo.age} år</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Längd</span>
                    <span class="info-value">${plan.userInfo.height} cm</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Vikt</span>
                    <span class="info-value">${plan.userInfo.weight} kg</span>
                </div>
                <div class="info-item">
                    <span class="info-label">BMR</span>
                    <span class="info-value">${plan.userInfo.bmr} kcal</span>
                    <span class="info-explanation">Basal Metabolic Rate - kalorier förbrända i vila</span>
                </div>
                <div class="info-item">
                    <span class="info-label">TDEE</span>
                    <span class="info-value">${plan.userInfo.tdee} kcal</span>
                    <span class="info-explanation">Total Daily Energy Expenditure - totala kalorier förbrända per dag</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Dagligt Mål</span>
                    <span class="info-value">${plan.userInfo.calorieAdjustment === 'Behålla' ? 'Behålla' : plan.userInfo.calorieAdjustment + ' kcal ' + (plan.userInfo.goal === 'bulk' ? 'överskott' : 'underskott')}</span>
                </div>
            </div>
            <div class="calorie-rating rating-${plan.calorieRating.level}">
                <span class="calorie-rating-label">${plan.calorieRating.label}</span>
                <span class="calorie-rating-desc">${plan.calorieRating.description}</span>
            </div>
            <div class="macro-distribution">
                <h4>Makronäringsdistribution</h4>
                <div class="macro-bars">
                    <div class="macro-bar">
                        <div class="macro-bar-label">Protein</div>
                        <div class="macro-bar-value">${plan.macros.protein}%</div>
                    </div>
                    <div class="macro-bar">
                        <div class="macro-bar-label">Kolhydrater</div>
                        <div class="macro-bar-value">${plan.macros.carbs}%</div>
                    </div>
                    <div class="macro-bar">
                        <div class="macro-bar-label">Fett</div>
                        <div class="macro-bar-value">${plan.macros.fat}%</div>
                    </div>
                </div>
            </div>
            <div class="plan-actions">
                <button type="button" id="download-pdf" class="download-btn">Ladda ned som PDF</button>
                <button type="button" id="save-plan-btn" class="save-plan-btn">Spara kostschema</button>
                <button type="button" id="restart-btn-top" class="restart-btn">Börja om</button>
            </div>
        </div>
    `;

    // Daily plans
    html += '<div class="daily-plan"><h4>Kostplan</h4>';
    plan.days.forEach(day => {
        html += `
            <div class="day-section">
                <div class="day-header">
                    <div>
                        <span class="day-name">${day.name}</span>
                        <span class="day-calories" style="font-size: 0.9rem; color: var(--text-secondary); margin-left: 10px;">${day.calories} kcal</span>
                    </div>
                    <span class="day-type ${day.isTrainingDay ? '' : 'rest'}">${day.isTrainingDay ? 'Träningsdag' : 'Vilodag'}</span>
                </div>
                <div class="meals-list">
        `;
        
        day.meals.forEach(meal => {
            const mealDisplayName = getMealDisplayName(meal.name);
            html += `
                <div class="meal-item">
                    <div class="meal-name">${mealDisplayName}</div>
                    <div class="macros-grid">
                        <div class="macro-item">
                            <div class="macro-item-label">Protein</div>
                            <div class="macro-item-value">${meal.protein}g</div>
                        </div>
                        <div class="macro-item">
                            <div class="macro-item-label">Kolhydrater</div>
                            <div class="macro-item-value">${meal.carbs}g</div>
                        </div>
                        <div class="macro-item">
                            <div class="macro-item-label">Fett</div>
                            <div class="macro-item-value">${meal.fat}g</div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    html += '</div>';

    // Template section
    html += `
        <div class="template-section">
            <h4>Dagligt Genomsnittligt Mall</h4>
            <p style="color: var(--text-secondary); margin-bottom: 15px;">Genomsnittlig daglig makronäringsdistribution</p>
            <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 10px; margin-bottom: 20px; border: 1px solid var(--glass-border);">
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: center;">
                    <div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 4px;">Totalt Kalorier</div>
                        <div style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary);">${plan.template.calories} kcal</div>
                    </div>
                    <div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 4px;">Protein</div>
                        <div style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary);">${plan.template.protein}g</div>
                    </div>
                    <div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 4px;">Kolhydrater</div>
                        <div style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary);">${plan.template.carbs}g</div>
                    </div>
                    <div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 4px;">Fett</div>
                        <div style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary);">${plan.template.fat}g</div>
                    </div>
                </div>
            </div>
            <div class="meals-list">
    `;
    
    plan.template.meals.forEach(meal => {
        const mealDisplayName = getMealDisplayName(meal.name);
        html += `
            <div class="meal-item">
                <div class="meal-name">${mealDisplayName}</div>
                <div class="macros-grid">
                    <div class="macro-item">
                        <div class="macro-item-label">Protein</div>
                        <div class="macro-item-value">${meal.protein}g</div>
                    </div>
                    <div class="macro-item">
                        <div class="macro-item-label">Kolhydrater</div>
                        <div class="macro-item-value">${meal.carbs}g</div>
                    </div>
                    <div class="macro-item">
                        <div class="macro-item-label">Fett</div>
                        <div class="macro-item-value">${meal.fat}g</div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
    `;

    content.innerHTML = html;
}

function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const plan = state.mealPlan;

    let yPos = 0;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    let currentPage = 1;
    let totalPages = 1;

    // Helper function to check page break
    function checkPageBreak(requiredSpace = 10) {
        if (yPos > pageHeight - margin - requiredSpace) {
            // Add footer before new page
            addFooter();
            doc.addPage();
            currentPage++;
            totalPages = currentPage;
            yPos = 0;
            // Add blue header on new page
            doc.setFillColor(59, 130, 246);
            doc.rect(0, yPos, pageWidth, 25, 'F');
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text('Veckoschema', pageWidth / 2, yPos + 16, { align: 'center' });
            yPos = 30;
            return true;
        }
        return false;
    }
    
    // Function to add footer
    function addFooter() {
        const footerY = pageHeight - 10;
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(150, 150, 150);
        const footerText = `Genererad av NutriPlan • Sida ${currentPage} av ${totalPages}`;
        doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });
        doc.setFont(undefined, 'italic');
        doc.text('By Gero\'Z', pageWidth / 2, footerY + 5, { align: 'center' });
    }

    // Blue header band
    doc.setFillColor(59, 130, 246); // Blue color
    doc.rect(0, yPos, pageWidth, 25, 'F');
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255); // White text
    doc.text('Veckoschema', pageWidth / 2, yPos + 16, { align: 'center' });
    yPos = 35;

    // Body Information Section
    checkPageBreak(40);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Personlig Information', margin, yPos);
    yPos += 8;
    
    // Body info in a clean format
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    
    const bodyInfoLines = [
        `Kön: ${plan.userInfo.gender === 'female' ? 'Kvinna' : 'Man'}`,
        `Ålder: ${plan.userInfo.age} år`,
        `Längd: ${plan.userInfo.height} cm`,
        `Vikt: ${plan.userInfo.weight} kg`,
        `BMR: ${plan.userInfo.bmr} kcal/dag`,
        `TDEE: ${plan.userInfo.tdee} kcal/dag`
    ];
    
    bodyInfoLines.forEach((line, index) => {
        const xPos = index < 3 ? margin : margin + contentWidth / 2;
        const lineY = yPos + (index < 3 ? index * 6 : (index - 3) * 6);
        doc.text(line, xPos, lineY);
    });
    
    yPos += 20;
    
    // Goal and calorie adjustment
    let goalDisplayText = '';
    let goalDescription = '';
    
    if (plan.userInfo.goal === 'bulk') {
        goalDisplayText = 'Bulk';
        goalDescription = 'Bygga muskler genom kaloriöverskott';
    } else if (plan.userInfo.goal === 'cut') {
        goalDisplayText = 'Deff';
        goalDescription = 'Gå ner i vikt genom kaloriunderskott';
    } else {
        goalDisplayText = 'Maintain';
        goalDescription = 'Behålla nuvarande vikt';
    }
    
    const targetText = plan.userInfo.calorieAdjustment === 'Behålla' 
        ? 'Behålla' 
        : `${plan.userInfo.calorieAdjustment} kcal ${plan.userInfo.goal === 'bulk' ? 'överskott' : 'underskott'}`;
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`Mål: ${goalDisplayText}`, margin, yPos);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(goalDescription, margin, yPos + 5);
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Dagligt mål: ${targetText}`, margin + contentWidth / 2, yPos);
    yPos += 12;
    
    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    // Guide: Så räknar du kalorier - keep this section
    checkPageBreak(30);
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Så räknar du kalorier', margin, yPos);
    yPos += 7;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    const guideLines = [
        '1 g protein = 4 kcal, 1 g kolhydrater = 4 kcal, 1 g fett = 9 kcal.',
        'Använd livsmedelsförpackningar eller en app (t.ex. Lifesum, MyFitnessPal) för att se näringsvärden.',
        'Räkna ut mängden genom att multiplicera gram av varje makro med värdena ovan.',
        'Jämför sedan dagens totala kalorier och makron med planen i detta dokument.'
    ];
    guideLines.forEach(line => {
        checkPageBreak(7);
        doc.text(line, margin, yPos);
        yPos += 6;
    });
    yPos += 10;

    // Meal Plan - new structure matching the image
    plan.days.forEach(day => {
        checkPageBreak(60);
        
        // Light grey horizontal bar for day title
        doc.setFillColor(240, 240, 240); // Light grey #F0F0F0
        doc.rect(margin, yPos, contentWidth, 12, 'F');
        
        // Day name (left-aligned, bold)
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(day.name, margin + 5, yPos + 8);
        
        // Day type and calories in darker grey rounded rectangle (right-aligned)
        const dayTypeText = day.isTrainingDay ? 'Träningsdag' : 'Vilodag';
        const dayInfoText = `${dayTypeText} • ${day.calories} kcal`;
        const infoBoxWidth = 70;
        const infoBoxX = pageWidth - margin - infoBoxWidth - 5;
        
        doc.setFillColor(224, 224, 224); // Darker grey #E0E0E0
        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(infoBoxX, yPos + 2, infoBoxWidth, 8, 2, 2, 'FD');
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(dayInfoText, infoBoxX + infoBoxWidth / 2, yPos + 7, { align: 'center' });
        
        yPos += 15;
        
        // Table header row
        checkPageBreak(40);
        const colWidths = {
            meal: contentWidth * 0.35,
            calories: contentWidth * 0.15,
            protein: contentWidth * 0.15,
            carbs: contentWidth * 0.15,
            fat: contentWidth * 0.15
        };
        
        const colX = {
            meal: margin,
            calories: margin + colWidths.meal,
            protein: margin + colWidths.meal + colWidths.calories,
            carbs: margin + colWidths.meal + colWidths.calories + colWidths.protein,
            fat: margin + colWidths.meal + colWidths.calories + colWidths.protein + colWidths.carbs
        };
        
        // Table header
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text('Måltid', colX.meal + 3, yPos);
        doc.text('Kalorier', colX.calories + colWidths.calories / 2, yPos, { align: 'center' });
        doc.text('Protein', colX.protein + colWidths.protein / 2, yPos, { align: 'center' });
        doc.text('Kolhydrater', colX.carbs + colWidths.carbs / 2, yPos, { align: 'center' });
        doc.text('Fett', colX.fat + colWidths.fat / 2, yPos, { align: 'center' });
        yPos += 8;
        
        // Calculate totals
        let dayTotalCalories = 0;
        let dayTotalProtein = 0;
        let dayTotalCarbs = 0;
        let dayTotalFat = 0;
        
        // Meal rows
        day.meals.forEach(meal => {
            checkPageBreak(10);
            const mealDisplayName = getMealDisplayName(meal.name).replace(/[☀️🍎🍽️🌙🏋️]/g, '').trim();
            
            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text(mealDisplayName, colX.meal + 3, yPos);
            doc.text(String(meal.calories), colX.calories + colWidths.calories / 2, yPos, { align: 'center' });
            doc.text(`${meal.protein}g`, colX.protein + colWidths.protein / 2, yPos, { align: 'center' });
            doc.text(`${meal.carbs}g`, colX.carbs + colWidths.carbs / 2, yPos, { align: 'center' });
            doc.text(`${meal.fat}g`, colX.fat + colWidths.fat / 2, yPos, { align: 'center' });
            
            dayTotalCalories += meal.calories;
            dayTotalProtein += meal.protein;
            dayTotalCarbs += meal.carbs;
            dayTotalFat += meal.fat;
            
            yPos += 7;
        });
        
        // Separator line
        checkPageBreak(10);
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;
        
        // Total row - blue and bold
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(59, 130, 246); // Blue color
        doc.text('Totalt', colX.meal + 3, yPos);
        doc.text(String(dayTotalCalories), colX.calories + colWidths.calories / 2, yPos, { align: 'center' });
        doc.text(`${dayTotalProtein}g`, colX.protein + colWidths.protein / 2, yPos, { align: 'center' });
        doc.text(`${dayTotalCarbs}g`, colX.carbs + colWidths.carbs / 2, yPos, { align: 'center' });
        doc.text(`${dayTotalFat}g`, colX.fat + colWidths.fat / 2, yPos, { align: 'center' });
        
        yPos += 12;
    });

    // Final footer on last page
    addFooter();
    
    // Update all page footers with correct total page count
    const totalPageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPageCount; i++) {
        doc.setPage(i);
        const footerY = pageHeight - 10;
        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(150, 150, 150);
        const footerText = `Genererad av NutriPlan • Sida ${i} av ${totalPageCount}`;
        doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });
        doc.setFont(undefined, 'italic');
        doc.text('By Gero\'Z', pageWidth / 2, footerY + 5, { align: 'center' });
    }

    // Save PDF
    doc.save('kostplan.pdf');
}

