const mongoose = require('mongoose');
const dotenv = require('dotenv');
const VaccineType = require('../models/VaccineType');
const connectDB = require('../config/db');

// Load env variables
dotenv.config();

// Connect to MongoDB
connectDB();

const vaccines = [
  // Birth
  {
    name: 'BCG',
    disease: 'Tuberculosis',
    description: 'Bacillus Calmette-Guérin vaccine is primarily used against tuberculosis.',
    recommendedAgeMonths: 0,
    intervalDays: null, // Single dose generally 
  },
  {
    name: 'Hepatitis B - Dose 1',
    disease: 'Hepatitis B',
    description: 'First dose of Hepatitis B vaccine.',
    recommendedAgeMonths: 0,
    intervalDays: 30, // Approx 1 month
  },
  {
    name: 'OPV - Dose 0',
    disease: 'Polio',
    description: 'Oral Polio Vaccine ' + 'birth dose.',
    recommendedAgeMonths: 0,
    intervalDays: 45, // Next at 6 weeks (1.5 months) approx 45 days
  },
  // 1.5 Months (6 weeks)
  {
    name: 'Hepatitis B - Dose 2',
    disease: 'Hepatitis B',
    description: 'Second dose of Hepatitis B vaccine.',
    recommendedAgeMonths: 1.5,
    intervalDays: 120, // Next dose after roughly 4 months (6 months total)
  },
  {
    name: 'OPV - Dose 1',
    disease: 'Polio',
    description: 'Oral Polio Vaccine first dose.',
    recommendedAgeMonths: 1.5,
    intervalDays: 28, // Next at 10 weeks
  },
  {
    name: 'DPT - Dose 1',
    disease: 'Diphtheria, Pertussis, Tetanus',
    description: 'First dose of DPT vaccine.',
    recommendedAgeMonths: 1.5,
    intervalDays: 28, // Next at 10 weeks
  },
  // 2.5 Months (10 weeks)
  {
    name: 'OPV - Dose 2',
    disease: 'Polio',
    description: 'Oral Polio Vaccine second dose.',
    recommendedAgeMonths: 2.5,
    intervalDays: 28, // Next at 14 weeks
  },
  {
    name: 'DPT - Dose 2',
    disease: 'Diphtheria, Pertussis, Tetanus',
    description: 'Second dose of DPT vaccine.',
    recommendedAgeMonths: 2.5,
    intervalDays: 28, // Next at 14 weeks
  },
  // 3.5 Months (14 weeks)
  {
    name: 'OPV - Dose 3',
    disease: 'Polio',
    description: 'Oral Polio Vaccine third dose.',
    recommendedAgeMonths: 3.5,
    intervalDays: null,
  },
  {
    name: 'DPT - Dose 3',
    disease: 'Diphtheria, Pertussis, Tetanus',
    description: 'Third dose of DPT vaccine.',
    recommendedAgeMonths: 3.5,
    intervalDays: 365, // Booster after 1 year generally (16-24 months)
  },
  // 6 Months
  {
    name: 'Hepatitis B - Dose 3',
    disease: 'Hepatitis B',
    description: 'Third dose of Hepatitis B vaccine.',
    recommendedAgeMonths: 6,
    intervalDays: null,
  },
  // 9-12 Months
  {
    name: 'MMR',
    disease: 'Measles, Mumps, Rubella',
    description: 'Mumps, Measles, Rubella vaccine.',
    recommendedAgeMonths: 9,
    intervalDays: null,
  },
  {
    name: 'Typhoid',
    disease: 'Typhoid',
    description: 'Typhoid conjugate vaccine.',
    recommendedAgeMonths: 9,
    intervalDays: null,
  },
  // Others / Adults
  {
    name: 'COVID-19 - Dose 1',
    disease: 'COVID-19',
    description: 'First dose of COVID-19 vaccine.',
    recommendedAgeMonths: 216, // 18 years
    intervalDays: 28,
  },
  {
    name: 'COVID-19 - Dose 2',
    disease: 'COVID-19',
    description: 'Second dose of COVID-19 vaccine.',
    recommendedAgeMonths: 217,
    intervalDays: null,
  },
  {
    name: 'Influenza (Annual)',
    disease: 'Influenza',
    description: 'Annual flu shot.',
    recommendedAgeMonths: 6,
    intervalDays: 365,
  }
];

const seedVaccines = async () => {
  try {
    await VaccineType.deleteMany();
    await VaccineType.insertMany(vaccines);
    console.log('Vaccines seeded successfully!');
    process.exit();
  } catch (error) {
    console.error('Error seeding vaccines:', error);
    process.exit(1);
  }
};

seedVaccines();
