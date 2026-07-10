import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/supabase-js"

export default async function DashboardPage() {
  // This is a placeholder - in a real app, you would fetch user's documents
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Documents</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          New Document
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder documents */}
        <div className="bg-white rounded-lg shadow p-6 border">
          <h3 className="text-lg font-semibold mb-2">Welcome to House of Edtech Editor</h3>
          <p className="text-gray-600 text-sm mb-4">Your first collaborative document</p>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Last edited 2 hours ago</span>
            <button className="text-blue-600 hover:text-blue-800 text-sm">
              Open
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border opacity-50">
          <h3 className="text-lg font-semibold mb-2">New Document</h3>
          <p className="text-gray-600 text-sm mb-4">Create your first document</p>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Not yet created</span>
            <button className="text-blue-600 hover:text-blue-800 text-sm">
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}