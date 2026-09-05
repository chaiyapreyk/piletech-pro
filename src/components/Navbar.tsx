'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calculator, ClipboardList, ShieldCheck, LayoutDashboard, FileSpreadsheet, HardHat } from 'lucide-react';
import ProjectSwitcher from './navigation/ProjectSwitcher';

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'CM Dashboard', icon: LayoutDashboard },
    { href: '/calculator', label: 'Hiley Calculator', icon: Calculator },
    { href: '/piles', label: 'Pile Matrix & Records', icon: ClipboardList },
    { href: '/qc', label: 'QA/QC Inspection', icon: ShieldCheck },
    { href: '/reports', label: 'Reports & Export', icon: FileSpreadsheet },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <div className="bg-amber-500 p-2 rounded-lg text-slate-950">
              <HardHat className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="leading-tight">PileTech Pro</span>
              <span className="text-[10px] text-amber-400 font-medium">FIELD ENGINEERING & CM SUITE</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Project Switcher */}
          <div className="flex items-center">
            <ProjectSwitcher />
          </div>
        </div>
      </div>

      {/* Mobile Nav Bar */}
      <div className="md:hidden border-t border-slate-800 bg-slate-950 px-2 py-1 flex justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1 px-2 rounded text-[10px] font-medium ${
                isActive ? 'text-amber-400 font-bold' : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              {item.label.split(' ')[0]}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
