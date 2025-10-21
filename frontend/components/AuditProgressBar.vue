<template>
  <div v-if="auditProgress.isRunning" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
      <!-- Header -->
      <div class="text-center mb-6">
        <div class="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
          <svg class="w-8 h-8 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a7.646 7.646 0 110 15.292V12"></path>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-gray-900">Running SEO Audit</h3>
        <p class="text-gray-500 mt-1">Please wait while we analyze your website...</p>
      </div>

      <!-- Progress Bar -->
      <div class="mb-6">
        <div class="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{{ Math.round(auditProgress.progress) }}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            class="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500 ease-out relative"
            :style="{ width: auditProgress.progress + '%' }"
          >
            <!-- Animated shine effect -->
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 -skew-x-12 animate-shine"></div>
          </div>
        </div>
      </div>

      <!-- Current Step -->
      <div class="text-center">
        <div class="flex items-center justify-center text-gray-700 mb-4">
          <svg class="w-5 h-5 mr-2 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
          </svg>
          <span class="font-medium">{{ auditProgress.step }}</span>
        </div>

        <!-- Step Indicators -->
        <div class="flex justify-center space-x-2">
          <div 
            v-for="(step, index) in auditProgress.steps" 
            :key="index"
            class="w-2 h-2 rounded-full transition-all duration-300"
            :class="{
              'bg-blue-600 scale-125': index <= getCurrentStepIndex(),
              'bg-gray-300': index > getCurrentStepIndex()
            }"
          ></div>
        </div>
      </div>

      <!-- Fun Facts -->
      <div class="mt-6 p-4 bg-blue-50 rounded-lg">
        <div class="text-sm text-blue-800">
          <span class="font-medium">💡 Did you know?</span>
          <p class="mt-1">{{ getCurrentFunFact() }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAuditStore } from '~/stores/audits'

const auditStore = useAuditStore()
const auditProgress = computed(() => auditStore.auditProgress)

const funFacts = [
  "75% of users never scroll past the first page of search results.",
  "Page loading speed affects both user experience and SEO rankings.",
  "Mobile-first indexing means Google primarily uses mobile content for ranking.",
  "Quality backlinks are still one of the top ranking factors.",
  "Alt text for images helps both accessibility and SEO.",
  "Internal linking helps search engines understand your site structure.",
  "Meta descriptions don't directly affect rankings but improve click-through rates.",
  "Schema markup can enhance your search result appearance.",
  "Core Web Vitals are now official Google ranking factors."
]

const getCurrentStepIndex = () => {
  return Math.floor((auditProgress.value.progress / 100) * auditProgress.value.steps.length) - 1
}

const getCurrentFunFact = () => {
  const index = Math.floor((auditProgress.value.progress / 100) * funFacts.length)
  return funFacts[Math.min(index, funFacts.length - 1)]
}
</script>

<style scoped>
@keyframes shine {
  0% {
    transform: translateX(-100%) skewX(-12deg);
  }
  100% {
    transform: translateX(300%) skewX(-12deg);
  }
}

.animate-shine {
  animation: shine 2s infinite;
}
</style>