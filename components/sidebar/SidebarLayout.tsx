"use client";

import { ReactNode } from "react";

type Props = {
  sidebar: ReactNode;
  children: ReactNode;
};

export default function SidebarLayout({ sidebar, children }: Props) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {sidebar}

      <main className="flex-1 p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
