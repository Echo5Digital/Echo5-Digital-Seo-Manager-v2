/**
 * Composable for API calls
 * Provides a convenient wrapper around the API plugin
 */
export const useApi = () => {
  const { $api } = useNuxtApp()
  return $api
}
