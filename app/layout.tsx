import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { AuthProvider } from "../components/auth-context"

export const metadata: Metadata = {
  title: "donation-swipe",
  description: "donation-swipe",
  generator: "donation-swipe",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
