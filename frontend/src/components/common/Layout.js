// Shared layout with sidebar navigation
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const roleMenus = {
  main_admin: [
    { label: 'Dashboard',   path: '/admin/dashboard',    icon: '📊' },
    { label: 'Colleges',    path: '/admin/colleges',      icon: '🏫' },
    { label: 'Users',       path: '/admin/users',         icon: '👥' },
    { label: 'Create Exam', path: '/staff/exams/create',  icon: '📝' },
    { label: 'Profile',     path: '/profile',             icon: '👤' },
  ],
  college_admin: [
    { label: 'Dashboard',   path: '/college/dashboard',   icon: '📊' },
    { label: 'Users',       path: '/admin/users',         icon: '👥' },
    { label: 'Create Exam', path: '/staff/exams/create',  icon: '📝' },
    { label: 'Profile',     path: '/profile',             icon: '👤' },
  ],
  staff: [
    { label: 'Dashboard',   path: '/staff/dashboard',     icon: '📊' },
    { label: 'Students',    path: '/admin/users',         icon: '🎓' },
    { label: 'Create Exam', path: '/staff/exams/create',  icon: '📝' },
    { label: 'Profile',     path: '/profile',             icon: '👤' },
  ],
  student: [
    { label: 'Dashboard',   path: '/student/dashboard',   icon: '📊' },
    { label: 'Profile',     path: '/profile',             icon: '👤' },
  ],
};

export default function Layout({ children, title }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = roleMenus[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleColors = {
    main_admin:    'bg-purple-700',
    college_admin: 'bg-blue-700',
    staff:         'bg-green-700',
    student:       'bg-orange-600',
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} ${roleColors[user?.role] || 'bg-blue-800'} text-white flex flex-col transition-all duration-300 flex-shrink-0`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          {sidebarOpen && <span className="font-bold text-lg">ExamProctor</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white hover:text-gray-200 ml-auto">
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* User info */}
        {sidebarOpen && (
          <div className="p-4 border-b border-white/20">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold mb-2">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <p className="font-medium text-sm truncate">{user?.name}</p>
            <p className="text-xs text-white/60 capitalize">{user?.role?.replace(/_/g, ' ')}</p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                location.pathname === item.path
                  ? 'bg-white/20 font-semibold'
                  : 'hover:bg-white/10'
              }`}
            >
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="text-sm">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-white/20">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <span className="text-xl">🚪</span>
            {sidebarOpen && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h1 className="text-xl font-bold text-gray-800 truncate">{title}</h1>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-sm text-gray-500 hidden md:block">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <Link
              to="/profile"
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition"
            >
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                {user?.name?.[0]?.toUpperCase()}
              </span>
              <span className="hidden sm:block font-medium max-w-[120px] truncate">{user?.name}</span>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
