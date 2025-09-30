import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useIdleTimer } from '@/hooks/useIdleTimer';
import { IdleWarningModal } from '@/components/auth/IdleWarningModal';

const DEFAULT_BASE_ID = '550e8400-e29b-41d4-a716-446655440001';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'direction' | 'chef_base' | 'technicien' | 'administratif';
  baseId: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIdleWarning, setShowIdleWarning] = useState(false);

  useEffect(() => {
    let isSubscribed = true;
    let isInitialized = false;

    // Set up auth state listener first to catch all events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('Auth state change:', event, newSession?.user?.id);
        
        if (!isSubscribed) return;

        // Handle session changes synchronously first
        setSession(newSession);
        
        if (newSession?.user) {
          // Defer profile fetching to avoid blocking auth state updates
          setTimeout(() => {
            if (isSubscribed) {
              fetchUserProfile(newSession);
            }
          }, 0);
        } else {
          setUser(null);
        }
        
        // Mark as not loading after first auth state change
        if (!isInitialized) {
          isInitialized = true;
          setLoading(false);
        }
      }
    );

    // Get initial session after setting up listener
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting initial session:', error);
          setLoading(false);
          isInitialized = true;
          return;
        }
        
        if (!isSubscribed) return;
        
        // If we have a session but haven't been initialized by the listener yet
        if (initialSession && !isInitialized) {
          setSession(initialSession);
          setTimeout(() => {
            if (isSubscribed) {
              fetchUserProfile(initialSession);
            }
          }, 0);
        }
        
        // Ensure loading is false after initialization
        if (!isInitialized) {
          isInitialized = true;
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isSubscribed) {
          setLoading(false);
          isInitialized = true;
        }
      }
    };

    initializeAuth();

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (session: Session) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }
      
      if (profile) {
        const baseId = profile.base_id || DEFAULT_BASE_ID;
        if (!profile.base_id) {
          await supabase
            .from('profiles')
            .update({ base_id: baseId })
            .eq('id', profile.id);
        }
        const userData = {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          baseId,
          createdAt: profile.created_at
        };
        setUser(userData);
      } else {
        await createDefaultProfile(session.user);
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  const createDefaultProfile = async (authUser: SupabaseUser) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .insert({
          id: authUser.id,
          email: authUser.email,
          name: authUser.email?.split('@')[0] || 'Utilisateur',
          role: 'technicien',
          base_id: DEFAULT_BASE_ID
        })
        .select()
        .maybeSingle();
      
      if (error) {
        console.error('Error creating profile:', error);
        return;
      }
      
      if (profile) {
        const baseId = profile.base_id || DEFAULT_BASE_ID;
        if (!profile.base_id) {
          await supabase
            .from('profiles')
            .update({ base_id: baseId })
            .eq('id', profile.id);
        }
        const userData = {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          baseId,
          createdAt: profile.created_at
        };
        setUser(userData);
      }
    } catch (error) {
      console.error('Error creating default profile:', error);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        return false;
      }

      if (data.session) {
        setSession(data.session);
        await fetchUserProfile(data.session);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Clear state immediately for better UX
      setUser(null);
      setSession(null);
      setLoading(true);
      setShowIdleWarning(false);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        // Even if logout fails, keep local state cleared
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, keep local state cleared
    } finally {
      setLoading(false);
    }
  };

  // Idle timer for automatic logout (30 minutes)
  const { isWarning, remainingTime, resetTimer } = useIdleTimer({
    timeout: 30 * 60 * 1000, // 30 minutes
    warningTime: 60 * 1000, // 1 minute warning
    onIdle: () => {
      setShowIdleWarning(false);
      logout();
    },
    onWarning: () => {
      if (session && user) {
        setShowIdleWarning(true);
      }
    },
  });

  // Handle staying logged in
  const handleStayLoggedIn = () => {
    setShowIdleWarning(false);
    resetTimer();
  };

  // Handle logout from idle warning
  const handleIdleLogout = () => {
    setShowIdleWarning(false);
    logout();
  };

  const value = {
    user,
    session,
    login,
    logout,
    isAuthenticated: !!session && !!user,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <IdleWarningModal
        isOpen={showIdleWarning}
        remainingSeconds={remainingTime}
        onStayLoggedIn={handleStayLoggedIn}
        onLogout={handleIdleLogout}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};