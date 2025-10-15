<template>
  <aside class="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0">
    <div class="flex flex-col h-full">
      <!-- Logo -->
      <div class="flex items-center justify-center h-16 border-b border-gray-200">
        <h1 class="text-xl font-bold text-blue-600">SEO Manager</h1>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto py-4">
        <NuxtLink
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center px-6 py-3 text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
          active-class="bg-blue-50 text-blue-600 border-r-4 border-blue-600"
        >
          <component :is="item.icon" class="w-5 h-5 mr-3" />
          <span class="font-medium">{{ item.name }}</span>
        </NuxtLink>
      </nav>

      <!-- User Info -->
      <div class="border-t border-gray-200 p-4">
        <div class="flex items-center">
          <div class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
            {{ userInitials }}
          </div>
          <div class="ml-3 flex-1">
            <p class="text-sm font-medium text-gray-900">{{ authStore.user?.name }}</p>
            <p class="text-xs text-gray-500">{{ authStore.user?.role }}</p>
          </div>
          <button @click="handleLogout" class="text-gray-400 hover:text-gray-600">
            <ArrowRightOnRectangleIcon class="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'
import { 
  ChartBarIcon, 
  UsersIcon, 
  MagnifyingGlassIcon, 
  CheckCircleIcon, 
  DocumentTextIcon,
  UserGroupIcon,
  ChartPieIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  DocumentMagnifyingGlassIcon,
  LinkIcon,
  NewspaperIcon
} from '@heroicons/vue/24/outline'

const authStore = useAuthStore()

const menuItems = computed(() => {
  const items = [
    { name: 'Dashboard', path: '/dashboard', icon: ChartBarIcon },
    { name: 'Clients', path: '/clients', icon: UsersIcon },
    { name: 'Keywords', path: '/keywords', icon: MagnifyingGlassIcon },
    { name: 'Tasks', path: '/tasks', icon: CheckCircleIcon },
    { name: 'Audits', path: '/audits', icon: DocumentMagnifyingGlassIcon },
    { name: 'Backlinks', path: '/backlinks', icon: LinkIcon },
    { name: 'Reports', path: '/reports', icon: DocumentTextIcon },
  ]

  if (authStore.isBoss) {
    items.push(
      { name: 'Team', path: '/team', icon: UserGroupIcon },
      { name: 'Analytics', path: '/analytics', icon: ChartPieIcon }
    )
  }

  items.push({ name: 'Settings', path: '/settings', icon: Cog6ToothIcon })

  return items
})

const userInitials = computed(() => {
  const name = authStore.user?.name || ''
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

const handleLogout = () => {
  authStore.logout()
}
</script>
