<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Tasks</h1>
      <p class="text-gray-600 mt-1">Manage and track SEO tasks</p>
    </div>

    <div class="card text-center py-12">
      <div class="text-6xl mb-4">✓</div>
      <h2 class="text-2xl font-semibold mb-2">Task Management Coming Soon</h2>
      <p class="text-gray-600">Create, assign, and track SEO tasks across your team.</p>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: ['auth'],
})
</script>
