<template>
  <div v-if="auditProgress.isRunning" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
    <div class="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl transform transition-all duration-300 scale-100">
      <!-- Header -->
      <div class="text-center mb-6">
        <div class="relative w-16 h-16 mx-auto mb-4">
          <div class="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-pulse"></div>
          <div class="relative w-full h-full bg-white rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
            </svg>
          </div>
        </div>
        <h3 class="text-xl font-bold text-gray-900 mb-1">Running SEO Audit</h3>
        <p class="text-gray-500">Analyzing your website's SEO performance...</p>
      </div>

      <!-- Progress Bar -->
      <div class="mb-6">
        <div class="flex justify-between text-sm text-gray-600 mb-2">
          <span class="font-medium">Progress</span>
          <span class="font-bold text-blue-600">{{ Math.round(auditProgress.progress) }}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
          <div 
            class="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-700 ease-out relative transform-gpu"
            :style="{ width: auditProgress.progress + '%' }"
          >
            <!-- Animated shine effect -->
            <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 -skew-x-12 animate-shine"></div>
            <!-- Pulse effect -->
            <div class="absolute right-0 top-0 h-full w-4 bg-white opacity-60 blur-sm animate-pulse"></div>
          </div>
        </div>
      </div>

      <!-- Current Step -->
      <div class="text-center mb-6">
        <div class="flex items-center justify-center text-gray-700 mb-4 bg-gray-50 rounded-lg p-3">
          <div class="w-6 h-6 mr-3 flex items-center justify-center">
            <div class="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
          </div>
          <span class="font-medium text-sm">{{ auditProgress.step }}</span>
        </div>

        <!-- Step Indicators -->
        <div class="flex justify-center space-x-1 mb-4">
          <div 
            v-for="(step, index) in auditProgress.steps" 
            :key="index"
            class="transition-all duration-500 ease-out"
            :class="{
              'w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 scale-110 shadow-lg': index <= getCurrentStepIndex(),
              'w-2 h-2 rounded-full bg-gray-300': index > getCurrentStepIndex()
            }"
          ></div>
        </div>
      </div>

      <!-- Fun Facts -->
      <div class="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border-l-4 border-blue-400">
        <div class="text-sm">
          <div class="flex items-center mb-2">
            <span class="text-xl mr-2">💡</span>
            <span class="font-semibold text-blue-800">SEO Tip</span>
          </div>
          <p class="text-blue-700 leading-relaxed">{{ getCurrentFunFact() }}</p>
        </div>
      </div>

      <!-- Cancel Button (hidden for now, can be enabled if needed) -->
      <!-- 
      <div class="mt-6 text-center">
        <button @click="cancelAudit" class="text-gray-500 hover:text-gray-700 text-sm underline">
          Cancel Audit
        </button>
      </div>
      -->
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
  "Core Web Vitals are now official Google ranking factors.",
  "HTTPS is a confirmed Google ranking signal.",
  "Fresh content can help improve search rankings over time.",
  "Long-tail keywords often have higher conversion rates.",
  "User experience signals are becoming increasingly important for SEO.",
  "Voice search optimization is growing in importance.",
  "Local SEO helps businesses appear in 'near me' searches."
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

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes glow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
  }
  50% {
    box-shadow: 0 0 30px rgba(59, 130, 246, 0.8), 0 0 40px rgba(147, 51, 234, 0.6);
  }
}

.animate-shine {
  animation: shine 2s infinite;
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}

.animate-glow {
  animation: glow 2s ease-in-out infinite;
}

/* Custom backdrop blur for better browser support */
.backdrop-blur-sm {
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

/* Smooth transitions for all elements */
* {
  transition: all 0.3s ease;
}

/* Progress bar gradient animation */
.progress-bar {
  background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899);
  background-size: 200% 100%;
  animation: gradient 3s ease infinite;
}

@keyframes gradient {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
</style>