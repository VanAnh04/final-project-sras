import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Store, 
  UserCheck, 
  Wallet, 
  BarChart3, 
  AlertTriangle, 
  Users, 
  Settings, 
  LogOut,
  Layers 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Sidebar() {
  const { logout, user } = useAuth();

  const navItems = [
    { name: 'Bảng điều khiển', path: '/admin-dashboard', icon: LayoutDashboard },
    { name: 'Gara đối tác', path: '/admin/garages', icon: Store },
    { name: 'Kỹ thuật viên', path: '/admin/technicians', icon: UserCheck },
    { name: 'Tài chính', path: '/admin/finance', icon: Wallet },
    { name: 'Dịch vụ & Bảng giá', path: '/admin/services', icon: Layers },
    { name: 'Báo cáo', path: '/admin/reports', icon: BarChart3 },
    { name: 'Khiếu nại', path: '/admin/complaints', icon: AlertTriangle },
    { name: 'User', path: '/admin/users', icon: Users },
    { name: 'Cài đặt', path: '/admin/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0">
      {/* Logo Area */}
      <div className="h-20 flex items-center px-6 mb-4">
        <div>
          <h1 className="text-xl font-bold text-orange-600">SRAS Admin</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Điều hành hệ thống</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  isActive 
                    ? 'bg-orange-50 text-orange-600' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="w-5 h-5" strokeWidth={2.5} />
              {item.name}
            </NavLink>
          );
        })}
        
        <div className="pt-4">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
              <LogOut className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <span className="text-orange-600">Đăng xuất</span>
          </button>
        </div>
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <img 
            src={user?.avatarUrl || "https://ui-avatars.com/api/?name=" + (user?.fullName || 'Admin') + "&background=ea580c&color=fff"} 
            alt="User avatar" 
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{user?.fullName || 'Nhật Minh'}</p>
            <p className="text-[11px] font-medium text-gray-400 truncate">Quản trị viên</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
