"use client";

import ClerkUserButton from "@/components/ClerkUserButton";
import { useState, type ReactNode } from "react";

type MainLayoutProps = {
  children: ReactNode;
  roleLabel: string;
};

const navItems = ["Dashboard", "Profile", "Resources"];

export default function MainLayout({ children, roleLabel }: MainLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-slate-800 bg-slate-900 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center border-b border-slate-800 px-6">
          <span className="text-xl font-bold tracking-tight text-rose-500">MUniverse</span>
        </div>

        <nav className="space-y-2 p-4">
          {navItems.map((item) => (
            <button
              key={item}
              className="w-full rounded-xl p-3 text-left text-sm font-semibold text-slate-300 transition-all hover:bg-slate-800 hover:text-rose-400"
            >
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-4 md:px-8">
          <div className="flex items-center">
            <button
              onClick={() => setIsMenuOpen((current) => !current)}
              className="mr-4 rounded-lg p-2 text-slate-300 hover:bg-slate-800 md:hidden"
            >
              {isMenuOpen ? "Close" : "Menu"}
            </button>
            <h2 className="hidden text-sm font-medium text-slate-400 sm:block">
              Portal / <span className="font-bold text-slate-100">{roleLabel} View</span>
            </h2>
          </div>

          <div className="flex items-center gap-3 border-l border-slate-700 pl-4">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold text-slate-100">MUniverse User</p>
              <p className="text-[10px] font-medium uppercase text-slate-400">{roleLabel}</p>
            </div>
            <ClerkUserButton />
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8">{children}</main>
      </div>

      {isMenuOpen ? (
        <button
          type="button"
          aria-label="Close menu overlay"
          onClick={() => setIsMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      ) : null}
    </div>
  );
}
