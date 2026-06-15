import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Recent activity', path: '#', icon: '📝' },
    { name: 'All expenses', path: '#', icon: '🧾' },
  ];

  return (
    <div className="min-h-screen bg-graybg flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="bg-brand text-white h-14 flex items-center justify-between px-6 shadow-sm z-10">
        <div className="flex items-center space-x-2">
          <span className="text-xl font-bold tracking-tight">Splitwise Clone</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm">{user?.name}</span>
          <img src={`https://ui-avatars.com/api/?name=${user?.name}&background=38A081&color=fff`} alt="avatar" className="w-8 h-8 rounded-full border border-brand-dark" />
          <button onClick={logout} className="text-sm hover:underline">Log out</button>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-1 max-w-6xl w-full mx-auto flex flex-col md:flex-row">
        
        {/* Left Sidebar */}
        <aside className="w-full md:w-56 flex-shrink-0 p-4 md:py-8 space-y-6">
          <nav className="space-y-1">
            {navItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link 
                  key={item.name} 
                  to={item.path} 
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive ? 'bg-brand-light text-brand-dark' : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-4">
            <div className="flex items-center justify-between px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <span>Groups</span>
              <button className="text-gray-400 hover:text-brand">+ add</button>
            </div>
            {/* We will populate groups here dynamically or leave it as a placeholder for layout */}
            <div className="px-3 text-sm text-gray-500 italic">Groups populate on Dashboard</div>
          </div>
        </aside>

        {/* Center Content Feed (Outlet) */}
        <main className="flex-1 w-full bg-white md:my-8 md:rounded-lg shadow-sm border border-gray-200 min-h-[500px]">
          <Outlet />
        </main>

        {/* Right Sidebar Placeholder (Splitwise uses right column for ads/settings occasionally, but we can leave it empty or map members here depending on route) */}
      </div>
    </div>
  );
};

export default Layout;
