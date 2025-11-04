import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import useAuthStore from '../../store/auth'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

export default function GBPCallback() {
  const router = useRouter()
  const { code, error } = router.query
  const { token } = useAuthStore()
  const [status, setStatus] = useState('processing')
  const [message, setMessage] = useState('')
  const [authToken, setAuthToken] = useState(null)

  // Get token from localStorage (shared across windows)
  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      setAuthToken(storedToken)
    }
  }, [])

  useEffect(() => {
    console.log('GBP Callback - code:', code, 'error:', error, 'authToken:', authToken ? 'exists' : 'missing');
    
    if (error) {
      setStatus('error')
      setMessage(`Authentication failed: ${error}`)
      return
    }

    if (code && authToken) {
      console.log('GBP Callback - calling handleCallback');
      handleCallback()
    } else if (code && !authToken) {
      console.log('GBP Callback - code exists but token is missing, waiting for token...');
    }
  }, [code, error, authToken])

  const handleCallback = async () => {
    try {
      console.log('Sending POST to /api/integrations/gbp/callback with code:', code);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/api/integrations/gbp/callback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ code }),
        }
      )

      console.log('Response status:', response.status);
      const result = await response.json()
      console.log('Response result:', result);

      if (result.status === 'success') {
        setStatus('success')
        setMessage('Google Business Profile connected successfully! You can now load locations in the integration settings.')
        
        // If opened in popup, communicate with parent and close
        if (window.opener) {
          // Notify parent window
          window.opener.postMessage({ type: 'GBP_AUTH_SUCCESS' }, window.location.origin);
          // Close popup after brief delay
          setTimeout(() => {
            window.close()
          }, 2000)
        } else {
          // If not in popup, redirect to clients page
          setTimeout(() => {
            window.location.href = '/clients'
          }, 3000)
        }
      } else {
        setStatus('error')
        setMessage(result.message || 'Failed to connect Google Business Profile')
      }
    } catch (err) {
      setStatus('error')
      setMessage(err.message || 'An error occurred during authentication')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        {status === 'processing' && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing...</h2>
            <p className="text-gray-600">Connecting your Google Business Profile</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Success!</h2>
            <p className="text-gray-600">{message}</p>
            <p className="text-sm text-gray-500 mt-4">This window will close automatically...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Failed</h2>
            <p className="text-gray-600">{message}</p>
            <button
              onClick={() => window.close()}
              className="mt-6 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close Window
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
