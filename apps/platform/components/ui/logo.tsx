import Image from "next/image"
import Link from "next/link"

interface LogoProps {
  size?: "sm" | "md" | "lg"
  showText?: boolean
  href?: string
  className?: string
}

export function Logo({ size = "md", showText = true, href, className = "" }: LogoProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8", 
    lg: "w-12 h-12"
  }

  const textSizes = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-xl"
  }

  const LogoContent = () => (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className="relative">
        <Image 
          src="/logo-main.png" 
          alt="GovernsAI" 
          width={size === "sm" ? 24 : size === "md" ? 32 : 48}
          height={size === "sm" ? 24 : size === "md" ? 32 : 48}
          className="rounded-lg"
        />
        {/* <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" /> */}
      </div>
      {showText && (
        <div>
          <span className={`font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent ${textSizes[size]}`}>
            GovernsAI
          </span>
          <div className="text-xs text-gray-500 -mt-1">AI Governance OS</div>
        </div>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href}>
        <LogoContent />
      </Link>
    )
  }

  return <LogoContent />
} 