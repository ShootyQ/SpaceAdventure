export type GradeLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type PracticeTemplateId =
    | 'math-addition-within-20'
    | 'math-addition-1-3-digit'
    | 'math-subtraction-1-3-digit'
    | 'math-multiplication-facts'
    | 'math-division-facts'
    | 'math-multi-digit-multiplication'
    | 'math-long-division'
    | 'math-fraction-add-common-denominator'
    | 'math-decimal-operations'
    | 'math-ratios-and-rates'
    | 'math-one-step-equations'
    | 'math-systems-intro';

export interface PracticeTemplate {
    id: PracticeTemplateId;
    name: string;
    description: string;
    grades: GradeLevel[];
    category: 'addition' | 'subtraction' | 'multiplication' | 'division' | 'fractions' | 'decimals' | 'algebra' | 'ratios';
}

export interface PracticeAssignmentConfig {
    templateId: PracticeTemplateId;
    subject: 'math';
    gradeLevel: GradeLevel;
    questionCount: number;
    numberRangeMin?: number;
    numberRangeMax?: number;
    tableMin?: number;
    tableMax?: number;
    multiplicandMin?: number;
    multiplicandMax?: number;
    denominatorMin?: number;
    denominatorMax?: number;
    decimalPlaces?: 0 | 1 | 2 | 3;
    attemptPolicy: 'once' | 'unlimited';
}

export interface PracticeQuestion {
    id: string;
    prompt: string;
    answer: string;
    acceptedAnswers?: string[];
    inputMode?: 'numeric' | 'text';
}

export interface PracticeGeneratorInput {
    config: PracticeAssignmentConfig;
    seed?: string;
}
