import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/composables/useAuth'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/workout',
      name: 'workout',
      component: () => import('../views/WorkoutView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/workout/history',
      name: 'workout-history',
      component: () => import('../views/WorkoutHistoryView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/progress',
      redirect: '/plans'
    },
    {
      path: '/workout/interface',
      name: 'WorkoutInterface',
      component: () => import('../components/WorkoutInterface.vue'),
      meta: { requiresAuth: true },
      props: route => ({ workout: route.query.workout, duration: route.query.duration })
    },
    
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/AdminView.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
  ],
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  // Pinia store 必须在路由守卫函数内部实例化
  // 以确保 Pinia 实例已在 main.ts 中被 app.use() 安装
  const authStore = useAuthStore()
  
  // 在进行任何路由判断前，先确保认证状态已从 token 初始化
  await authStore.initAuth()
  
  // 处理需要认证的路由
  if (to.meta.requiresAuth) {
    if (authStore.isAuthenticated) {
      // 用户已认证
      // 检查是否需要管理员权限
      if (to.meta.requiresAdmin && !authStore.isAdmin) {
        // 无管理员权限，重定向到首页
        next({ name: 'home' })
      } else {
        // 权限满足，继续导航
        next()
      }
    } else {
      // 用户未认证，重定向到登录页
      next({ name: 'login', query: { redirect: to.fullPath } })
    }
    return
  }
  
  // 处理只允许访客访问的路由（如登录、注册页）
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    // 已登录用户访问访客页，重定向到首页
    next({ name: 'home' })
    return
  }
  
  // 其他所有情况，直接放行
  next()
})

export default router
