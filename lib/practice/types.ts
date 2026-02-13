export type GradeLevel = 3 | 4;

export type PracticeTemplateId = 'math-multiplication-1-12';

export interface PracticeAssignmentConfig {
    templateId: PracticeTemplateId;
    subject: 'math';
    gradeLevel: GradeLevel;
    questionCount: number;
    tableMin: number;
    tableMax: number;
    multiplicandMin: number;
    multiplicandMax: number;
    attemptPolicy: 'once' | 'unlimited';
}

export interface PracticeQuestion {
    id: string;
    prompt: string;
    answer: number;
    operands: number[];
    operator: 'x';
}

export interface PracticeGeneratorInput {
    config: PracticeAssignmentConfig;
    seed?: string;
}
