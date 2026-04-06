"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"

export default function Navbar() {
  const pathname = usePathname()

  const linkStyle = (path: string) =>
    `relative pb-1 transition-all duration-300 
    ${pathname === path ? "after:w-full" : "after:w-0"}
    after:absolute after:left-0 after:bottom-0
    after:h-[2px] after:bg-black
    after:transition-all after:duration-300
    hover:after:w-full`

  return (
    <nav className="relative flex items-center justify-between p-4 bg-white text-black shadow">

      <Link href="/">
        <Image src="/logo.png" alt="Logo" width={100} height={40} />
      </Link>

      <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
        <h1 className="text-2xl font-bold">
          SISTEM PENCATATAN
        </h1>

        <div className="flex gap-8 mt-2 font-bold text-sm">
          <Link href="/" className={linkStyle("/")}>
            Home
          </Link>

          <Link href="/history-document" className={linkStyle("/history-document")}>
            History
          </Link>
        </div>
      </div>

    </nav>
  )
}