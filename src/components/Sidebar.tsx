"use client"

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Upload, MessageSquare, Menu, X, Folder, Ticket, Settings, BarChart} from "lucide-react";
import { useAuth } from "@/config/AuthContext";
import Link from "next/link";

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

const sidebarItems: SidebarItem[] = [
  {
    name: "Home",
    path: "/home",
    icon: <Home size={20} />
  },
  {
    name: "Upload de Incidentes",
    path: "/upload",
    icon: <Upload size={20} />
  },
  {
    name: "Chat Contextual",
    path: "/generate",
    icon: <MessageSquare size={20} />
  },
  {
    name: "Categorização",
    path: "/categorization",
    icon: <Folder size={20} />
  },
  {
    name: "Tickets",
    path: "/tickets",
    icon: <Ticket size={20} />
  },
  {
    name: "Resultados",
    path: "/results",
    icon: <BarChart size={20} />
  },
  {
    name: "Configurações",
    path: "/settings",
    icon: <Settings size={20} />
  }
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleItemClick = (e: React.MouseEvent, path: string) => {
    // clique com botão do meio do mouse
    if (e.button === 1) {
      return;
    }
    
    // clique normal (fechar sidebar no mobile)
    e.preventDefault();
    router.push(path);
    setIsOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  return (
    <>
      {/* Header fixo para mobile */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-white border-b z-40 flex items-center sm:hidden px-4">
        <button 
          onClick={toggleSidebar}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <span className="ml-4 font-semibold">ANON Sentinel</span>
      </div>

      {/* Overlay para mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } sm:translate-x-0 flex flex-col pt-14 sm:pt-0 h-screen`}>
        <div className="p-4 border-b hidden sm:block">
          <h2 className="text-xl font-bold text-gray-800">ANON Sentinel</h2>
        </div>
        
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {sidebarItems.map((item) => (
              <li key={item.path}>
                <Link
                  href={item.path}
                  onMouseDown={(e) => handleItemClick(e, item.path)}
                  className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors block ${
                    pathname === item.path
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <span>Sair</span>
          </button>
        </div>
      </div>
    </>
  );
} 