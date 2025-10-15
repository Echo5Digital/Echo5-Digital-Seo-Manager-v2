<template>
  <div class="min-h-screen bg-gray-50">
    <Sidebar v-if="isAuthenticated" />
    
    <div :class="isAuthenticated ? 'lg:pl-64' : ''">
      <Navbar v-if="isAuthenticated" />
      
      <main :class="isAuthenticated ? 'py-6 px-4 sm:px-6 lg:px-8 mt-16' : ''">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)
</script>
