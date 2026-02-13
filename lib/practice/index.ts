import { generateMultiplicationQuestions } from './multiplication';
import { PracticeAssignmentConfig, PracticeQuestion } from './types';

export const PRACTICE_TEMPLATES = {
    'math-multiplication-1-12': {
        id: 'math-multiplication-1-12',
        name: 'Multiplication (1-12)',
        description: 'Auto-generates multiplication facts across selected tables.',
    },
} as const;

export const createPracticeQuestions = (
    config: PracticeAssignmentConfig,
    seed?: string
): PracticeQuestion[] => {
    if (config.templateId === 'math-multiplication-1-12') {
        return generateMultiplicationQuestions({ config, seed });
    }
    return [];
};

export * from './types';
