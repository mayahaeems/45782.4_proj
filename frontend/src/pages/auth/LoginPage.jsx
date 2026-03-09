import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { Mail, Lock } from 'lucide-react'
import { useLogin } from '@/hooks/useAuth'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export default function LoginPage() {
  const { mutate: login, isPending } = useLogin()
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50
                    flex items-center justify-center p-4">
      {/* decorative blobs */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-brand-200 rounded-full blur-3xl opacity-40" />
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-fresh-200 rounded-full blur-3xl opacity-40" />

      <div className="w-full max-w-md relative">
        {/* Card */}
        <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.08)] p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <span className="text-5xl block mb-3 animate-float">🛒</span>
            <h1 className="text-3xl font-display text-stone-800">Welcome back!</h1>
            <p className="text-stone-500 font-body mt-1">Sign in to your SuperMart account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit((d) => login(d))} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@email.com"
              icon={<Mail size={16} />}
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              icon={<Lock size={16} />}
              error={errors.password?.message}
              {...register('password')}
            />

            <Button type="submit" loading={isPending} className="mt-2 w-full justify-center">
              Sign In 🚀
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-stone-500 text-sm mt-6 font-body">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-600 font-bold hover:underline">
              Sign up free
            </Link>
          </p>

          {/* Demo hint */}
          <div className="mt-4 p-3 bg-amber-50 rounded-2xl border border-amber-200">
            <p className="text-xs text-amber-700 font-semibold text-center">
              Demo: admin@supermart.local / Admin123!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
