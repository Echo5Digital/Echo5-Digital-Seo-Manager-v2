<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Keywords</h1>
      <p class="text-gray-600 mt-1">Manage and track keyword performance</p>
    </div>

    <div class="card text-center py-12">
      <MagnifyingGlassIcon class="w-16 h-16 mx-auto mb-4 text-gray-400" />
      <h2 class="text-2xl font-semibold mb-2">Keyword Management Coming Soon</h2>
      <p class="text-gray-600">Track keyword rankings, research new opportunities, and monitor SEO performance.</p>
    </div>
  </div>
</template>

<script setup>
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'

definePageMeta({
  middleware: ['auth'],
})
</script>
