import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { Mail, Lock, User, Phone } from 'lucide-react'
import { useRegister } from '@/hooks/useAuth'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

const schema = z.object({
  full_name:     z.string().min(2, 'Name must be at least 2 characters'),
  email:         z.string().email('Enter a valid email'),
  password:      z.string().min(6, 'Password must be at least 6 characters'),
  default_phone: z.string().min(9, 'Enter a valid phone number'),
})

export default function RegisterPage() {
  const { mutate: registerUser, isPending } = useRegister()
  const { register: formRegister, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-fresh-50 via-teal-50 to-emerald-50
                    flex items-center justify-center p-4">
      <div className="absolute top-20 right-10 w-32 h-32 bg-fresh-200 rounded-full blur-3xl opacity-40" />
      <div className="absolute bottom-20 left-10 w-40 h-40 bg-brand-200 rounded-full blur-3xl opacity-40" />

      <div className="w-full max-w-md relative">
        <div className="bg-white rounded-3xl border-2 border-stone-200 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.08)] p-8">

          <div className="text-center mb-8">
            <span className="text-5xl block mb-3 animate-float">🎉</span>
            <h1 className="text-3xl font-display text-stone-800">Join SuperMart!</h1>
            <p className="text-stone-500 font-body mt-1">Create your account in seconds</p>
          </div>

          <form onSubmit={handleSubmit((d) => registerUser(d))} className="flex flex-col gap-4">
            <Input
              label="Full Name"
              placeholder="Maya Cohen"
              icon={<User size={16} />}
              error={errors.full_name?.message}
              {...formRegister('full_name')}
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@email.com"
              icon={<Mail size={16} />}
              error={errors.email?.message}
              {...formRegister('email')}
            />
            <Input
              label="Phone"
              type="tel"
              placeholder="050-1234567"
              icon={<Phone size={16} />}
              error={errors.default_phone?.message}
              {...formRegister('default_phone')}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              icon={<Lock size={16} />}
              error={errors.password?.message}
              {...formRegister('password')}
            />

            <Button type="submit" loading={isPending} className="mt-2 w-full justify-center">
              Create Account 🎊
            </Button>
          </form>

          <p className="text-center text-stone-500 text-sm mt-6 font-body">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 font-bold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
