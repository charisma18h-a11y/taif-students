/** Conservative matching: exact normalized full names; uncertain names require manual review. */
export function normalizeRosterName(value: string): string {
  return value.normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u200B-\u200D\uFEFF]/g, '')
    .replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه')
    .replace(/[^\p{L}\p{N}\s]/gu,' ')
    .split(/\s+/u).filter(t => t && t !== 'بن' && t !== 'ابن' && t !== 'بنت')
    .join(' ').trim().toLocaleLowerCase('ar')
}

/** Accepts Blackboard copied participant listings, one name per line, or simple name-only lists. */
export function parseRosterText(input: string): { names: string[]; skipped: number; duplicates: number } {
  const lines = input.replace(/\r/g, '\n').split('\n').map(s => s.trim()).filter(Boolean)
  const names: string[] = []
  const seen = new Set<string>()
  let skipped = 0, duplicates = 0
  const ignoreLine = (s: string) => /^(الطالب|المدرس|المدرّس|استاذ|الأستاذ|المعلم|المادة|المقرر|اسم الطالب|اسم|دور|role|student|instructor|teacher)$/iu.test(s)
  for (let i=0;i<lines.length;i++) {
    const raw = lines[i].replace(/^\s*(?:\d+[.\-)\s]+|[•*-]\s+)/u, '').trim()
    if (ignoreLine(raw) || /^.{0,120}(?:_PreviewUser|PreviewUser)/iu.test(raw) || /^الشعبة\s*[:：-]?\s*\d+$/u.test(raw)) { skipped++;continue }
    // If copied in the common Blackboard pattern: person name followed by role,
    // exclude anyone explicitly labelled instructor. No blanket name guesses.
    const next = lines[i+1] || ''
    if (/^(المدرس|المدرّس|instructor|teacher)$/iu.test(next)) { skipped++;continue }
    const name = raw.replace(/\s+/g,' ')
    const normalized = normalizeRosterName(name)
    // Avoid accidentally importing headers, numbers or irrelevant short labels.
    if (name.length < 5 || name.length > 160 || normalized.split(' ').length < 2 || /^\d+$/u.test(normalized)) {skipped++;continue}
    if (seen.has(normalized)) {duplicates++;continue}
    seen.add(normalized); names.push(name)
  }
  return { names, skipped, duplicates }
}

export type RosterStudent = {id:string;name:string;universityId:string|null}
export type OfficialEntry = {id:string;rosterId:string;fullName:string;normalizedName:string;linkedStudentId:string|null}
export type CourseEnrollment = {studentId:string;courseId:string;section:string}
export type RosterGroup = 'matched'|'account_elsewhere'|'no_account_match'|'needs_review'
export type OfficialResult = {entry:OfficialEntry; student:RosterStudent|null; state:Exclude<RosterGroup,'needs_review'>; ambiguous:boolean; manual:boolean}

export function compareRoster(entries:OfficialEntry[],students:RosterStudent[], enrollments:CourseEnrollment[],courseId:string,section:string) {
  const normalizedToStudents = new Map<string,RosterStudent[]>()
  const byId=new Map(students.map(s=>[s.id,s]))
  for(const student of students){
    const key=normalizeRosterName(student.name)
    normalizedToStudents.set(key,[...(normalizedToStudents.get(key)||[]),student])
  }
  const rosterResults:OfficialResult[]=[]
  const linked=new Set<string>()
  for (const entry of entries) {
    const manual=!!entry.linkedStudentId
    const exactMatches=normalizedToStudents.get(entry.normalizedName)||[]
    const student=(entry.linkedStudentId?byId.get(entry.linkedStudentId):undefined)||(!entry.linkedStudentId && exactMatches.length===1 ? exactMatches[0]:undefined)||null
    if(student)linked.add(student.id)
    const belongs=!!student && enrollments.some(e=>e.studentId===student.id&&e.courseId===courseId&&e.section===section)
    rosterResults.push({entry,student,state:student?(belongs?'matched':'account_elsewhere'):'no_account_match',ambiguous:!student && exactMatches.length>1,manual})
  }
  const needingReview=Array.from(byId.values()).filter(s=>
    enrollments.some(e=>e.studentId===s.id&&e.courseId===courseId&&e.section===section)&&!linked.has(s.id)
  )
  return {rosterResults,needingReview}
}
