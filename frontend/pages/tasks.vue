<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Tasks</h1>
      <p class="text-gray-600 mt-1">Manage and track SEO tasks</p>
    </div>

    <div class="card text-center py-12">
      <CheckCircleIcon class="w-16 h-16 mx-auto mb-4 text-gray-400" />
      <h2 class="text-2xl font-semibold mb-2">Task Management Coming Soon</h2>
      <p class="text-gray-600">Create, assign, and track SEO tasks across your team.</p>
    </div>
  </div>
</template>

<script setup>
import { CheckCircleIcon } from '@heroicons/vue/24/outline'

definePageMeta({
  middleware: ['auth'],
})
</script>
