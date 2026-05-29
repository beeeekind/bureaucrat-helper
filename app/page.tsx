'use client'
import dynamic from 'next/dynamic'

const App = dynamic(() => import('./_home'), { ssr: false })

export default App
