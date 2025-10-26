import './globals.css'
import { GameProvider } from '@/context/GameContext'
import { AuthProvider } from '@/context/AuthContext'
import Navigation from '@/components/Navigation'

export const metadata = {
  title: 'Vilayattu Veedu - Card Game Tracker',
  description: 'Track your card game scores and statistics',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <GameProvider>
            <Navigation />
            {children}
          </GameProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

