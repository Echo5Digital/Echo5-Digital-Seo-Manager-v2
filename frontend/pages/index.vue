<template>
  <div>
    <NuxtWelcome />
  </div>
</template>

<script setup>
const authStore = useAuthStore()

// Redirect based on auth status
onMounted(() => {
  if (authStore.isAuthenticated) {
    navigateTo('/dashboard')
  } else {
    navigateTo('/login')
  }
})
</script>
