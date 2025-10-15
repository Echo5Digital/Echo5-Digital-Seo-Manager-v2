<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth'

// Initialize auth store
const authStore = useAuthStore()

// Check authentication on app mount
onMounted(() => {
  authStore.checkAuth()
})
</script>
