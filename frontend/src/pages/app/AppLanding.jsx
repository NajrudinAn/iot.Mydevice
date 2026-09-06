import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApplicationAuth } from '../../context/ApplicationAuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { LogIn, UserPlus, LayoutDashboard, LogOut } from 'lucide-react';

export default function AppLanding() {
  const navigate = useNavigate();
  const { appUser, logout, authSettings } = useApplicationAuth();

  if (!authSettings) return null;

  const appName = authSettings.display_name || authSettings.name || 'Application';

  return (
    <div className="flex-center w-full h-full p-6">
      <Card className="max-w-md w-full p-8 text-center border-t-4 border-t-primary">
        {authSettings.logo_url ? (
          <img 
            src={authSettings.logo_url} 
            alt="Logo" 
            className="h-20 mx-auto mb-6 rounded-lg object-contain bg-white/5 p-2" 
          />
        ) : (
          <div className="h-20 w-20 mx-auto mb-6 rounded-lg bg-primary/20 flex-center text-primary font-bold text-3xl">
            {appName[0]}
          </div>
        )}
        
        <h1 className="text-3xl font-bold mb-3">{appName}</h1>
        
        <p className="text-muted mb-8 text-lg">
          {authSettings.description || 'Welcome to the IoT Application Portal'}
        </p>

        <div className="flex flex-column gap-4 max-w-[240px] mx-auto">
          {appUser?.loggedIn ? (
            <>
              <p className="text-sm font-medium text-primary bg-primary/10 py-2 px-4 rounded-full mb-2">
                Logged in as {appUser.email || 'User'}
              </p>
              <Button onClick={() => navigate('dashboards')} icon={LayoutDashboard} className="w-full">
                Go to Dashboards
              </Button>
              <Button onClick={logout} variant="secondary" icon={LogOut} className="w-full">
                Logout
              </Button>
            </>
          ) : (
            <>
              {authSettings.authentication_enabled ? (
                <>
                  <Button onClick={() => navigate('login')} icon={LogIn} className="w-full">
                    Login
                  </Button>
                  {authSettings.registration_enabled && (
                    <Button onClick={() => navigate('register')} variant="secondary" icon={UserPlus} className="w-full">
                      Create Account
                    </Button>
                  )}
                </>
              ) : (
                <Button onClick={() => navigate('dashboards')} icon={LayoutDashboard} className="w-full">
                  View Public Dashboards
                </Button>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
