import Layout from '../../../components/Layout'
import { useRouter } from 'next/router'

export default function Analytics() {
  const router = useRouter()
  const { id } = router.query
  
  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold">GA4 Analytics Dashboard Coming Soon</h1>
        {id && (
          <p className="text-gray-600 mt-2">Client ID: {id}</p>
        )}
      </div>
    </Layout>
  )
}
