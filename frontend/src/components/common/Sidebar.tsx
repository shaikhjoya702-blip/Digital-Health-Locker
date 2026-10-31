import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Pill, 
  QrCode, 
  HelpCircle, 
  UserCircle,
  HeartPulse
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Medical Records', path: '/records', icon: <FileText className="w-5 h-5" /> },
    { label: 'Medicine Reminders', path: '/reminders', icon: <Pill className="w-5 h-5" /> },
    { label: 'QR / OTP Sharing', path: '/sharing', icon: <QrCode className="w-5 h-5" /> },
    { label: 'Help & Support', path: '/support', icon: <HelpCircle className="w-5 h-5" /> },
    { label: 'Profile & Settings', path: '/profile', icon: <UserCircle className="w-5 h-5" /> },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
      >
        {/* Brand logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-health-600 flex items-center justify-center text-white shadow-md shadow-health-600/20">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">Health Locker</h1>
            <p className="text-[10px] text-health-600 font-semibold tracking-wide uppercase mt-0.5">Portable EHR</p>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-health-50 text-health-700 font-semibold shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Security & Support Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 mx-4 mb-4 rounded-xl text-xs text-slate-500">
          <p className="font-semibold text-slate-700">Protected EHR System</p>
          <p className="mt-0.5 text-[11px]">All sharing requires explicit patient authorization.</p>
          <p className="mt-1 text-[10px] text-slate-400">Official contact: xoya0102@gmail.com</p>
        </div>
      </aside>
    </>
  );
};
