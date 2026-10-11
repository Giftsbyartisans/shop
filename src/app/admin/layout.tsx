import AdminDesktopGate from '@/components/admin-desktop-gate';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminDesktopGate>{children}</AdminDesktopGate>;
}
