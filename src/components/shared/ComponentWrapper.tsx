// Temporary wrapper to provide props to components that haven't been updated yet
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface ComponentWrapperProps {
    children: (props: { user: any; onLogout: () => void }) => React.ReactNode;
}

export default function ComponentWrapper({ children }: ComponentWrapperProps) {
    const { currentUser: user, logout } = useAuth();

    return <>{children({ user, onLogout: logout })}</>;
}
