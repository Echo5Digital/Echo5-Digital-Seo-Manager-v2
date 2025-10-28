import '../styles/globals.css'
import Head from 'next/head'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="icon" href="/e5.png" />
        <title>Echo5 Digital - SEO Operations</title>
      </Head>
      <Component {...pageProps} />
    </>
  )
}
