# kostschema GRATIS

A beautiful, futuristic meal planning website that creates personalized weekly nutrition plans based on your body metrics, goals, and training schedule. **100% FREE** - Create your custom meal plan template with macronutrient breakdowns.

## ✨ Features

- **Step-by-step form** for easy data input
- **Goal-based planning**: Bulk, Deff (Cut), or Maintain
- **Automatic BMR & TDEE calculation** based on age, height, weight, and activity level
- **Activity level selector** for accurate calorie calculations
- **Customizable meal structure**: Breakfast, Lunch, Dinner + optional snacks
- **Training day adjustments**: Automatically adjusts calories for training vs rest days
- **Macronutrient distribution**: Shows protein, carbs, and fats in grams for each meal
- **Professional PDF export**: Download your meal plan as a beautifully formatted PDF
- **Liquid glass design**: Modern, Apple-inspired glassmorphism UI
- **Swedish language**: Fully translated interface

## 🚀 Quick Start

**Option 1: Direct File (Easiest)**
- Simply double-click `index.html` to open it in your browser
- Or right-click `index.html` → "Open With" → Your browser

**Option 2: Local Server (Recommended)**
```bash
python3 server.py
```
Then open: http://localhost:8000

**Option 3: Preview Page**
- Open `preview.html` in your browser for a quick access page

## 📖 How to Use

1. Open the website using one of the methods above
2. Follow the step-by-step process:
   - **Step 1**: Select your goal (Bulk/Deff/Maintain)
   - **Step 2**: Enter your body information (Age, Height, Weight) and select activity level
   - **Step 3**: Set your calorie target (surplus/deficit) or maintain
   - **Step 4**: Select your training days
   - **Step 5**: Choose your meal structure (add optional snacks)
3. Review your personalized weekly meal plan
4. Click "Ladda ner som PDF" to download your plan
5. Use "Börja om" to restart and create a new plan

## 📋 What You Get

- **Weekly meal plan** (7 days) with daily calorie and macro breakdowns
- **Meal-by-meal macronutrient targets** in grams
- **Training vs rest day adjustments** (10% more calories on training days)
- **Professional PDF** with:
  - Your body information
  - Goal and calorie targets
  - Daily meal breakdowns with totals
  - Calorie counting guide
  - Clean, printable format

## 🎯 Understanding Your Plan

This meal plan provides **macronutrient templates**, not ready-made recipes. You choose what foods to eat as long as you hit the protein, carb, and fat targets for each meal.

**Benefits:**
- Freedom to choose your own foods
- No boring repetitive meals
- Easier to follow long-term
- Learn what your body needs

## 📊 Key Metrics

- **BMR (Basal Metabolic Rate)**: Calories your body burns at rest (calculated automatically)
- **TDEE (Total Daily Energy Expenditure)**: Total calories burned per day including all activities (calculated automatically)
- **Activity Levels**: Sedentary, Light, Moderate, Active, Very Active
- **Training days**: +10% calories for recovery and performance
- **Rest days**: -5% calories to match lower activity

## 🛠️ Technical Details

### Files Structure
- `index.html` - Main HTML structure with step-by-step form
- `styles.css` - Styling with liquid glass effect and responsive design
- `script.js` - Application logic, calculations, and PDF generation
- `server.py` - Simple Python HTTP server for local development
- `preview.html` - Quick preview/landing page

### Dependencies
- **jsPDF** (via CDN) - For PDF generation
- Modern web browser with JavaScript enabled

### Browser Support
- Chrome (recommended)
- Firefox
- Safari
- Edge

## 📝 Notes

- All calculations use the Mifflin-St Jeor equation for BMR
- TDEE multipliers based on standard activity level guidelines
- Macro distribution optimized for meal timing
- PDF format matches professional nutrition plan templates

## 👤 Created By

**GeroZ** - Follow on [TikTok @master.gero](https://www.tiktok.com/@master.gero) for daily nutrition and training tips!

## 📄 License

Free to use for personal and educational purposes.

---

**Disclaimer**: This tool is for educational purposes only and does not provide medical or nutritional advice. Consult a healthcare professional before making dietary changes.
