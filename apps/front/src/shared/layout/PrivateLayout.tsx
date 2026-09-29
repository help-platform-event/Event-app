import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Outlet } from 'react-router';
import { NotificationBell } from '../../features/notification/components/NotificationBell';
import Footer from '../components/UI/Footer';

export function PrivateLayout() {
    return (
        <SidebarProvider>
            <AppSidebar view="user" />
            <SidebarInset className="flex min-h-screen flex-col">
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                    </div>
                    <div className="ml-auto px-4">
                        <NotificationBell />
                    </div>
                </header>
                <main className="flex flex-1 flex-col p-4">
                    <Outlet />
                </main>
                <Footer />
            </SidebarInset>
        </SidebarProvider>
    );
}
