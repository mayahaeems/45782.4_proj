import { useMutation } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'

export const useLogin = () => {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (res) => {
      const { access_token, user } = res.data
      setAuth(user, access_token)
      toast.success(`Welcome back, ${user.full_name.split(' ')[0]}! 👋`)

      const params = new URLSearchParams(window.location.search)
      const fromQuery = params.get('from')
      const fromState = location.state?.from

      if (user.role === 'admin') {
        navigate(fromQuery || fromState || '/admin')
      } else if (user.role === 'delivery') {
        navigate(fromQuery || fromState || '/delivery')
      } else {
        navigate(fromState || fromQuery || '/')
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Login failed')
    },
  })
}

export const useRegister = () => {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: async (_res, variables) => {
      try {
        const loginRes = await authApi.login({
          email:    variables.email,
          password: variables.password,
        })
        const { access_token, user } = loginRes.data
        setAuth(user, access_token)
        toast.success('Account created! Welcome to SuperMart 🎉')
        const from = location.state?.from || '/'
        navigate(from)
      } catch {
        toast.success('Account created! Please sign in.')
        navigate('/login')
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Registration failed')
    },
  })
}

export const useLogout = () => {
  const { logout } = useAuthStore()
  const { reset } = useCartStore()
  const navigate = useNavigate()

  return () => {
    logout()
    reset()
    navigate('/')
    toast.success('Logged out!')
  }
}