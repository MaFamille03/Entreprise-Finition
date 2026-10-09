'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  ChevronDown,
  ClipboardList,
  ContactRound,
  FileBarChart,
  FileInput,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  ReceiptText,
  Settings,
  ShoppingCart,
  Truck,
  UserRound,
  Wallet,
} from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

type Role = 'admin' | 'director' | 'sales' | 'cashier' | 'warehouse' | 'accountant' | 'site_manager';

type UserContext = {
  full_name?: string | null;
  role?: Role | null;
  company_name?: string | null;
};

const roleLabels: Record<Role, string> = {
  admin: 'Administrateur',
  director: 'Directeur',
  sales: 'Chargé clientèle',
  cashier: 'Caissier',
  warehouse: 'Magasinier',
  accountant: 'Comptable',
  site_manager: 'Conducteur de travaux',
};

const navigation = [
  {
    label: 'Pilotage',
    items: [
      { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
      { href: '/rapports', label: 'Rapports & analyses', icon: BarChart3 },
    ],
  },
  {
    label: 'Opérations',
    items: [
      { href: '/ventes', label: 'Prestations & facturation', icon: ReceiptText },
      { href: '/achats', label: 'Achats', icon: ShoppingCart },
      { href: '/stock', label: 'Matériaux & consommables', icon: Boxes },
      { href: '/contacts', label: 'Clients & contacts', icon: ContactRound },
      { href: '/chantiers', label: 'Chantiers', icon: Building2 },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/caisse', label: 'Trésorerie', icon: Wallet },
    ],
  },
  {
    label: 'Données & administration',
    items: [
      { href: '/import-export', label: 'Import / export', icon: FileInput },
      { href: '/administration', label: 'Administration', icon: Settings },
    ],
  },
];

const pageTitles: Record<string, string> = {
  '/dashboard': 'Tableau de bord',
  '/ventes': 'Prestations & facturation',
  '/achats': 'Achats',
  '/stock': 'Matériaux & consommables',
  '/contacts': 'Clients & contacts',
  '/chantiers': 'Chantiers',
  '/caisse': 'Trésorerie',
  '/rapports': 'Rapports & analyses',
  '/import-export': 'Import / export',
  '/administration': 'Administration',
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U';
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [context, setContext] = useState<UserContext>({});

  useEffect(() => {
    let active = true;
    fetch('/api/me')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && data) setContext(data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setProfileOpen(false);
    setMobileNavOpen(false);
  }, [pathname]);

  async function logout() {
    await createClient().auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  const name = context.full_name?.trim() || 'Utilisateur';
  const role = context.role ? roleLabels[context.role] : 'Utilisateur';
  const company = context.company_name?.trim() || 'Mon entreprise';
  const title = pageTitles[pathname] ?? 'Finition ERP';
  const isPublicAuthPage = pathname === '/login' || pathname === '/onboarding';

  if (isPublicAuthPage) return <>{children}</>;

  return (
    <div className="app-shell">
      {mobileNavOpen && <button className="mobile-nav-backdrop" aria-label="Fermer le menu" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`sidebar${mobileNavOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <Link href="/dashboard" className="brand-mark" aria-label="Retour au tableau de bord">
            <span className="brand-symbol">F</span>
            <span>
              <strong>Finition ERP</strong>
              <small>Gestion d’entreprise</small>
            </span>
          </Link>
        </div>

        <div className="sidebar-company">
          <span className="sidebar-company-icon"><Building2 size={15} /></span>
          <span>
            <small>Entreprise</small>
            <strong title={company}>{company}</strong>
          </span>
        </div>

        <nav className="sidebar-nav" aria-label="Navigation principale">
          {navigation.map((section) => (
            <div className="nav-group" key={section.label}>
              <div className="nav-section-label">{section.label}</div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link key={item.href} href={item.href} className={`nav-item ${active ? 'active' : ''}`}>
                    <Icon size={17} strokeWidth={1.9} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-icon"><ClipboardList size={15} /></div>
          <div>
            <strong>Gestion centralisée</strong>
            <span>Prestations, chantiers, coûts et finances</span>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-btn"
              aria-label={mobileNavOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="topbar-page">
              <span className="topbar-kicker">Finition ERP</span>
              <strong>{title}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <button className="icon-btn notification-btn" aria-label="Notifications">
              <Bell size={18} />
              <span className="notification-dot" />
            </button>

            <div className="profile-container">
              <button
                className="profile-trigger"
                onClick={() => setProfileOpen((open) => !open)}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
              >
                <span className="avatar">{initials(name)}</span>
                <span className="profile-copy">
                  <strong>{name}</strong>
                  <small>{role}</small>
                </span>
                <ChevronDown size={16} className={profileOpen ? 'profile-chevron open' : 'profile-chevron'} />
              </button>

              {profileOpen && (
                <div className="profile-menu" role="menu">
                  <div className="profile-menu-head">
                    <span className="avatar avatar-large">{initials(name)}</span>
                    <div>
                      <strong>{name}</strong>
                      <small>{role}</small>
                    </div>
                  </div>
                  <div className="profile-menu-divider" />
                  <Link href="/administration" className="profile-menu-item" role="menuitem">
                    <UserRound size={16} />
                    Mon profil et paramètres
                  </Link>
                  <button className="profile-menu-item danger" role="menuitem" onClick={logout}>
                    <LogOut size={16} />
                    Se déconnecter
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}

export default AppShell;
