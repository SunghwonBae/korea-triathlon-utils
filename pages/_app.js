// pages/_app.js
import '../public/bucheonTriStyle.css' // public에 있는 경우 경로 확인
import '../styles/globals.css'

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />
}