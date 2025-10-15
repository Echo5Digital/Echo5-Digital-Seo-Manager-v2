<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Analytics</h1>
      <p class="text-gray-600 mt-1">Advanced analytics and insights</p>
    </div>

    <div class="card text-center py-12">
      <ChartPieIcon class="w-16 h-16 mx-auto mb-4 text-gray-400" />
      <h2 class="text-2xl font-semibold mb-2">Analytics Coming Soon</h2>
      <p class="text-gray-600">Deep dive into SEO performance metrics and trends.</p>
    </div>
  </div>
</template>

<script setup>
import { ChartPieIcon } from '@heroicons/vue/24/outline'

definePageMeta({
  middleware: ['auth', 'boss'],
})
</script>
