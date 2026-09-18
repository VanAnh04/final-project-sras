import { Search, Bell, HelpCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Header() {
  const { user } = useAuth();

  return (
    <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20">
      {/* Title */}
      <div className="flex items-center gap-8">
        <h2 className="text-xl font-bold text-gray-900">SRAS Admin</h2>
      </div>

      {/* Search Input Pill */}
      <div className="flex-1 max-w-xl mx-8">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Tìm kiếm người dùng..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50/80 border border-gray-200/80 rounded-full text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all"
          />
        </div>
      </div>

      {/* Header Right Actions */}
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-gray-50 rounded-full transition-colors text-gray-600">
          <HelpCircle className="w-5 h-5" strokeWidth={1.8} />
        </button>
        <button className="p-2 hover:bg-gray-50 rounded-full transition-colors relative text-gray-600">
          <Bell className="w-5 h-5" strokeWidth={1.8} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <div className="h-6 w-px bg-gray-200 mx-1"></div>
        <div className="flex items-center">
          <img 
            src={user?.avatarUrl || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop"} 
            alt="User avatar" 
            className="w-9 h-9 rounded-full object-cover border border-gray-200"
          />
        </div>
      </div>
    </header>
  );
}
