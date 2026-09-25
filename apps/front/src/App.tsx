import Home from './pages/Home';
import { Navigate, Route, Routes } from 'react-router';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import Event from './pages/event/Event';
import { EventDetailsPage } from './pages/event/EventDetailsPage';
import PrivateRoute from './pages/auth/PrivateRoute';
import UnauthorizedPage from './pages/auth/Unauthorized.page';
import NotFoundPage from './pages/NotFound.page';
import { VisitorLayout } from './shared/layout/VisitorLayout';
import SignupPage from './pages/auth/Signup.page';
import SigninPage from './pages/auth/Signin.page';
import { EventCreationPage } from './features/event/components/EventCreationPage';
import { Toaster } from 'react-hot-toast';
import RoleBasedLayout from './shared/layout/RoleBasedLayout';
import { useRefreshToken } from './features/auth/hooks/use_auth.service';
import { SkeletonLoading } from './shared/components/UI/states/SkeletonLoading';
import { MissionDetailsPage } from './pages/mission/MissionDetailsPage';
import { SlotDetailsPage } from './pages/Slot/SlotDetailsPage';
import { useAuthStore } from './features/auth/store/auth.store';
import { useEffect } from 'react';
import AvailabilitySetting from './features/settings/components/AvailabilitySetting';
import ProfilSetting from './features/settings/components/ProfilSetting';
import SecuritySettings from './features/settings/components/SecuritySetting';
import NotificationsSetting from './features/settings/components/NotificationsSetting';
import { TooltipProvider } from './components/ui/tooltip';
import { PrivateLayout } from './shared/layout/PrivateLayout';
import { ThemeProvider } from './components/theme-provider';
import SettingsPage from './pages/SettingsPage';

function useAuthBootstrap() {
    const accessToken = useAuthStore((s) => s.accessToken);
    const initialized = useAuthStore((s) => s.initialized);
    const setInitialized = useAuthStore((s) => s.setInitialized);
    const setAccessToken = useAuthStore((s) => s.setAccessToken);

    useEffect(() => {
        const token = localStorage.getItem('accessToken');

        setAccessToken(token);
        setInitialized(true);
    }, [setAccessToken, setInitialized]);

    const refresh = useRefreshToken();

    const shouldRefresh = initialized && !accessToken;

    return shouldRefresh ? refresh : { isLoading: !initialized };
}

function App() {
    const { isLoading } = useAuthBootstrap();

    if (isLoading) return <SkeletonLoading />;

    return (
        <>
            <ThemeProvider>
                <Toaster />
                <TooltipProvider>
                    <Routes>
                        {/* AUTH */}
                        <Route path="/auth/signup" element={<SignupPage />} />
                        <Route path="/auth/signin" element={<SigninPage />} />

                        {/* VISITOR - Allow different layout for pages shared by an User with a role and Visitors */}
                        <Route
                            element={
                                <RoleBasedLayout
                                    layouts={{
                                        USER: PrivateLayout,
                                        ADMIN: PrivateLayout,
                                    }}
                                    fallback={VisitorLayout}
                                />
                            }
                        >
                            <Route path="/" element={<Home />} />
                            <Route path="/events/:eventId" element={<EventDetailsPage />} />
                        </Route>

                        {/* PRIVATE - ONLY USER */}
                        <Route element={<PrivateRoute allowedRoles={['USER', 'ADMIN']} />}>
                            <Route element={<PrivateLayout />}>
                                <Route path="/me/events" element={<Event />} />
                                <Route path="/events/create" element={<EventCreationPage />} />
                                <Route
                                    path="/missions/:missionId"
                                    element={<MissionDetailsPage />}
                                />
                                <Route path="/slots/:slotId" element={<SlotDetailsPage />} />
                                <Route path="/settings" element={<SettingsPage />}>
                                    <Route index element={<Navigate to="profil" replace />} />
                                    <Route path="profil" element={<ProfilSetting />} />
                                    <Route
                                        path="disponibilites"
                                        element={<AvailabilitySetting />}
                                    />
                                    <Route path="securite" element={<SecuritySettings />} />
                                    <Route
                                        path="notifications"
                                        element={<NotificationsSetting />}
                                    />
                                </Route>
                            </Route>
                        </Route>

                        {/* OTHER PAGES */}
                        <Route path="/unauthorized" element={<UnauthorizedPage />} />
                        <Route path="/*" element={<NotFoundPage />} />
                    </Routes>
                </TooltipProvider>
            </ThemeProvider>
            <ReactQueryDevtools />
        </>
    );
}

export default App;
