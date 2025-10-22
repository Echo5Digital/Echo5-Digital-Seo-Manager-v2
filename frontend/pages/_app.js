import '../styles/globals.css'
import { useEffect } from 'react'
import useAuthStore from '../store/auth'

export default function App({ Component, pageProps }) {
  const initAuth = useAuthStore(state => state.initAuth)

  useEffect(() => {
    initAuth()
  }, [initAuth])

  return <Component {...pageProps} />
}
