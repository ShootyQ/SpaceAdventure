import { generateMathTemplateQuestions } from './math';
import { PracticeAssignmentConfig, PracticeQuestion, PracticeTemplate, GradeLevel } from './types';

export const PRACTICE_TEMPLATES: PracticeTemplate[] = [
    {
        id: 'math-addition-within-20',
        name: 'Addition Within 20',
        description: 'Single-digit and teen addition fluency.',
        grades: [1],
        category: 'addition',
    },
    {
        id: 'math-addition-1-3-digit',
        name: 'Addition (1-3 Digit)',
        description: 'Multi-digit addition with place value practice.',
        grades: [2, 3],
        category: 'addition',
    },
    {
        id: 'math-subtraction-1-3-digit',
        name: 'Subtraction (1-3 Digit)',
        description: 'Subtraction fluency with regrouping-ready numbers.',
        grades: [2, 3],
        category: 'subtraction',
    },
    {
        id: 'math-multiplication-facts',
        name: 'Multiplication Facts',
        description: 'Multiplication tables practice.',
        grades: [3, 4],
        category: 'multiplication',
    },
    {
        id: 'math-division-facts',
        name: 'Division Facts',
        description: 'Division fact fluency with whole-number quotients.',
        grades: [3, 4],
        category: 'division',
    },
    {
        id: 'math-multi-digit-multiplication',
        name: 'Multi-Digit Multiplication',
        description: 'Multiply larger whole numbers.',
        grades: [4, 5],
        category: 'multiplication',
    },
    {
        id: 'math-long-division',
        name: 'Long Division',
        description: 'Division with larger dividends.',
        grades: [4, 5],
        category: 'division',
    },
    {
        id: 'math-fraction-add-common-denominator',
        name: 'Fraction Addition (Common Denominator)',
        description: 'Add fractions with same denominator (decimal response).',
        grades: [5],
        category: 'fractions',
    },
    {
        id: 'math-decimal-operations',
        name: 'Decimal Operations',
        description: 'Add, subtract, and divide decimals.',
        grades: [5, 6],
        category: 'decimals',
    },
    {
        id: 'math-ratios-and-rates',
        name: 'Ratios and Rates',
        description: 'Equivalent ratio and unit-rate basics.',
        grades: [6, 7],
        category: 'ratios',
    },
    {
        id: 'math-one-step-equations',
        name: 'One-Step Equations',
        description: 'Solve simple variable equations.',
        grades: [7],
        category: 'algebra',
    },
    {
        id: 'math-systems-intro',
        name: 'Systems Intro',
        description: 'Early systems/function thinking warmups.',
        grades: [8],
        category: 'algebra',
    },
];

export const getPracticeTemplatesForGrade = (grade: GradeLevel | 'all'): PracticeTemplate[] => {
    if (grade === 'all') return PRACTICE_TEMPLATES;
    return PRACTICE_TEMPLATES.filter((template) => template.grades.includes(grade));
};

export const createPracticeQuestions = (
    config: PracticeAssignmentConfig,
    seed?: string
): PracticeQuestion[] => {
    return generateMathTemplateQuestions({ config, seed });
};

export * from './types';
