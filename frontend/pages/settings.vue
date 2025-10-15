<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Settings</h1>
      <p class="text-gray-600 mt-1">Manage your account and preferences</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card">
        <h2 class="text-xl font-semibold mb-4">Profile Information</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input type="text" :value="authStore.user?.name" class="input" readonly />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" :value="authStore.user?.email" class="input" readonly />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <input type="text" :value="authStore.user?.role" class="input" readonly />
          </div>
        </div>
      </div>

      <div class="card">
        <h2 class="text-xl font-semibold mb-4">Preferences</h2>
        <div class="space-y-4">
          <div>
            <label class="flex items-center gap-2">
              <input type="checkbox" class="rounded" checked />
              <span class="text-sm">Email notifications</span>
            </label>
          </div>
          <div>
            <label class="flex items-center gap-2">
              <input type="checkbox" class="rounded" checked />
              <span class="text-sm">Browser notifications</span>
            </label>
          </div>
          <div>
            <label class="flex items-center gap-2">
              <input type="checkbox" class="rounded" />
              <span class="text-sm">Weekly reports</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-6 card">
      <h2 class="text-xl font-semibold mb-4 text-red-600">Danger Zone</h2>
      <p class="text-gray-600 mb-4">Logout from your account</p>
      <button @click="handleLogout" class="btn bg-red-600 text-white hover:bg-red-700">
        Logout
      </button>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: ['auth'],
})

const authStore = useAuthStore()

const handleLogout = () => {
  authStore.logout()
}
</script>
