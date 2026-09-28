'use client';

import * as React from 'react';

import { NavProjects } from '@/components/nav-projects';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from '@/components/ui/sidebar';
import { Settings2Icon, Command, House, LogIn, Trophy, Target } from 'lucide-react';
import { useCurrentUser } from '@/features/user/hooks/use_currentUser';
import { Link } from 'react-router';

type AppSidebarProps = {
    view: 'user' | 'visitor';
};

const VISITOR_ITEMS = {
    ITEMS: [
        {
            name: 'Se connecter',
            url: '/auth/signin',
            icon: <LogIn />,
        },
        {
            name: 'Accueil',
            url: '/',
            icon: <House />,
        },
    ],
};

const USER_ITEMS = {
    ITEMS: [
        {
            name: 'Accueil',
            url: '/',
            icon: <House />,
        },
        {
            name: 'Evènements',
            url: '/me/events',
            icon: <Trophy />,
        },
        {
            name: 'Missions',
            url: '/me/missions',
            icon: <Target />,
        },
        {
            name: 'Paramètres',
            url: '/settings',
            icon: <Settings2Icon />,
        },
    ],
};

export function AppSidebar({
    view,
    ...props
}: AppSidebarProps & React.ComponentProps<typeof Sidebar>) {
    const { user } = useCurrentUser();

    const data = view === 'user' ? USER_ITEMS : VISITOR_ITEMS;

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link to="/">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                    <Command className="size-4" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">H.E.L.P</span>
                                    <span className="truncate text-xs">
                                        Hub for Event Logistic & People
                                    </span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavProjects projects={data.ITEMS} />
            </SidebarContent>
            <SidebarFooter>
                {view === 'user' && (
                    <NavUser
                        user={{
                            name: user.name ?? '',
                            email: user.email ?? '',
                            avatar: user.avatar ?? '',
                        }}
                    />
                )}
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
