"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { FileText, Users, Settings, LogOut } from "lucide-react"

interface HeaderProps {
  documentTitle?: string
  onNewDocument?: () => void
  onShowUsers?: () => void
}

export function Header({ documentTitle, onNewDocument, onShowUsers }: HeaderProps) {
  const { data: session } = useSession()
  const [isOnline, setIsOnline] = useState(true)

  return (
    <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex h-14 items-center px-4">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-blue-600" />
          <h1 className="text-lg font-semibold">House of Edtech Editor</h1>
        </div>
        
        <div className="flex-1" />
        
        <div className="flex items-center gap-4">
          {/* Online status */}
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-xs text-gray-600">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          
          {/* Document title */}
          {documentTitle && (
            <div className="text-sm text-gray-600">
              {documentTitle}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            {onNewDocument && (
              <Button
                variant="outline"
                size="sm"
                onClick={onNewDocument}
              >
                New
              </Button>
            )}
            
            {onShowUsers && (
              <Button
                variant="outline"
                size="sm"
                onClick={onShowUsers}
              >
                <Users className="h-4 w-4 mr-2" />
                Users
              </Button>
            )}
          </div>
          
          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || ""} />
                  <AvatarFallback>
                    {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuItem className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {session?.user?.name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session?.user?.email}
                  </p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}