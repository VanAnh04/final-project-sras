import { Search, Bell, Settings, HelpCircle } from 'lucide-react';

export default function Header() {
  return (
    <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20">
      <div className="flex items-center gap-8">
        <h2 className="text-xl font-bold text-gray-900">Trung tâm điều hành</h2>
        
        <div className="relative hidden md:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Tìm kiếm ca trực, kỹ thuật viên, hoặc xe..."
            className="w-96 pl-10 pr-4 py-2 bg-gray-50/50 border border-transparent rounded-full focus:outline-none focus:bg-white focus:border-gray-200 focus:ring-4 focus:ring-gray-50 transition-all text-sm placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 text-gray-400">
        <button className="p-2 hover:bg-gray-50 rounded-full transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full border-2 border-white"></span>
        </button>
        <button className="p-2 hover:bg-gray-50 rounded-full transition-colors">
          <Settings className="w-5 h-5" />
        </button>
        <button className="p-2 hover:bg-gray-50 rounded-full transition-colors">
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
