'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Code2, Users, Eye, LogOut, Shield, Plus, Pencil, Trash2,
  CheckCircle2, Circle, Clock, Search, BookOpen, Calendar,
  TrendingUp, Copy, Check, ChevronLeft, User, Phone, Lock,
  LayoutDashboard, FileText, X, Save, Eye as EyeIcon, EyeOff,
  Sparkles, GraduationCap, UserPlus, LogIn
} from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'

// ===== الأنواع =====
type Student = { id: string; name: string; phone: string }
type Assignment = {
  id: string
  title: string
  description: string
  type: string
  details: string | null
  subject: string | null
  dueDate: string | null
  published: boolean
  createdAt: string
  updatedAt: string
  _count?: { views: number }
}
type Stats = {
  studentCount: number
  assignmentCount: number
  publishedCount: number
  totalViews: number
  topAssignments: { id: string; title: string; views: number }[]
}

// ===== بادج نوع المطلوب =====
const TYPE_STYLES: Record<string, string> = {
  'اختبار': 'bg-red-100 text-red-700 border-red-200',
  'واجب': 'bg-amber-100 text-amber-700 border-amber-200',
  'مشروع': 'bg-teal-100 text-teal-700 border-teal-200',
  'تقرير': 'bg-purple-100 text-purple-700 border-purple-200',
  'أخرى': 'bg-muted text-muted-foreground border-border',
}

function TypeBadge({ type }: { type: string }) {
  const style = TYPE_STYLES[type] || TYPE_STYLES['أخرى']
  const icon = type === 'اختبار' ? <FileText className="size-3" /> : type === 'مشروع' ? <Sparkles className="size-3" /> : <BookOpen className="size-3" />
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium ${style}`}>
      {icon}
      {type}
    </span>
  )
}

// ===== شعار جامعة الطائف =====
function TULogo({ size = 48, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <Image
      src={dark ? '/tu-logo-dark.png' : '/tu-logo.png'}
      alt="جامعة الطائف"
      width={size * 3.8}
      height={size}
      className="object-contain"
      style={{ height: size, width: 'auto' }}
      priority
    />
  )
}

// ===== مكوّن حقل الإدخال العائم =====
function FloatingInput({
  label, icon: Icon, ...props
}: { label: string; icon: React.ElementType } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground/80 flex items-center gap-1.5">
        <Icon className="size-3.5 text-primary/70" />
        {label}
      </Label>
      <Input {...props} className="h-12 text-base" />
    </div>
  )
}

// ===== شاشة الترحيب + الاختيار بين إنشاء حساب / دخول =====
function AuthScreen({ onAuthed }: { onAuthed: (s: Student) => void }) {
  // 3 أوضاع: اختيار (home)، تسجيل (register)، دخول (login)
  const [mode, setMode] = useState<'home' | 'register' | 'login'>('home')
  const { toast } = useToast()

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-pattern">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="border-0 shadow-2xl shadow-primary/10 overflow-hidden">
          <CardHeader className="space-y-3 text-center pb-2 bg-gradient-to-b from-primary/5 to-transparent pt-8">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring' }}
              className="mx-auto flex items-center justify-center"
            >
              <TULogo size={56} />
            </motion.div>
            <CardTitle className="text-2xl font-bold">وش علينا؟</CardTitle>
            <CardDescription className="text-base">
              {mode === 'register'
                ? 'أنشئ حسابك لتتابع اختباراتك وواجباتك الجامعية'
                : mode === 'login'
                ? 'ادخل برقم جوالك وكلمة المرور لمتابعة المطلوب'
                : 'منصة متابعة المطلوب الجامعي - جامعة الطائف'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <AnimatePresence mode="wait">
              {mode === 'home' && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-3"
                >
                  <Button
                    onClick={() => setMode('register')}
                    className="w-full h-14 text-base gap-2"
                  >
                    <UserPlus className="size-5" />
                    إنشاء حساب جديد
                  </Button>
                  <Button
                    onClick={() => setMode('login')}
                    variant="outline"
                    className="w-full h-14 text-base gap-2"
                  >
                    <LogIn className="size-5" />
                    تسجيل الدخول
                  </Button>

                  <div className="pt-4 mt-2 border-t text-center">
                    <AdminLoginButton />
                  </div>
                </motion.div>
              )}

              {mode === 'register' && (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <RegisterForm
                    onBack={() => setMode('home')}
                    onAuthed={onAuthed}
                    switchToLogin={() => setMode('login')}
                  />
                </motion.div>
              )}

              {mode === 'login' && (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <LoginForm
                    onBack={() => setMode('home')}
                    onAuthed={onAuthed}
                    switchToRegister={() => setMode('register')}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* زر الأدمن يظهر فقط في الشاشة الرئيسية */}
            {mode !== 'home' && (
              <div className="pt-4 mt-4 border-t text-center">
                <AdminLoginButton />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

// ===== نموذج التسجيل (خطوتان: بيانات ← باسورد) =====
function RegisterForm({
  onBack, onAuthed, switchToLogin,
}: {
  onBack: () => void
  onAuthed: (s: Student) => void
  switchToLogin: () => void
}) {
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // التحقق من الخطوة 1 قبل الانتقال لخطوة الباسورد
  const [checking, setChecking] = useState(false)
  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || name.trim().length < 2) {
      toast({ variant: 'destructive', title: 'الرجاء إدخال الاسم كامل' })
      return
    }
    // التحقق السريع من صيغة الجوال قبل ما نكمل
    const cleaned = phone.replace(/[\s\-()]/g, '')
    let normalized = cleaned
    if (cleaned.startsWith('+966')) normalized = '0' + cleaned.slice(4)
    else if (cleaned.startsWith('966')) normalized = '0' + cleaned.slice(3)
    else if (cleaned.startsWith('5') && cleaned.length === 9) normalized = '0' + cleaned
    if (!/^05\d{8}$/.test(normalized)) {
      toast({
        variant: 'destructive',
        title: 'رقم الجوال غير صحيح',
        description: 'مثال: 05XXXXXXXX (10 أرقام تبدأ بـ 05)',
      })
      return
    }
    // فحص فوري: هل الرقم مسجّل مسبقاً؟
    setChecking(true)
    try {
      const res = await fetch('/api/auth/check-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (data.exists) {
        toast({
          variant: 'destructive',
          title: 'الرقم مسجّل مسبقاً',
          description: 'استخدم خيار "تسجيل الدخول" بدل "إنشاء حساب"',
        })
        switchToLogin()
        return
      }
    } catch {
      // لو فشل الفحص نكمل، الـ backend راح يفحص ثانية عند الإرسال
    } finally {
      setChecking(false)
    }
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      toast({ variant: 'destructive', title: 'الباسورد قصير', description: '6 أحرف على الأقل' })
      return
    }
    if (password !== confirm) {
      toast({ variant: 'destructive', title: 'الباسورد غير متطابق' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: data.error || 'حدث خطأ',
        })
        if (data.shouldLogin) switchToLogin()
        return
      }
      toast({
        title: 'تم إنشاء الحساب بنجاح',
        description: `أهلاً ${data.student.name} 👋`,
      })
      onAuthed(data.student)
    } catch {
      toast({ variant: 'destructive', title: 'خطأ في الاتصال' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* مؤشر الخطوات */}
      <div className="flex items-center justify-center gap-2 mb-5">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`size-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step >= s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {s}
            </div>
            {s === 1 && (
              <div className={`w-12 h-0.5 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.form
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handleNextStep}
            className="space-y-4"
          >
            <FloatingInput
              label="الاسم الكامل"
              icon={User}
              placeholder="مثال: عبدالله العتيبي"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              autoComplete="name"
            />
            <FloatingInput
              label="رقم الجوال"
              icon={Phone}
              type="tel"
              placeholder="05XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              dir="ltr"
              className="text-right"
              autoComplete="tel"
            />
            <Button type="submit" disabled={checking} className="w-full h-12 text-base gap-1.5">
              {checking ? (
                'جاري التحقق...'
              ) : (
                <>
                  التالي
                  <ChevronLeft className="size-4 rotate-180" />
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              className="w-full h-10"
            >
              رجوع
            </Button>
          </motion.form>
        ) : (
          <motion.form
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="bg-muted/40 rounded-lg p-3 text-sm">
              <p className="text-muted-foreground">
                الاسم: <span className="font-medium text-foreground">{name}</span>
              </p>
              <p className="text-muted-foreground" dir="ltr">
                الجوال: <span className="font-medium text-foreground">{phone}</span>
              </p>
            </div>

            {/* حقل الباسورد */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80 flex items-center gap-1.5">
                <Lock className="size-3.5 text-primary/70" />
                كلمة المرور
              </Label>
              <div className="relative">
                <Input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6 أحرف على الأقل"
                  required
                  minLength={6}
                  dir="ltr"
                  className="h-12 text-base text-right pl-10"
                  autoComplete="new-password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-primary"
                >
                  {showPass ? <EyeOff className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
              </div>
            </div>

            {/* تأكيد الباسورد */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80 flex items-center gap-1.5">
                <Lock className="size-3.5 text-primary/70" />
                تأكيد كلمة المرور
              </Label>
              <Input
                type={showPass ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="أعد كتابة الباسورد"
                required
                minLength={6}
                dir="ltr"
                className="h-12 text-base text-right pl-10"
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full h-12 text-base gap-1.5">
              {loading ? (
                'جاري الإنشاء...'
              ) : (
                <>
                  <UserPlus className="size-4" />
                  إنشاء الحساب
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep(1)}
              className="w-full h-10"
            >
              رجوع للخطوة السابقة
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}

// ===== نموذج الدخول (جوال + باسورد) =====
function LoginForm({
  onBack, onAuthed, switchToRegister,
}: {
  onBack: () => void
  onAuthed: (s: Student) => void
  switchToRegister: () => void
}) {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({
          variant: 'destructive',
          title: 'خطأ',
          description: data.error || 'حدث خطأ',
        })
        if (data.shouldRegister) switchToRegister()
        return
      }
      toast({
        title: 'تم تسجيل الدخول',
        description: `أهلاً ${data.student.name} 👋`,
      })
      onAuthed(data.student)
    } catch {
      toast({ variant: 'destructive', title: 'خطأ في الاتصال' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FloatingInput
        label="رقم الجوال"
        icon={Phone}
        type="tel"
        placeholder="05XXXXXXXX"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
        dir="ltr"
        className="text-right"
        autoComplete="tel"
        autoFocus
      />
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80 flex items-center gap-1.5">
          <Lock className="size-3.5 text-primary/70" />
          كلمة المرور
        </Label>
        <div className="relative">
          <Input
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            dir="ltr"
            className="h-12 text-base text-right pl-10"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-primary"
          >
            {showPass ? <EyeOff className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        </div>
      </div>
      <Button type="submit" disabled={loading} className="w-full h-12 text-base gap-1.5">
        {loading ? (
          'جاري الدخول...'
        ) : (
          <>
            <LogIn className="size-4" />
            تسجيل الدخول
          </>
        )}
      </Button>
      <Button type="button" variant="ghost" onClick={onBack} className="w-full h-10">
        رجوع
      </Button>
    </form>
  )
}

// ===== زر/نموذج دخول الأدمن =====
function AdminLoginButton() {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'خطأ', description: data.error })
        return
      }
      // إعادة تحميل الصفحة للدخول لوضع الأدمن
      window.location.reload()
    } catch {
      toast({ variant: 'destructive', title: 'خطأ في الاتصال' })
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
      >
        <Shield className="size-3.5" />
        دخول الأدمن
      </button>
    )
  }

  return (
    <form onSubmit={handleLogin} className="space-y-3">
      <div className="space-y-2">
        <Label className="text-sm flex items-center gap-1.5 justify-center">
          <Lock className="size-3.5 text-primary" />
          كلمة مرور الأدمن
        </Label>
        <div className="relative">
          <Input
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••"
            dir="ltr"
            className="text-center h-11 pr-10"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-primary"
          >
            {showPass ? <EyeOff className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'جاري...' : 'دخول'}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          إلغاء
        </Button>
      </div>
    </form>
  )
}

// ===== رأس صفحة الطالب =====
function StudentHeader({
  student, onLogout,
}: { student: Student; onLogout: () => void }) {
  return (
    <header className="sticky top-0 z-30 glass border-b">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <TULogo size={34} />
          <div className="min-w-0 border-r pr-3">
            <h1 className="font-bold text-base sm:text-lg truncate leading-tight">وش علينا؟</h1>
            <p className="text-xs text-muted-foreground truncate">
              مرحباً، {student.name}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onLogout} className="shrink-0">
          <LogOut className="size-4 ml-1" />
          خروج
        </Button>
      </div>
    </header>
  )
}

// ===== بطاقة الكود =====
function AssignmentCard({
  assignment, viewed, onView,
}: {
  assignment: Assignment
  viewed: boolean
  onView: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null
  const isOverdue = dueDate && dueDate < new Date()
  const createdDate = new Date(assignment.createdAt)

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <TypeBadge type={assignment.type} />
              {assignment.subject && (
                <Badge variant="secondary" className="font-medium">
                  <BookOpen className="size-3 ml-1" />
                  {assignment.subject}
                </Badge>
              )}
              {viewed ? (
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white gap-1">
                  <CheckCircle2 className="size-3" />
                  تمت المشاهدة
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <Circle className="size-3" />
                  جديد
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg leading-tight">{assignment.title}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {assignment.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="size-3.5" />
            {createdDate.toLocaleDateString('ar-SA', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </span>
          {dueDate && (
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-destructive' : 'text-amber-600'}`}>
              <Clock className="size-3.5" />
              التسليم: {dueDate.toLocaleDateString('ar-SA', {
                year: 'numeric', month: 'short', day: 'numeric',
              })}
            </span>
          )}
        </div>

        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
              <p className="text-sm text-muted-foreground mb-2">الوصف الكامل:</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {assignment.description}
              </p>
            </div>
          </motion.div>
        )}

        {assignment.details && (
          <div className="bg-muted/40 rounded-lg p-3 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">تفاصيل إضافية:</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{assignment.details}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={() => {
              setExpanded(!expanded)
              if (!viewed) onView()
            }}
          >
            {expanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ===== لوحة الطالب =====
function StudentDashboard({
  student, onLogout,
}: { student: Student; onLogout: () => void }) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [viewedIds, setViewedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'new' | 'viewed'>('all')
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/assignments')
      const data = await res.json()
      setAssignments(data.assignments || [])
      setViewedIds(data.viewedIds || [])
    } catch {
      toast({ variant: 'destructive', title: 'فشل تحميل المطلوب' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const recordView = async (assignmentId: string) => {
    try {
      await fetch('/api/assignments/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId }),
      })
      setViewedIds((prev) => prev.includes(assignmentId) ? prev : [...prev, assignmentId])
    } catch {}
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    onLogout()
  }

  const filtered = assignments.filter((a) => {
    const q = search.trim().toLowerCase()
    if (q && !a.title.toLowerCase().includes(q) && !a.description.toLowerCase().includes(q)) return false
    if (filter === 'new' && viewedIds.includes(a.id)) return false
    if (filter === 'viewed' && !viewedIds.includes(a.id)) return false
    return true
  })

  const newCount = assignments.length - viewedIds.filter(id => assignments.some(a => a.id === id)).length

  return (
    <div className="min-h-screen bg-pattern">
      <StudentHeader student={student} onLogout={handleLogout} />

      <main className="container mx-auto px-4 py-6 space-y-6 pb-20">
        {/* بطاقات إحصائية */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <FileText className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{assignments.length}</p>
                <p className="text-xs text-muted-foreground">إجمالي المطلوب</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <Sparkles className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{newCount}</p>
                <p className="text-xs text-muted-foreground">جديد</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{viewedIds.length}</p>
                <p className="text-xs text-muted-foreground">شفتها</p>
              </div>
            </div>
          </Card>
        </div>

        {/* البحث والفلترة */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن اختبار أو واجب..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10 h-11"
            />
          </div>
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'الكل' },
              { key: 'new', label: 'جديد' },
              { key: 'viewed', label: 'تمت المشاهدة' },
            ].map((t) => (
              <Button
                key={t.key}
                variant={filter === t.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(t.key as typeof filter)}
                className="h-11"
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>

        {/* قائمة المطلوب */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-6 bg-muted rounded w-2/3" />
                  <div className="h-20 bg-muted rounded" />
                </div>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="mx-auto size-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <FileText className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">
              {assignments.length === 0 ? 'لا يوجد مطلوب حالياً' : 'لا توجد نتائج'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {assignments.length === 0
                ? 'سيتم إضافة الاختبارات والواجبات من قبل الإدارة قريباً'
                : 'جرّب تعديل البحث أو الفلترة'}
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((a) => (
              <AssignmentCard
                key={a.id}
                assignment={a}
                viewed={viewedIds.includes(a.id)}
                onView={() => recordView(a.id)}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="mt-auto py-4 text-center text-xs text-muted-foreground border-t">
        وش علينا؟ التعليمية • جميع الحقوق محفوظة
      </footer>
    </div>
  )
}

// ===== نموذج إضافة/تعديل الكود (مودال) =====
function AssignmentFormModal({
  assignment, onClose, onSaved,
}: {
  assignment: Assignment | null
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(assignment?.title || '')
  const [description, setDescription] = useState(assignment?.description || '')
  const [type, setType] = useState(assignment?.type || 'واجب')
  const [details, setDetails] = useState(assignment?.details || '')
  const [subject, setSubject] = useState(assignment?.subject || '')
  const [dueDate, setDueDate] = useState(
    assignment?.dueDate ? new Date(assignment.dueDate).toISOString().slice(0, 10) : ''
  )
  const [published, setPublished] = useState(assignment?.published ?? true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        title, description, type, details: details || null, subject: subject || null,
        dueDate: dueDate || null, published,
      }
      const url = assignment
        ? `/api/admin/assignments/${assignment.id}`
        : '/api/admin/assignments'
      const res = await fetch(url, {
        method: assignment ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        toast({ variant: 'destructive', title: 'خطأ', description: data.error })
        return
      }
      toast({
        title: assignment ? 'تم تعديل الكود' : 'تم إضافة الكود',
        description: 'تم الحفظ بنجاح',
      })
      onSaved()
      onClose()
    } catch {
      toast({ variant: 'destructive', title: 'خطأ في الاتصال' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-xl">
                {assignment ? 'تعديل المطلوب' : 'إضافة مطلوب جديد'}
              </CardTitle>
              <CardDescription>أدخل تفاصيل الاختبار أو الواجب المطلوب من الطلاب</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label>عنوان الكود *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: اختبار منتصف الفصل"
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>نوع المطلوب *</Label>
                <div className="flex flex-wrap gap-2">
                  {['اختبار', 'واجب', 'مشروع', 'تقرير', 'أخرى'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`px-4 h-10 rounded-lg text-sm font-medium border transition-colors ${
                        type === t
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>المادة (اختياري)</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="مثال: البرمجة، قواعد البيانات..."
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>الوصف *</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اكتب تفاصيل الاختبار أو الواجب..."
                  required
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>تفاصيل إضافية (اختياري)</Label>
                <Textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="مثال: الفصول 3-5، مسموح بملزمة صفحة واحدة..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>تاريخ التسليم (اختياري)</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <Label className="cursor-pointer">منشور للطلاب</Label>
                  <p className="text-xs text-muted-foreground">إذا كان مفعّلاً، يظهر للطلاب فوراً</p>
                </div>
                <Switch checked={published} onCheckedChange={setPublished} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={saving} className="flex-1 h-11">
                  {saving ? 'جاري الحفظ...' : (
                    <>
                      <Save className="size-4 ml-1" />
                      حفظ
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={onClose} className="h-11">
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

// ===== لوحة الأدمن =====
function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<'overview' | 'assignments' | 'students'>('overview')
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Assignment | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const { toast } = useToast()

  const loadAll = useCallback(async () => {
    try {
      const [aRes, sRes, stRes] = await Promise.all([
        fetch('/api/admin/assignments'),
        fetch('/api/admin/students'),
        fetch('/api/admin/stats'),
      ])
      if (aRes.ok) {
        const aData = await aRes.json()
        setAssignments(aData.assignments || [])
      }
      if (sRes.ok) {
        const sData = await sRes.json()
        setStudents(sData.students || [])
      }
      if (stRes.ok) {
        setStats(await stRes.json())
      }
    } catch {
      toast({ variant: 'destructive', title: 'فشل التحميل' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { loadAll() }, [loadAll])

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/assignments/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'فشل الحذف' })
        return
      }
      toast({ title: 'تم الحذف' })
      setConfirmDelete(null)
      loadAll()
    } catch {
      toast({ variant: 'destructive', title: 'خطأ في الاتصال' })
    }
  }

  const togglePublish = async (a: Assignment) => {
    try {
      const res = await fetch(`/api/admin/assignments/${a.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !a.published }),
      })
      if (!res.ok) throw new Error()
      toast({ title: a.published ? 'تم إخفاء الكود' : 'تم نشر الكود' })
      loadAll()
    } catch {
      toast({ variant: 'destructive', title: 'فشل التحديث' })
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    onLogout()
  }

  return (
    <div className="min-h-screen bg-pattern flex flex-col">
      {/* رأس الأدمن */}
      <header className="sticky top-0 z-30 glass border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <TULogo size={34} />
            <div className="border-r pr-3">
              <h1 className="font-bold text-base sm:text-lg">لوحة تحكم الأدمن</h1>
              <p className="text-xs text-muted-foreground">إدارة المطلوب والطلاب</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="size-4 ml-1" />
            خروج
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 flex-1">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid grid-cols-3 w-full mb-6 h-12">
            <TabsTrigger value="overview" className="gap-1">
              <LayoutDashboard className="size-4" />
              نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="assignments" className="gap-1">
              <FileText className="size-4" />
              المطلوب
            </TabsTrigger>
            <TabsTrigger value="students" className="gap-1">
              <Users className="size-4" />
              الطلاب
            </TabsTrigger>
          </TabsList>

          {/* ===== نظرة عامة ===== */}
          <TabsContent value="overview" className="space-y-6">
            {loading || !stats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="p-6 animate-pulse">
                    <div className="h-16 bg-muted rounded" />
                  </Card>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard icon={Users} label="الطلاب المسجلون" value={stats.studentCount} color="primary" />
                  <StatCard icon={FileText} label="إجمالي المطلوب" value={stats.assignmentCount} color="amber" />
                  <StatCard icon={CheckCircle2} label="منشور للطلاب" value={stats.publishedCount} color="emerald" />
                  <StatCard icon={Eye} label="إجمالي المشاهدات" value={stats.totalViews} color="teal" />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="size-5 text-primary" />
                      الأكثر مشاهدة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats.topAssignments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        لا توجد مشاهدات بعد
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {stats.topAssignments.map((t, i) => (
                          <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors">
                            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{t.title}</p>
                            </div>
                            <Badge variant="secondary" className="gap-1">
                              <Eye className="size-3" />
                              {t.views}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ===== المطلوب ===== */}
          <TabsContent value="assignments" className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">إدارة المطلوب ({assignments.length})</h2>
              <Button
                onClick={() => { setEditing(null); setModalOpen(true) }}
                className="gap-1"
              >
                <Plus className="size-4" />
                إضافة مطلوب
              </Button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-4 animate-pulse">
                    <div className="h-16 bg-muted rounded" />
                  </Card>
                ))}
              </div>
            ) : assignments.length === 0 ? (
              <Card className="p-12 text-center">
                <FileText className="size-12 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">لا يوجد مطلوب بعد</p>
                <p className="text-sm text-muted-foreground">ابدأ بإضافة أول اختبار أو واجب</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {assignments.map((a) => (
                  <Card key={a.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <TypeBadge type={a.type} />
                          {a.subject && (
                            <Badge variant="secondary" className="font-medium">{a.subject}</Badge>
                          )}
                          <Badge
                            variant={a.published ? 'default' : 'outline'}
                            className={a.published ? 'bg-emerald-600 hover:bg-emerald-600 text-white gap-1' : 'gap-1'}
                          >
                            {a.published ? (
                              <><CheckCircle2 className="size-3" />منشور</>
                            ) : (
                              <><EyeOff className="size-3" />مخفي</>
                            )}
                          </Badge>
                          {a._count && a._count.views > 0 && (
                            <Badge variant="outline" className="gap-1">
                              <Eye className="size-3" />
                              {a._count.views} مشاهدة
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold leading-tight">{a.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.description}</p>
                        {a.details && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-1">📝 {a.details}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => togglePublish(a)}
                          title={a.published ? 'إخفاء' : 'نشر'}
                        >
                          {a.published ? <EyeOff className="size-4" /> : <EyeIcon className="size-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditing(a); setModalOpen(true) }}
                          title="تعديل"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setConfirmDelete(a.id)}
                          title="حذف"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ===== الطلاب ===== */}
          <TabsContent value="students" className="space-y-4">
            <h2 className="text-lg font-semibold">الطلاب المسجلون ({students.length})</h2>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-4 animate-pulse">
                    <div className="h-12 bg-muted rounded" />
                  </Card>
                ))}
              </div>
            ) : students.length === 0 ? (
              <Card className="p-12 text-center">
                <Users className="size-12 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">لا يوجد طلاب مسجلون بعد</p>
                <p className="text-sm text-muted-foreground">سيظهر هنا من يسجّل في المنصة</p>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="text-right">
                        <th className="p-3 font-medium">#</th>
                        <th className="p-3 font-medium">الاسم</th>
                        <th className="p-3 font-medium">رقم الجوال</th>
                        <th className="p-3 font-medium">المشاهدات</th>
                        <th className="p-3 font-medium">تاريخ التسجيل</th>
                        <th className="p-3 font-medium">آخر دخول</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s: any, i) => (
                        <tr key={s.id} className="border-t hover:bg-muted/30">
                          <td className="p-3 text-muted-foreground">{i + 1}</td>
                          <td className="p-3 font-medium">{s.name}</td>
                          <td className="p-3" dir="ltr">{s.phone}</td>
                          <td className="p-3">
                            <Badge variant="secondary">{s._count?.views || 0}</Badge>
                          </td>
                          <td className="p-3 text-muted-foreground text-xs">
                            {new Date(s.createdAt).toLocaleDateString('ar-SA')}
                          </td>
                          <td className="p-3 text-muted-foreground text-xs">
                            {s.lastLogin
                              ? new Date(s.lastLogin).toLocaleDateString('ar-SA')
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* مودال الإضافة/التعديل */}
      <AnimatePresence>
        {modalOpen && (
          <AssignmentFormModal
            assignment={editing}
            onClose={() => setModalOpen(false)}
            onSaved={loadAll}
          />
        )}
      </AnimatePresence>

      {/* تأكيد الحذف */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="max-w-sm w-full">
                <CardHeader>
                  <CardTitle>تأكيد الحذف</CardTitle>
                  <CardDescription>
                    هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذا الإجراء.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(confirmDelete)}
                    className="flex-1"
                  >
                    نعم، احذف
                  </Button>
                  <Button variant="outline" onClick={() => setConfirmDelete(null)} className="flex-1">
                    إلغاء
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="mt-auto py-4 text-center text-xs text-muted-foreground border-t">
        لوحة تحكم الأدمن • وش علينا؟
      </footer>
    </div>
  )
}

// ===== بطاقة إحصائية =====
function StatCard({
  icon: Icon, label, value, color,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: 'primary' | 'amber' | 'emerald' | 'teal'
}) {
  const colors = {
    primary: 'bg-primary/10 text-primary',
    amber: 'bg-amber-100 text-amber-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    teal: 'bg-teal-100 text-teal-600',
  }
  return (
    <Card className="p-5">
      <div className={`size-12 rounded-xl ${colors[color]} flex items-center justify-center mb-3`}>
        <Icon className="size-6" />
      </div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </Card>
  )
}

// ===== المكوّن الرئيسي =====
export default function HomePage() {
  const [student, setStudent] = useState<Student | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // تحقق من حالة الجلسة
    fetch('/api/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.student) setStudent(data.student)
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    // تحقق من جلسة الأدمن
    fetch('/api/admin/stats')
      .then((r) => {
        if (r.ok) setIsAdmin(true)
      })
      .catch(() => {})
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pattern">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center animate-pulse">
            <Code2 className="size-6" />
          </div>
          <p className="text-sm text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (isAdmin) {
    return <AdminDashboard onLogout={() => { setIsAdmin(false); window.location.reload() }} />
  }

  if (student) {
    return <StudentDashboard student={student} onLogout={() => { setStudent(null); window.location.reload() }} />
  }

  return <AuthScreen onAuthed={(s) => { setStudent(s); window.location.reload() }} />
}
