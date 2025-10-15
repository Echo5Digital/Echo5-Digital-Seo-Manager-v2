<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Team Management</h1>
      <p class="text-gray-600 mt-1">Manage team members and permissions</p>
    </div>

    <div class="card text-center py-12">
      <UserGroupIcon class="w-16 h-16 mx-auto mb-4 text-gray-400" />
      <h2 class="text-2xl font-semibold mb-2">Team Management Coming Soon</h2>
      <p class="text-gray-600">Add team members, assign roles, and manage permissions.</p>
    </div>
  </div>
</template>

<script setup>
import { UserGroupIcon } from '@heroicons/vue/24/outline'

definePageMeta({
  middleware: ['auth', 'boss'],
})
</script>
