"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Sidebar } from "./sidebar";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  repoId: string | null;
  repoName?: string;
  selectedConversation: number | null;
  onSelectConversation: (id: number) => void;
  onNewConversation: (id: number) => void;
}

export function MobileSidebar({
  isOpen,
  onClose,
  repoId,
  repoName,
  selectedConversation,
  onSelectConversation,
  onNewConversation,
}: MobileSidebarProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-[#0d1117] border-r border-white/[0.06] flex flex-col">
        <div className="flex-1 overflow-hidden">
          <Sidebar
            repoId={repoId}
            repoName={repoName}
            selectedConversation={selectedConversation}
            onSelectConversation={(id) => {
              onSelectConversation(id);
              onClose();
            }}
            onNewConversation={(id) => {
              onNewConversation(id);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}