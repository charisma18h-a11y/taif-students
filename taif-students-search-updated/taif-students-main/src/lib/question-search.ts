/** Normalize common Arabic spelling and digit variants for question search. */
export function normalizeQuestionSearch(value: string): string {
  return value.normalize('NFKC').toLowerCase()
    .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06edـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

export function matchesQuestionSearch(question: string, search: string): boolean {
  const normalizedQuestion = normalizeQuestionSearch(question)
  return normalizeQuestionSearch(search).split(/\s+/).every(word => normalizedQuestion.includes(word))
}
