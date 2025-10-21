<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p class="text-gray-600">Loading audit details...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="text-red-500 text-6xl mb-4">⚠️</div>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Error Loading Audit</h2>
        <p class="text-gray-600 mb-4">{{ error }}</p>
        <button @click="$router.go(-1)" class="btn btn-primary">Go Back</button>
      </div>
    </div>

    <!-- Audit Details -->
    <div v-else-if="audit" class="max-w-7xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">SEO Audit Report</h1>
            <p class="text-gray-600 mt-1">{{ getClientName(audit.clientId) }} • {{ formatDate(audit.createdAt) }}</p>
          </div>
          <div class="flex items-center space-x-4">
            <div class="text-right">
              <div class="text-2xl font-bold" :class="getScoreColorClass(audit.summary?.overallScore)">
                {{ audit.summary?.overallScore || 0 }}/100
              </div>
              <div class="text-sm text-gray-500">Overall Score</div>
            </div>
            <button @click="$router.go(-1)" class="btn btn-secondary">
              <ArrowLeftIcon class="w-5 h-5 mr-2" />
              Back to Audits
            </button>
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div class="bg-red-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-red-600">{{ audit.summary?.criticalCount || 0 }}</div>
            <div class="text-sm text-red-700">Critical Issues</div>
          </div>
          <div class="bg-orange-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-orange-600">{{ audit.summary?.highCount || 0 }}</div>
            <div class="text-sm text-orange-700">High Priority</div>
          </div>
          <div class="bg-yellow-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-yellow-600">{{ audit.summary?.mediumCount || 0 }}</div>
            <div class="text-sm text-yellow-700">Medium Priority</div>
          </div>
          <div class="bg-blue-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-blue-600">{{ audit.summary?.lowCount || 0 }}</div>
            <div class="text-sm text-blue-700">Low Priority</div>
          </div>
          <div class="bg-gray-50 p-4 rounded-lg text-center">
            <div class="text-2xl font-bold text-gray-600">{{ audit.summary?.totalIssues || 0 }}</div>
            <div class="text-sm text-gray-700">Total Issues</div>
          </div>
        </div>
      </div>

      <!-- AI Analysis Section -->
      <div v-if="audit.aiAnalysis" class="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg shadow-sm p-6 mb-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-4 flex items-center">
          <SparklesIcon class="w-6 h-6 mr-2 text-purple-600" />
          AI Analysis & Recommendations
        </h2>
        
        <div class="grid md:grid-cols-2 gap-6">
          <div>
            <h3 class="font-semibold text-gray-900 mb-3">Executive Summary</h3>
            <p class="text-gray-700 mb-4">{{ audit.aiAnalysis.executiveSummary }}</p>
            
            <h3 class="font-semibold text-gray-900 mb-3">Top Priorities</h3>
            <ul class="space-y-2">
              <li v-for="priority in audit.aiAnalysis.topPriorities" :key="priority" 
                  class="flex items-start">
                <span class="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span class="text-gray-700">{{ priority }}</span>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 class="font-semibold text-gray-900 mb-3">Quick Wins</h3>
            <ul class="space-y-2 mb-4">
              <li v-for="win in audit.aiAnalysis.quickWins" :key="win"
                  class="flex items-start">
                <span class="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span class="text-gray-700">{{ win }}</span>
              </li>
            </ul>
            
            <div class="bg-white rounded-lg p-4">
              <h4 class="font-medium text-gray-900 mb-2">Estimated Impact</h4>
              <p class="text-gray-600">{{ audit.aiAnalysis.estimatedImpact }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs Navigation -->
      <div class="bg-white rounded-lg shadow-sm overflow-hidden">
        <div class="border-b border-gray-200">
          <nav class="flex space-x-8 px-6">
            <button 
              v-for="tab in tabs" 
              :key="tab.id"
              @click="activeTab = tab.id"
              class="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
              :class="{
                'border-blue-500 text-blue-600': activeTab === tab.id,
                'border-transparent text-gray-500 hover:text-gray-700': activeTab !== tab.id
              }"
            >
              <component :is="tab.icon" class="w-5 h-5 inline mr-2" />
              {{ tab.name }}
              <span v-if="tab.count > 0" class="ml-2 bg-red-100 text-red-800 py-1 px-2 rounded-full text-xs">
                {{ tab.count }}
              </span>
            </button>
          </nav>
        </div>

        <!-- Tab Content -->
        <div class="p-6">
          <!-- Overview Tab -->
          <div v-if="activeTab === 'overview'" class="space-y-6">
            <h3 class="text-xl font-semibold text-gray-900">Website Overview & Page Details</h3>
            
            <!-- Site Summary -->
            <div class="grid md:grid-cols-3 gap-6 mb-8">
              <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg">
                <h4 class="font-semibold text-blue-900 mb-2">Pages Analyzed</h4>
                <p class="text-3xl font-bold text-blue-800">{{ audit.summary?.totalPages || 0 }}</p>
                <p class="text-sm text-blue-600 mt-1">{{ audit.summary?.pagesAnalyzed || 0 }} successfully crawled</p>
              </div>
              <div class="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg">
                <h4 class="font-semibold text-green-900 mb-2">Average Word Count</h4>
                <p class="text-3xl font-bold text-green-800">{{ Math.round(audit.summary?.averageWordCount || 0) }}</p>
                <p class="text-sm text-green-600 mt-1">words per page</p>
              </div>
              <div class="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg">
                <h4 class="font-semibold text-purple-900 mb-2">Images Found</h4>
                <p class="text-3xl font-bold text-purple-800">{{ audit.summary?.totalImages || 0 }}</p>
                <p class="text-sm text-purple-600 mt-1">{{ audit.summary?.imagesWithoutAlt || 0 }} missing alt text</p>
              </div>
            </div>

            <!-- Detailed Page List -->
            <div v-if="audit.results?.pages?.length > 0" class="bg-white border rounded-lg overflow-hidden">
              <div class="px-6 py-4 border-b bg-gray-50">
                <h4 class="font-semibold text-gray-900">All Pages Analyzed</h4>
              </div>
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meta Description</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">H1s</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Word Count</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Images</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Links</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <tr v-for="page in audit.results.pages" :key="page.url" class="hover:bg-gray-50">
                      <td class="px-6 py-4">
                        <a :href="page.url" target="_blank" class="text-blue-600 hover:underline font-medium text-sm">
                          {{ truncateUrl(page.url, 40) }}
                        </a>
                      </td>
                      <td class="px-6 py-4">
                        <div class="text-sm">
                          <span v-if="page.title" class="text-gray-900">{{ truncateText(page.title, 50) }}</span>
                          <span v-else class="text-red-500 font-medium">Missing Title</span>
                          <div v-if="page.title" class="text-xs text-gray-500 mt-1">{{ page.title.length }} chars</div>
                        </div>
                      </td>
                      <td class="px-6 py-4">
                        <div class="text-sm">
                          <span v-if="page.metaDescription" class="text-gray-900">{{ truncateText(page.metaDescription, 50) }}</span>
                          <span v-else class="text-red-500 font-medium">Missing Description</span>
                          <div v-if="page.metaDescription" class="text-xs text-gray-500 mt-1">{{ page.metaDescription.length }} chars</div>
                        </div>
                      </td>
                      <td class="px-6 py-4 text-sm">
                        <div v-if="page.h1?.length > 0">
                          <span class="text-gray-900 font-medium">{{ page.h1.length }}</span>
                          <div class="text-xs text-gray-500">{{ truncateText(page.h1[0], 30) }}</div>
                        </div>
                        <span v-else class="text-red-500 font-medium">No H1</span>
                      </td>
                      <td class="px-6 py-4 text-sm text-gray-900">
                        {{ page.wordCount?.toLocaleString() || 'N/A' }}
                      </td>
                      <td class="px-6 py-4 text-sm">
                        <div v-if="page.images?.length > 0">
                          <span class="text-gray-900">{{ page.images.length }}</span>
                          <div class="text-xs text-gray-500">
                            {{ page.images.filter(img => !img.alt).length }} missing alt
                          </div>
                        </div>
                        <span v-else class="text-gray-500">0</span>
                      </td>
                      <td class="px-6 py-4 text-sm">
                        <div class="text-gray-900">
                          <div>{{ page.internalLinks || 0 }} internal</div>
                          <div class="text-xs text-gray-500">{{ page.externalLinks || 0 }} external</div>
                        </div>
                      </td>
                      <td class="px-6 py-4">
                        <span v-if="page.error" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Error
                        </span>
                        <span v-else-if="page.statusCode === 200" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {{ page.statusCode }}
                        </span>
                        <span v-else class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {{ page.statusCode }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- SEO Issues Summary -->
            <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div class="bg-red-50 border border-red-200 p-4 rounded-lg">
                <h5 class="font-medium text-red-900 mb-2">Missing Titles</h5>
                <p class="text-2xl font-bold text-red-700">{{ audit.summary?.pagesWithMissingTitle || 0 }}</p>
                <p class="text-sm text-red-600">pages without title tags</p>
              </div>
              <div class="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                <h5 class="font-medium text-orange-900 mb-2">Missing Descriptions</h5>
                <p class="text-2xl font-bold text-orange-700">{{ audit.summary?.pagesWithMissingDescription || 0 }}</p>
                <p class="text-sm text-orange-600">pages without meta descriptions</p>
              </div>
              <div class="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <h5 class="font-medium text-yellow-900 mb-2">Missing H1s</h5>
                <p class="text-2xl font-bold text-yellow-700">{{ audit.summary?.pagesWithMissingH1 || 0 }}</p>
                <p class="text-sm text-yellow-600">pages without H1 tags</p>
              </div>
              <div class="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                <h5 class="font-medium text-purple-900 mb-2">Images w/o Alt</h5>
                <p class="text-2xl font-bold text-purple-700">{{ audit.summary?.imagesWithoutAlt || 0 }}</p>
                <p class="text-sm text-purple-600">images missing alt text</p>
              </div>
            </div>
          </div>

          <!-- Page Analysis Tab -->
          <div v-if="activeTab === 'pages'" class="space-y-6">
            <h3 class="text-xl font-semibold text-gray-900">Page-by-Page Analysis</h3>
            
            <!-- Meta Issues -->
            <div v-if="audit.results?.metaIssues?.length > 0" class="bg-white border rounded-lg">
              <div class="px-6 py-4 border-b bg-gray-50">
                <h4 class="font-semibold text-gray-900 flex items-center">
                  <DocumentTextIcon class="w-5 h-5 mr-2" />
                  Meta Tags Analysis ({{ audit.results.metaIssues.length }} issues)
                </h4>
              </div>
              <div class="divide-y">
                <div v-for="issue in audit.results.metaIssues" :key="issue.url + issue.type" 
                     class="p-6 hover:bg-gray-50">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center mb-2">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                              :class="getSeverityClass(issue.severity)">
                          {{ issue.severity }}
                        </span>
                        <span class="ml-3 text-sm font-medium text-gray-900">{{ issue.type }}</span>
                      </div>
                      <p class="text-gray-600 mb-2">{{ issue.issue }}</p>
                      <a :href="issue.url" target="_blank" 
                         class="text-blue-600 hover:underline text-sm flex items-center">
                        <LinkIcon class="w-4 h-4 mr-1" />
                        {{ truncateUrl(issue.url) }}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Page Speed Analysis -->
            <div v-if="audit.results?.pageSpeed?.length > 0" class="bg-white border rounded-lg">
              <div class="px-6 py-4 border-b bg-gray-50">
                <h4 class="font-semibold text-gray-900 flex items-center">
                  <BoltIcon class="w-5 h-5 mr-2" />
                  Page Speed Analysis ({{ audit.results.pageSpeed.length }} pages)
                </h4>
              </div>
              <div class="divide-y">
                <div v-for="speed in audit.results.pageSpeed" :key="speed.url" 
                     class="p-6 hover:bg-gray-50">
                  <div class="flex items-start justify-between mb-4">
                    <div class="flex-1">
                      <a :href="speed.url" target="_blank" 
                         class="text-blue-600 hover:underline font-medium flex items-center mb-2">
                        <LinkIcon class="w-4 h-4 mr-1" />
                        {{ truncateUrl(speed.url) }}
                      </a>
                      <div class="flex items-center space-x-4 text-sm">
                        <span class="text-gray-600">Load Time: {{ speed.loadTime }}s</span>
                        <span class="text-gray-600">Mobile Score: {{ speed.mobileScore || 'N/A' }}</span>
                        <span class="text-gray-600">Desktop Score: {{ speed.desktopScore || 'N/A' }}</span>
                      </div>
                    </div>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          :class="getSeverityClass(speed.severity)">
                      {{ speed.severity }}
                    </span>
                  </div>
                  <div v-if="speed.recommendations?.length > 0">
                    <h5 class="font-medium text-gray-900 mb-2">Recommendations:</h5>
                    <ul class="space-y-1">
                      <li v-for="rec in speed.recommendations" :key="rec"
                          class="text-gray-600 text-sm flex items-start">
                        <span class="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        {{ rec }}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Technical Issues Tab -->
          <div v-if="activeTab === 'technical'" class="space-y-6">
            <h3 class="text-xl font-semibold text-gray-900">Technical SEO Issues</h3>
            
            <!-- Broken Links -->
            <div v-if="audit.results?.brokenLinks?.length > 0" class="bg-white border rounded-lg">
              <div class="px-6 py-4 border-b bg-gray-50">
                <h4 class="font-semibold text-gray-900 flex items-center">
                  <ExclamationTriangleIcon class="w-5 h-5 mr-2 text-red-500" />
                  Broken Links ({{ audit.results.brokenLinks.length }})
                </h4>
              </div>
              <div class="divide-y">
                <div v-for="link in audit.results.brokenLinks" :key="link.url" 
                     class="p-6 hover:bg-gray-50">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center mb-2">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                              :class="getSeverityClass(link.severity)">
                          {{ link.severity }}
                        </span>
                        <span class="ml-3 text-sm text-gray-600">Status: {{ link.statusCode }}</span>
                      </div>
                      <p class="text-gray-900 font-medium mb-2">{{ link.url }}</p>
                      <div v-if="link.foundOn?.length > 0">
                        <p class="text-sm text-gray-600 mb-1">Found on:</p>
                        <ul class="space-y-1">
                          <li v-for="page in link.foundOn" :key="page"
                              class="text-sm text-blue-600 hover:underline">
                            <a :href="page" target="_blank">{{ truncateUrl(page) }}</a>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Missing Alt Tags -->
            <div v-if="audit.results?.missingAltTags?.length > 0" class="bg-white border rounded-lg">
              <div class="px-6 py-4 border-b bg-gray-50">
                <h4 class="font-semibold text-gray-900 flex items-center">
                  <PhotoIcon class="w-5 h-5 mr-2 text-yellow-500" />
                  Missing Alt Tags ({{ audit.results.missingAltTags.length }})
                </h4>
              </div>
              <div class="divide-y">
                <div v-for="alt in audit.results.missingAltTags" :key="alt.imageUrl + alt.pageUrl" 
                     class="p-6 hover:bg-gray-50">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-2"
                            :class="getSeverityClass(alt.severity)">
                        {{ alt.severity }}
                      </span>
                      <p class="text-gray-900 font-medium mb-1">{{ alt.imageUrl }}</p>
                      <a :href="alt.pageUrl" target="_blank" 
                         class="text-blue-600 hover:underline text-sm flex items-center">
                        <LinkIcon class="w-4 h-4 mr-1" />
                        Found on: {{ truncateUrl(alt.pageUrl) }}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- SSL Issues -->
            <div v-if="audit.results?.sslIssues?.length > 0" class="bg-white border rounded-lg">
              <div class="px-6 py-4 border-b bg-gray-50">
                <h4 class="font-semibold text-gray-900 flex items-center">
                  <ShieldExclamationIcon class="w-5 h-5 mr-2 text-red-500" />
                  SSL/HTTPS Issues ({{ audit.results.sslIssues.length }})
                </h4>
              </div>
              <div class="divide-y">
                <div v-for="ssl in audit.results.sslIssues" :key="ssl.url + ssl.issue" 
                     class="p-6 hover:bg-gray-50">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-2"
                            :class="getSeverityClass(ssl.severity)">
                        {{ ssl.severity }}
                      </span>
                      <p class="text-gray-900 font-medium mb-1">{{ ssl.issue }}</p>
                      <a :href="ssl.url" target="_blank" 
                         class="text-blue-600 hover:underline text-sm flex items-center">
                        <LinkIcon class="w-4 h-4 mr-1" />
                        {{ truncateUrl(ssl.url) }}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Mobile & Performance Tab -->
          <div v-if="activeTab === 'mobile'" class="space-y-6">
            <h3 class="text-xl font-semibold text-gray-900">Mobile & Performance</h3>
            
            <!-- Mobile Issues -->
            <div v-if="audit.results?.mobileIssues?.length > 0" class="bg-white border rounded-lg">
              <div class="px-6 py-4 border-b bg-gray-50">
                <h4 class="font-semibold text-gray-900 flex items-center">
                  <DevicePhoneMobileIcon class="w-5 h-5 mr-2 text-blue-500" />
                  Mobile Usability ({{ audit.results.mobileIssues.length }} issues)
                </h4>
              </div>
              <div class="divide-y">
                <div v-for="mobile in audit.results.mobileIssues" :key="mobile.url + mobile.issue" 
                     class="p-6 hover:bg-gray-50">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-2"
                            :class="getSeverityClass(mobile.severity)">
                        {{ mobile.severity }}
                      </span>
                      <p class="text-gray-900 font-medium mb-1">{{ mobile.issue }}</p>
                      <a :href="mobile.url" target="_blank" 
                         class="text-blue-600 hover:underline text-sm flex items-center">
                        <LinkIcon class="w-4 h-4 mr-1" />
                        {{ truncateUrl(mobile.url) }}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Schema & Structure Tab -->
          <div v-if="activeTab === 'schema'" class="space-y-6">
            <h3 class="text-xl font-semibold text-gray-900">Schema & Site Structure</h3>
            
            <!-- Schema Issues -->
            <div v-if="audit.results?.schemaIssues?.length > 0" class="bg-white border rounded-lg">
              <div class="px-6 py-4 border-b bg-gray-50">
                <h4 class="font-semibold text-gray-900 flex items-center">
                  <CodeBracketIcon class="w-5 h-5 mr-2 text-purple-500" />
                  Schema Markup ({{ audit.results.schemaIssues.length }} issues)
                </h4>
              </div>
              <div class="divide-y">
                <div v-for="schema in audit.results.schemaIssues" :key="schema.url + schema.issue" 
                     class="p-6 hover:bg-gray-50">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center mb-2">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                              :class="getSeverityClass(schema.severity)">
                          {{ schema.severity }}
                        </span>
                        <span class="ml-3 text-sm text-gray-600">Type: {{ schema.type }}</span>
                      </div>
                      <p class="text-gray-900 font-medium mb-1">{{ schema.issue }}</p>
                      <a :href="schema.url" target="_blank" 
                         class="text-blue-600 hover:underline text-sm flex items-center">
                        <LinkIcon class="w-4 h-4 mr-1" />
                        {{ truncateUrl(schema.url) }}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Sitemap Issues -->
            <div v-if="audit.results?.sitemapIssues?.length > 0" class="bg-white border rounded-lg">
              <div class="px-6 py-4 border-b bg-gray-50">
                <h4 class="font-semibold text-gray-900 flex items-center">
                  <MapIcon class="w-5 h-5 mr-2 text-green-500" />
                  Sitemap Issues ({{ audit.results.sitemapIssues.length }})
                </h4>
              </div>
              <div class="divide-y">
                <div v-for="sitemap in audit.results.sitemapIssues" :key="sitemap.issue" 
                     class="p-6 hover:bg-gray-50">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-2"
                            :class="getSeverityClass(sitemap.severity)">
                        {{ sitemap.severity }}
                      </span>
                      <p class="text-gray-900 font-medium mb-1">{{ sitemap.issue }}</p>
                      <p class="text-gray-600 text-sm">{{ sitemap.details }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Robots.txt Issues -->
            <div v-if="audit.results?.robotsTxtIssues?.length > 0" class="bg-white border rounded-lg">
              <div class="px-6 py-4 border-b bg-gray-50">
                <h4 class="font-semibold text-gray-900 flex items-center">
                  <CogIcon class="w-5 h-5 mr-2 text-gray-500" />
                  Robots.txt Issues ({{ audit.results.robotsTxtIssues.length }})
                </h4>
              </div>
              <div class="divide-y">
                <div v-for="robot in audit.results.robotsTxtIssues" :key="robot.issue" 
                     class="p-6 hover:bg-gray-50">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-2"
                            :class="getSeverityClass(robot.severity)">
                        {{ robot.severity }}
                      </span>
                      <p class="text-gray-900 font-medium">{{ robot.issue }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Long-term Actions Tab -->
          <div v-if="activeTab === 'actions'" class="space-y-6">
            <h3 class="text-xl font-semibold text-gray-900">Recommended Actions</h3>
            
            <div v-if="audit.aiAnalysis?.longTermActions?.length > 0" class="bg-white border rounded-lg p-6">
              <h4 class="font-semibold text-gray-900 mb-4">Long-term SEO Strategy</h4>
              <ul class="space-y-3">
                <li v-for="(action, index) in audit.aiAnalysis.longTermActions" :key="action"
                    class="flex items-start">
                  <span class="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                    {{ index + 1 }}
                  </span>
                  <span class="text-gray-700">{{ action }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { 
  ArrowLeftIcon,
  SparklesIcon,
  DocumentTextIcon,
  BoltIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  ShieldExclamationIcon,
  DevicePhoneMobileIcon,
  CodeBracketIcon,
  MapIcon,
  CogIcon,
  LinkIcon
} from '@heroicons/vue/24/outline'
import { useAuditStore } from '~/stores/audits'
import { useClientStore } from '~/stores/clients'
import { format } from 'date-fns'

definePageMeta({
  middleware: ['auth'],
})

const route = useRoute()
const auditStore = useAuditStore()
const clientStore = useClientStore()

const loading = ref(true)
const error = ref(null)
const audit = ref(null)
const activeTab = ref('overview')

const tabs = computed(() => [
  {
    id: 'overview',
    name: 'Overview',
    icon: DocumentTextIcon,
    count: audit.value?.results?.pages?.length || 0
  },
  {
    id: 'pages',
    name: 'Page Analysis',
    icon: DocumentTextIcon,
    count: (audit.value?.results?.metaIssues?.length || 0) + (audit.value?.results?.pageSpeed?.length || 0)
  },
  {
    id: 'technical',
    name: 'Technical Issues',
    icon: ExclamationTriangleIcon,
    count: (audit.value?.results?.brokenLinks?.length || 0) + (audit.value?.results?.missingAltTags?.length || 0) + (audit.value?.results?.sslIssues?.length || 0)
  },
  {
    id: 'mobile',
    name: 'Mobile & Performance',
    icon: DevicePhoneMobileIcon,
    count: audit.value?.results?.mobileIssues?.length || 0
  },
  {
    id: 'schema',
    name: 'Schema & Structure',
    icon: CodeBracketIcon,
    count: (audit.value?.results?.schemaIssues?.length || 0) + (audit.value?.results?.sitemapIssues?.length || 0) + (audit.value?.results?.robotsTxtIssues?.length || 0)
  },
  {
    id: 'actions',
    name: 'Action Plan',
    icon: SparklesIcon,
    count: audit.value?.aiAnalysis?.longTermActions?.length || 0
  }
])

const clients = computed(() => clientStore.clients || [])

const getClientName = (clientData) => {
  if (!clientData) return 'Unknown Client'
  if (typeof clientData === 'object' && clientData.name) return clientData.name
  if (typeof clientData === 'string') {
    const client = clients.value.find(c => c._id === clientData)
    return client?.name || 'Unknown Client'
  }
  return 'Unknown Client'
}

const formatDate = (date) => {
  if (!date) return 'N/A'
  try {
    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) return 'Invalid Date'
    return format(dateObj, 'MMM dd, yyyy HH:mm')
  } catch (error) {
    return 'Invalid Date'
  }
}

const getScoreColorClass = (score) => {
  if (!score) return 'text-gray-400'
  if (score >= 90) return 'text-green-600'
  if (score >= 70) return 'text-yellow-600'
  if (score >= 50) return 'text-orange-600'
  return 'text-red-600'
}

const getSeverityClass = (severity) => {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return 'bg-red-100 text-red-800'
    case 'high':
      return 'bg-orange-100 text-orange-800'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800'
    case 'low':
      return 'bg-blue-100 text-blue-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const truncateUrl = (url, maxLength = 60) => {
  if (!url || typeof url !== 'string') return 'N/A'
  if (url.length <= maxLength) return url
  return url.substring(0, maxLength - 3) + '...'
}

const truncateText = (text, maxLength = 50) => {
  if (!text || typeof text !== 'string') return 'N/A'
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

onMounted(async () => {
  try {
    const auditId = route.params.id
    if (!auditId) {
      error.value = 'Audit ID is required'
      return
    }

    await Promise.all([
      clientStore.fetchClients(),
      loadAuditDetails(auditId)
    ])
  } catch (err) {
    console.error('Error loading audit details:', err)
    error.value = 'Failed to load audit details'
  } finally {
    loading.value = false
  }
})

const loadAuditDetails = async (auditId) => {
  try {
    audit.value = await auditStore.getAuditDetails(auditId)
  } catch (err) {
    console.error('Error loading audit:', err)
    throw new Error('Failed to load audit details')
  }
}
</script>

<style scoped>
.btn {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
  transition: all 0.15s ease-in-out;
  outline: none;
  border: none;
  cursor: pointer;
}

.btn:focus {
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}

.btn-primary {
  background-color: #2563eb;
  color: white;
}

.btn-primary:hover {
  background-color: #1d4ed8;
}

.btn-secondary {
  background-color: #4b5563;
  color: white;
}

.btn-secondary:hover {
  background-color: #374151;
}
</style>