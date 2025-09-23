"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MessageCircle, UserPlus, MapPin, Building } from "lucide-react"

interface ProfessionalCardProps {
  professional: {
    id: number
    name: string
    role: string
    company: string
    location?: string
    avatar: string
    skills: string[]
    isOnline: boolean
    mutualConnections: number
    bio?: string
    isConnected?: boolean
  }
  onConnect?: (id: number) => void
  onMessage?: (id: number) => void
}

export function ProfessionalCard({ professional, onConnect, onMessage }: ProfessionalCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <div className="relative">
            <Avatar className="h-16 w-16">
              <AvatarImage src={professional.avatar || "/placeholder.svg"} alt={professional.name} />
              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold text-lg">
                {professional.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            {professional.isOnline && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-semibold text-lg text-gray-900 truncate">{professional.name}</h3>
              {professional.isOnline && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                  Online
                </Badge>
              )}
            </div>

            <p className="text-gray-600 font-medium mb-1">{professional.role}</p>

            <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
              <div className="flex items-center space-x-1">
                <Building className="w-4 h-4" />
                <span>{professional.company}</span>
              </div>
              {professional.location && (
                <div className="flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span>{professional.location}</span>
                </div>
              )}
            </div>

            {professional.bio && <p className="text-sm text-gray-600 mb-3 line-clamp-2">{professional.bio}</p>}

            <div className="flex flex-wrap gap-1 mb-4">
              {professional.skills.slice(0, 3).map((skill, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {professional.skills.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{professional.skills.length - 3} more
                </Badge>
              )}
            </div>

            {professional.mutualConnections > 0 && (
              <p className="text-xs text-blue-600 mb-4">{professional.mutualConnections} mutual connections</p>
            )}

            <div className="flex space-x-2">
              {professional.isConnected ? (
                <Button size="sm" variant="outline" onClick={() => onMessage?.(professional.id)} className="flex-1">
                  <MessageCircle className="w-4 h-4 mr-1" />
                  Message
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => onConnect?.(professional.id)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Connect
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
