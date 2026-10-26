import Link from 'next/link';
const questions = [
{question:"قُذفت كرة رأسياً لأعلى بسرعة ابتدائية 19.6 m/s. ما أقصى ارتفاع تصل إليه بإهمال مقاومة الهواء؟",answer:"19.6 m",number:"1"},
{question:"جسم وزنه على سطح الأرض 490 N. ما كتلته بوحدة kg؟",answer:"50 kg",number:"2"},
{question:"ما الصيغة الرياضية لقانون نيوتن الثاني؟",answer:"F = ma",number:"4"},
{question:"تسارع الجسم يتناسب طردياً مع القوة المؤثرة عليه.",answer:"صواب، عند ثبات الكتلة.",number:"7"},
{question:"ما مقدار الطاقة الحركية لسيارة كتلتها 1500 kg وتتحرك بسرعة 72 km/h؟",answer:"300 × 10³ J",number:"8"},
{question:"الكتلة والوزن كميتان متساويتان.",answer:"خطأ؛ الكتلة تقاس بالكيلوغرام والوزن بالنيوتن.",number:"9"},
{question:"عند قذف كرة لأعلى، يكون تسارع الجاذبية الأرضية سالباً بالنسبة لنقطة القذف (باعتبار الاتجاه لأعلى موجباً).",answer:"صواب.",number:"10"},
{question:"عند أقصى ارتفاع تصل إليه كرة مقذوفة رأسياً لأعلى تكون سرعتها وتسارعها كلاهما صفراً.",answer:"خطأ؛ السرعة اللحظية صفر والتسارع 9.8 m/s² لأسفل.",number:"11"},
{question:"وزن الجسم على القمر يكون أقل من وزنه على الأرض.",answer:"صواب.",number:"12"},
{question:"الطاقة الحركية لجسم لا يمكن أن تكون سالبة.",answer:"صواب.",number:"13"},
{question:"وحدة قياس الكتلة في النظام الدولي للوحدات هي الجرام.",answer:"خطأ؛ الكيلوغرام (kg).",number:"15"},
{question:"وحدة القوة في النظام الدولي هي النيوتن (N)، وتكافئ kg·m/s².",answer:"صواب.",number:"16"},
{question:"أثرت قوة مقدارها 20 N على صندوق فأزاحته 3 m في نفس اتجاه القوة. ما مقدار الشغل المبذول؟",answer:"60 J",number:"17"},
{question:"عندما يتحرك جسم بسرعة ثابتة في خط مستقيم فإن تسارعه يساوي صفراً.",answer:"صواب.",number:"18"},
{question:"قُذفت كرة رأسياً لأعلى بسرعة ابتدائية 19.6 m/s. ما الزمن اللازم لوصولها إلى أقصى ارتفاع؟",answer:"2 s",number:"19"},
{question:"أثرت قوة ما على جسم كتلته 3 kg فأكسبته تسارعاً 4 m/s². إذا زادت كتلته إلى 6 kg وبقيت القوة نفسها، فما التسارع؟",answer:"2 m/s²",number:"20"}
];
export default function QuestionsPage(){return <main dir="rtl" className="min-h-screen bg-[#0b1322] text-white px-4 py-10"><div className="max-w-3xl mx-auto"><Link href="/" className="text-amber-300 hover:underline">← العودة إلى وش علينا؟</Link><div className="my-8"><p className="text-amber-300 text-sm">مراجعة الفيزياء</p><h1 className="text-3xl font-bold mt-2">بنك الأسئلة والإجابات</h1><p className="text-slate-400 mt-3">أسئلة مراجعة من التسجيل المرسل. تمت إعادة صياغة بعض النصوص، وقد لا تكون شاملة لجميع أسئلة التسجيل. راجع الإجابات قبل الاعتماد عليها.</p></div><div className="space-y-4">{questions.map((q,i)=><article key={i} className="rounded-2xl border border-amber-500/20 bg-[#162239] p-5"><p className="text-xs text-amber-300 mb-2">السؤال {q.number}</p><h2 className="text-lg font-semibold leading-8">{q.question}</h2><div className="border-t border-white/10 mt-4 pt-4"><p className="text-xs text-slate-400 mb-1">الإجابة المقترحة</p><p className="font-bold text-amber-300">{q.answer}</p></div></article>)}</div></div></main>}
