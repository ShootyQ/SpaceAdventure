import { PracticeAssignmentConfig, PracticeGeneratorInput, PracticeQuestion } from './types';

const seededNumber = (seedSource: string, modulo: number) => {
    let hash = 2166136261;
    for (let index = 0; index < seedSource.length; index++) {
        hash ^= seedSource.charCodeAt(index);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    const positive = Math.abs(hash >>> 0);
    return positive % modulo;
};

const clampConfig = (config: PracticeAssignmentConfig): PracticeAssignmentConfig => {
    return {
        ...config,
        questionCount: Math.min(Math.max(Number(config.questionCount || 20), 5), 60),
        tableMin: Math.min(Math.max(Number(config.tableMin ?? 1), 1), 12),
        tableMax: Math.min(Math.max(Number(config.tableMax ?? 12), 1), 12),
        multiplicandMin: Math.min(Math.max(Number(config.multiplicandMin ?? 1), 1), 12),
        multiplicandMax: Math.min(Math.max(Number(config.multiplicandMax ?? 12), 1), 12),
    };
};

export const generateMultiplicationQuestions = ({ config, seed }: PracticeGeneratorInput): PracticeQuestion[] => {
    const normalized = clampConfig(config);
    const tableMin = Number(normalized.tableMin ?? 1);
    const tableMax = Number(normalized.tableMax ?? 12);
    const multiplicandMin = Number(normalized.multiplicandMin ?? 1);
    const multiplicandMax = Number(normalized.multiplicandMax ?? 12);

    const lowTable = Math.min(tableMin, tableMax);
    const highTable = Math.max(tableMin, tableMax);
    const lowMultiplicand = Math.min(multiplicandMin, multiplicandMax);
    const highMultiplicand = Math.max(multiplicandMin, multiplicandMax);

    const tableSpan = highTable - lowTable + 1;
    const multiplicandSpan = highMultiplicand - lowMultiplicand + 1;

    return Array.from({ length: normalized.questionCount }, (_, index) => {
        const seedPrefix = `${seed || 'session'}:${normalized.gradeLevel}:${index}`;
        const left = lowTable + seededNumber(`${seedPrefix}:left`, tableSpan);
        const right = lowMultiplicand + seededNumber(`${seedPrefix}:right`, multiplicandSpan);
        return {
            id: `${index + 1}`,
            prompt: `${left} × ${right} = ?`,
            answer: String(left * right),
            inputMode: 'numeric',
        };
    });
};
