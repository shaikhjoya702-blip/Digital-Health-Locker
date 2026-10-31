import React from 'react';
import { Menu, Bell, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Button } from './Button';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { hasBrowserPermission, requestBrowserPermission } = useNotification();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="hidden sm:inline-block text-xs font-medium px-2.5 py-1 bg-health-50 text-health-700 rounded-full border border-health-100">
          Patient Portal
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Medicine notifications permission button if not enabled */}
        {!hasBrowserPermission && (
          <button
            onClick={requestBrowserPermission}
            title="Enable browser alerts for medicine doses"
            className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Enable Dose Alerts</span>
          </button>
        )}

        {/* User profile dropdown info */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-semibold text-slate-900 leading-tight">
              {user?.profile?.full_name || user?.email}
            </p>
            <p className="text-[11px] text-slate-500">{user?.email}</p>
          </div>

          <div className="w-9 h-9 rounded-full bg-health-100 text-health-700 font-bold flex items-center justify-center text-sm border border-health-200">
            {user?.profile?.full_name?.[0]?.toUpperCase() || <UserIcon className="w-4 h-4" />}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            title="Secure Sign Out"
            className="text-slate-500 hover:text-rose-600 p-2"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};
