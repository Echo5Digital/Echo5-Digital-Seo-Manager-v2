<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Analytics</h1>
      <p class="text-gray-600 mt-1">Advanced analytics and insights</p>
    </div>

    <div class="card text-center py-12">
      <div class="text-6xl mb-4">📊</div>
      <h2 class="text-2xl font-semibold mb-2">Analytics Coming Soon</h2>
      <p class="text-gray-600">Deep dive into SEO performance metrics and trends.</p>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: ['auth', 'boss'],
})
</script>
