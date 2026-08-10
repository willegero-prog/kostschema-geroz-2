/**
 * Shared PDF export matching the existing wizard PDF structure.
 * Accepts either wizard state.mealPlan or a saved-plan PDF payload.
 */
(function (global) {
    function mealDisplayName(name) {
        const map = {
            Frukost: 'Frukost',
            Lunch: 'Lunch',
            Middag: 'Middag',
            Mellanmål: 'Mellanmål',
            'Pre-Workout': 'Pre-Workout'
        };
        return map[name] || name;
    }

    function safeFileName(name) {
        return String(name || 'kostplan')
            .replace(/[^\w\-åäöÅÄÖ ]+/gi, '')
            .trim()
            .replace(/\s+/g, '-')
            .slice(0, 60) || 'kostplan';
    }

    function normalizePlan(input) {
        if (input && input.userInfo && Array.isArray(input.days)) {
            return input;
        }
        // Wizard mealPlan shape
        if (input && input.userInfo && Array.isArray(input.days)) {
            return input;
        }
        throw new Error('Ogiltig kostplan för PDF');
    }

    function exportMealPlanPdf(planInput, options = {}) {
        if (!global.jspdf || !global.jspdf.jsPDF) {
            throw new Error('PDF-biblioteket är inte laddat');
        }
        const plan = normalizePlan(planInput);
        const { jsPDF } = global.jspdf;
        const doc = new jsPDF();

        let yPos = 0;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pageWidth - (margin * 2);
        let currentPage = 1;
        let totalPages = 1;

        function checkPageBreak(requiredSpace = 10) {
            if (yPos > pageHeight - margin - requiredSpace) {
                addFooter();
                doc.addPage();
                currentPage++;
                totalPages = currentPage;
                yPos = 0;
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

        function addFooter() {
            const footerY = pageHeight - 10;
            doc.setFontSize(7);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(150, 150, 150);
            doc.text(`Genererad av NutriPlan • Sida ${currentPage} av ${totalPages}`, pageWidth / 2, footerY, { align: 'center' });
            doc.setFont(undefined, 'italic');
            doc.text('By Gero\'Z', pageWidth / 2, footerY + 5, { align: 'center' });
        }

        doc.setFillColor(59, 130, 246);
        doc.rect(0, yPos, pageWidth, 25, 'F');
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('Veckoschema', pageWidth / 2, yPos + 16, { align: 'center' });
        yPos = 35;

        if (plan.planName) {
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(plan.planName, margin, yPos);
            yPos += 6;
            if (plan.versionDate) {
                doc.setFontSize(8);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(100, 100, 100);
                doc.text(`Version: ${String(plan.versionDate).slice(0, 10)}`, margin, yPos);
                yPos += 8;
            } else {
                yPos += 2;
            }
        }

        checkPageBreak(40);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Personlig Information', margin, yPos);
        yPos += 8;

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
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

        let goalDisplayText = 'Maintain';
        let goalDescription = 'Behålla nuvarande vikt';
        if (plan.userInfo.goal === 'bulk') {
            goalDisplayText = 'Bulk';
            goalDescription = 'Bygga muskler genom kaloriöverskott';
        } else if (plan.userInfo.goal === 'cut') {
            goalDisplayText = 'Deff';
            goalDescription = 'Gå ner i vikt genom kaloriunderskott';
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
        doc.setTextColor(0, 0, 0);
        doc.text(`Dagligt mål: ${targetText}`, margin + contentWidth / 2, yPos);
        yPos += 12;

        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 10;

        checkPageBreak(30);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Så räknar du kalorier', margin, yPos);
        yPos += 7;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        doc.setTextColor(75, 85, 99);
        [
            '1 g protein = 4 kcal, 1 g kolhydrater = 4 kcal, 1 g fett = 9 kcal.',
            'Använd livsmedelsförpackningar eller en app (t.ex. Lifesum, MyFitnessPal) för att se näringsvärden.',
            'Räkna ut mängden genom att multiplicera gram av varje makro med värdena ovan.',
            'Jämför sedan dagens totala kalorier och makron med planen i detta dokument.'
        ].forEach((line) => {
            checkPageBreak(7);
            doc.text(line, margin, yPos);
            yPos += 6;
        });
        yPos += 10;

        (plan.days || []).forEach((day) => {
            checkPageBreak(60);
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, yPos, contentWidth, 12, 'F');
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(day.name, margin + 5, yPos + 8);

            const dayTypeText = day.isTrainingDay ? 'Träningsdag' : 'Vilodag';
            const dayInfoText = `${dayTypeText} • ${day.calories} kcal`;
            const infoBoxWidth = 70;
            const infoBoxX = pageWidth - margin - infoBoxWidth - 5;
            doc.setFillColor(224, 224, 224);
            doc.setDrawColor(200, 200, 200);
            doc.roundedRect(infoBoxX, yPos + 2, infoBoxWidth, 8, 2, 2, 'FD');
            doc.setFontSize(8);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text(dayInfoText, infoBoxX + infoBoxWidth / 2, yPos + 7, { align: 'center' });
            yPos += 15;

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

            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text('Måltid', colX.meal + 3, yPos);
            doc.text('Kalorier', colX.calories + colWidths.calories / 2, yPos, { align: 'center' });
            doc.text('Protein', colX.protein + colWidths.protein / 2, yPos, { align: 'center' });
            doc.text('Kolhydrater', colX.carbs + colWidths.carbs / 2, yPos, { align: 'center' });
            doc.text('Fett', colX.fat + colWidths.fat / 2, yPos, { align: 'center' });
            yPos += 8;

            let dayTotalCalories = 0;
            let dayTotalProtein = 0;
            let dayTotalCarbs = 0;
            let dayTotalFat = 0;

            (day.meals || []).forEach((meal) => {
                checkPageBreak(10);
                const displayName = mealDisplayName(meal.name).replace(/[☀️🍎🍽️🌙🏋️]/g, '').trim();
                const mealCalories = meal.calories != null
                    ? meal.calories
                    : Math.round((meal.protein * 4) + (meal.carbs * 4) + (meal.fat * 9));
                doc.setFontSize(9);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(0, 0, 0);
                doc.text(displayName, colX.meal + 3, yPos);
                doc.text(String(mealCalories), colX.calories + colWidths.calories / 2, yPos, { align: 'center' });
                doc.text(`${meal.protein}g`, colX.protein + colWidths.protein / 2, yPos, { align: 'center' });
                doc.text(`${meal.carbs}g`, colX.carbs + colWidths.carbs / 2, yPos, { align: 'center' });
                doc.text(`${meal.fat}g`, colX.fat + colWidths.fat / 2, yPos, { align: 'center' });
                dayTotalCalories += mealCalories;
                dayTotalProtein += meal.protein;
                dayTotalCarbs += meal.carbs;
                dayTotalFat += meal.fat;
                yPos += 7;
            });

            checkPageBreak(10);
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, yPos, pageWidth - margin, yPos);
            yPos += 5;
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(59, 130, 246);
            doc.text('Totalt', colX.meal + 3, yPos);
            doc.text(String(dayTotalCalories), colX.calories + colWidths.calories / 2, yPos, { align: 'center' });
            doc.text(`${dayTotalProtein}g`, colX.protein + colWidths.protein / 2, yPos, { align: 'center' });
            doc.text(`${dayTotalCarbs}g`, colX.carbs + colWidths.carbs / 2, yPos, { align: 'center' });
            doc.text(`${dayTotalFat}g`, colX.fat + colWidths.fat / 2, yPos, { align: 'center' });
            yPos += 12;
        });

        addFooter();
        const totalPageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPageCount; i++) {
            doc.setPage(i);
            const footerY = pageHeight - 10;
            doc.setFontSize(7);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(150, 150, 150);
            doc.text(`Genererad av NutriPlan • Sida ${i} av ${totalPageCount}`, pageWidth / 2, footerY, { align: 'center' });
            doc.setFont(undefined, 'italic');
            doc.text('By Gero\'Z', pageWidth / 2, footerY + 5, { align: 'center' });
        }

        const fileName = options.fileName
            || `${safeFileName(plan.planName || 'kostplan')}-${String(plan.versionDate || new Date().toISOString()).slice(0, 10)}.pdf`;

        if (options.returnBlob) {
            const blob = doc.output('blob');
            return { doc, blob, fileName };
        }

        doc.save(fileName);
        return { doc, fileName };
    }

    global.MealPlanPDF = {
        exportMealPlanPdf,
        safeFileName,
        mealDisplayName
    };
})(window);
