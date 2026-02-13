import { PracticeAssignmentConfig, PracticeGeneratorInput, PracticeQuestion } from './types';

const seededNumber = (seedSource: string, modulo: number) => {
    let hash = 2166136261;
    for (let index = 0; index < seedSource.length; index++) {
        hash ^= seedSource.charCodeAt(index);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    const positive = Math.abs(hash >>> 0);
    return positive % Math.max(modulo, 1);
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const normalizeConfig = (config: PracticeAssignmentConfig): Required<Pick<PracticeAssignmentConfig, 'questionCount' | 'numberRangeMin' | 'numberRangeMax' | 'tableMin' | 'tableMax' | 'multiplicandMin' | 'multiplicandMax' | 'denominatorMin' | 'denominatorMax' | 'decimalPlaces'>> => ({
    questionCount: clamp(Number(config.questionCount || 20), 5, 60),
    numberRangeMin: clamp(Number(config.numberRangeMin ?? 0), -999, 9999),
    numberRangeMax: clamp(Number(config.numberRangeMax ?? 20), -999, 9999),
    tableMin: clamp(Number(config.tableMin ?? 1), 1, 20),
    tableMax: clamp(Number(config.tableMax ?? 12), 1, 20),
    multiplicandMin: clamp(Number(config.multiplicandMin ?? 1), 0, 999),
    multiplicandMax: clamp(Number(config.multiplicandMax ?? 12), 0, 999),
    denominatorMin: clamp(Number(config.denominatorMin ?? 2), 2, 20),
    denominatorMax: clamp(Number(config.denominatorMax ?? 12), 2, 20),
    decimalPlaces: clamp(Number(config.decimalPlaces ?? 2), 0, 3) as 0 | 1 | 2 | 3,
});

const buildRange = (low: number, high: number) => {
    const min = Math.min(low, high);
    const max = Math.max(low, high);
    return { min, max, span: max - min + 1 };
};

const numericQuestion = (id: number, prompt: string, answer: number, decimalPlaces = 0): PracticeQuestion => {
    const value = decimalPlaces > 0 ? Number(answer.toFixed(decimalPlaces)) : Math.round(answer);
    return {
        id: String(id),
        prompt,
        answer: String(value),
        inputMode: 'numeric',
    };
};

export const generateMathTemplateQuestions = ({ config, seed }: PracticeGeneratorInput): PracticeQuestion[] => {
    const normalized = normalizeConfig(config);
    const range = buildRange(normalized.numberRangeMin, normalized.numberRangeMax);
    const tableRange = buildRange(normalized.tableMin, normalized.tableMax);
    const multiplicandRange = buildRange(normalized.multiplicandMin, normalized.multiplicandMax);
    const denominatorRange = buildRange(normalized.denominatorMin, normalized.denominatorMax);

    const makeInt = (prefix: string, span: number, min: number, idx: number) => min + seededNumber(`${seed || 'session'}:${idx}:${prefix}`, span);

    return Array.from({ length: normalized.questionCount }, (_, idx) => {
        const index = idx + 1;

        if (config.templateId === 'math-addition-within-20') {
            const left = makeInt('a1-left', 21, 0, idx);
            const right = makeInt('a1-right', 21 - left, 0, idx);
            return numericQuestion(index, `${left} + ${right} = ?`, left + right);
        }

        if (config.templateId === 'math-addition-1-3-digit') {
            const left = makeInt('a2-left', range.span, range.min, idx);
            const right = makeInt('a2-right', range.span, range.min, idx);
            return numericQuestion(index, `${left} + ${right} = ?`, left + right);
        }

        if (config.templateId === 'math-subtraction-1-3-digit') {
            const leftRaw = makeInt('s1-left', range.span, range.min, idx);
            const rightRaw = makeInt('s1-right', range.span, range.min, idx);
            const left = Math.max(leftRaw, rightRaw);
            const right = Math.min(leftRaw, rightRaw);
            return numericQuestion(index, `${left} - ${right} = ?`, left - right);
        }

        if (config.templateId === 'math-multiplication-facts') {
            const left = makeInt('m1-left', tableRange.span, tableRange.min, idx);
            const right = makeInt('m1-right', multiplicandRange.span, multiplicandRange.min, idx);
            return numericQuestion(index, `${left} × ${right} = ?`, left * right);
        }

        if (config.templateId === 'math-division-facts') {
            const divisor = Math.max(1, makeInt('d1-divisor', Math.max(tableRange.span, 1), Math.max(tableRange.min, 1), idx));
            const quotient = Math.max(1, makeInt('d1-quotient', Math.max(multiplicandRange.span, 1), Math.max(multiplicandRange.min, 1), idx));
            const dividend = divisor * quotient;
            return numericQuestion(index, `${dividend} ÷ ${divisor} = ?`, quotient);
        }

        if (config.templateId === 'math-multi-digit-multiplication') {
            const left = makeInt('m2-left', range.span, Math.max(range.min, 10), idx);
            const right = makeInt('m2-right', range.span, Math.max(range.min, 10), idx);
            return numericQuestion(index, `${left} × ${right} = ?`, left * right);
        }

        if (config.templateId === 'math-long-division') {
            const divisor = Math.max(2, makeInt('d2-divisor', 18, 2, idx));
            const quotient = Math.max(2, makeInt('d2-quotient', 40, 2, idx));
            const dividend = divisor * quotient;
            return numericQuestion(index, `${dividend} ÷ ${divisor} = ?`, quotient);
        }

        if (config.templateId === 'math-fraction-add-common-denominator') {
            const denominator = makeInt('f1-den', denominatorRange.span, denominatorRange.min, idx);
            const leftNum = makeInt('f1-left', Math.max(denominator - 1, 1), 1, idx);
            const rightNum = makeInt('f1-right', Math.max(denominator - leftNum, 1), 1, idx);
            const sum = leftNum + rightNum;
            const prompt = `${leftNum}/${denominator} + ${rightNum}/${denominator} = ? (decimal)`;
            return numericQuestion(index, prompt, sum / denominator, normalized.decimalPlaces);
        }

        if (config.templateId === 'math-decimal-operations') {
            const leftInt = makeInt('de-left', range.span, range.min, idx);
            const rightInt = makeInt('de-right', range.span, Math.max(range.min, 1), idx);
            const left = leftInt / 10;
            const right = Math.max(0.1, rightInt / 10);
            const opPick = seededNumber(`${seed || 'session'}:${idx}:de-op`, 3);
            if (opPick === 0) return numericQuestion(index, `${left.toFixed(1)} + ${right.toFixed(1)} = ?`, left + right, normalized.decimalPlaces);
            if (opPick === 1) return numericQuestion(index, `${(left + right).toFixed(1)} - ${left.toFixed(1)} = ?`, right, normalized.decimalPlaces);
            return numericQuestion(index, `${(left * 10).toFixed(1)} ÷ ${(right * 10).toFixed(1)} = ?`, left / right, normalized.decimalPlaces);
        }

        if (config.templateId === 'math-ratios-and-rates') {
            const base = Math.max(2, makeInt('r1-base', 19, 2, idx));
            const multiplier = Math.max(2, makeInt('r1-mul', 8, 2, idx));
            const left = base;
            const right = base * multiplier;
            return numericQuestion(index, `Complete the equivalent ratio: ${left}:${right} = 1 : ?`, multiplier);
        }

        if (config.templateId === 'math-one-step-equations') {
            const result = makeInt('e1-result', 30, 1, idx);
            const add = makeInt('e1-add', 20, 1, idx);
            return numericQuestion(index, `Solve for x: x + ${add} = ${result + add}`, result);
        }

        const solutionX = makeInt('e2-x', 15, 1, idx);
        const solutionY = makeInt('e2-y', 15, 1, idx);
        return numericQuestion(index, `If x = ${solutionX} and y = ${solutionY}, what is x + y?`, solutionX + solutionY);
    });
};
