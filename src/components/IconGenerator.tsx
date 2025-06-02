import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Shield, AlertTriangle, Bug, UserX, Zap, Eye, FileWarning, Network, Webhook, ShieldAlert, ShieldOff, KeyRound, Scan, ServerCrash, Siren, Fingerprint, Ban, KeySquare } from "lucide-react";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getCategoryIcon = (category: string) => { 
  const icons = [
    Shield,          // Proteção geral
    AlertTriangle,   // Alertas
    Bug,             // Vulnerabilidades
    UserX,           // Problemas de usuário
    Zap,             // Ataques rápidos/DoS
    ShieldAlert,     // Incidentes de segurança
    ShieldOff,       // Proteção comprometida
    KeyRound,        // Acesso/Autenticação
    Scan,            // Varreduras
    Webhook,         // Ataques web
    ServerCrash,     // Problemas de servidor
    FileWarning,     // Arquivos maliciosos
    Network,         // Problemas de rede
    Eye,             // Monitoramento
    Fingerprint,     // Identificação
    KeySquare,       // Acesso negado
    Ban,             // Bloqueios
    Siren            // Alertas críticos
  ];

  // Lista de cores para variações
  const colors = [
    "text-blue-500",
    "text-red-500",
    "text-purple-500",
    "text-orange-500",
    "text-yellow-500",
    "text-green-500",
    "text-indigo-500",
    "text-pink-500",
    "text-teal-500",
    "text-cyan-500",
    "text-rose-500",
    "text-emerald-500"
  ]; // 12 cores x 18 ícones = 216 combinações

  const hash = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const iconIndex = hash % icons.length;
  const colorIndex = (hash * 13) % colors.length;

  const IconComponent = icons[iconIndex];
  return <IconComponent className={colors[colorIndex]} />;
};