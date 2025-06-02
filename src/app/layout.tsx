import './globals.css';
import AdminLayout from './admin-layout';
import { AuthProvider } from '../config/AuthContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <AdminLayout>
            {children}
          </AdminLayout>
        </AuthProvider>
      </body>
    </html>
  );
} 