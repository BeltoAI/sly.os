import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://slyos.world'),
  title: 'SlyOS - Democratize AI Deployment',
  description: 'Decentralized AI inference powered by idle smartphones. 70% lower cost, proof-verified outputs, edge-first latency. Skip the cloud tax.',
  keywords: 'AI inference, decentralized AI, edge computing, GPU alternative, AI deployment, machine learning, affordable AI',
  authors: [{ name: 'SlyOS' }],
  openGraph: {
    title: 'SlyOS - AI Deployment Without the Giant\'s Blessing',
    description: 'Break free from cloud monopolies. Decentralized AI inference that costs 70% less with proof-verified outputs.',
    url: 'https://slyos.world',
    siteName: 'SlyOS',
    images: [
      {
        url: '/SlyOS_Flame.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SlyOS - Democratize AI Deployment',
    description: 'Decentralized AI inference. 70% lower cost. Proof-verified. Edge-first.',
    images: ['/SlyOS_Flame.png'],
  },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/SlyOS_Flame.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
