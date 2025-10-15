<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Reports</h1>
      <p class="text-gray-600 mt-1">Generate and view SEO reports</p>
    </div>

    <div class="card text-center py-12">
      <DocumentTextIcon class="w-16 h-16 mx-auto mb-4 text-gray-400" />
      <h2 class="text-2xl font-semibold mb-2">Reporting Coming Soon</h2>
      <p class="text-gray-600">Generate comprehensive SEO reports for your clients.</p>
    </div>
  </div>
</template>

<script setup>
import { DocumentTextIcon } from '@heroicons/vue/24/outline'

definePageMeta({
  middleware: ['auth'],
})
</script>
