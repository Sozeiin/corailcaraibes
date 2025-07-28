import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'direction' | 'chef_base' | 'technicien';
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

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        console.log('Initial session check:', initialSession?.user?.id);
        
        if (initialSession) {
          setSession(initialSession);
          await fetchUserProfile(initialSession);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state change:', event, newSession?.user?.id);
        setSession(newSession);
        
        if (newSession?.user && event === 'SIGNED_IN') {
          await fetchUserProfile(newSession);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
        
        if (!loading) {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (session: Session) => {
    try {
      console.log('Fetching profile for user:', session.user.id);
      
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
        const userData = {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          baseId: profile.base_id,
          createdAt: profile.created_at
        };
        console.log('Profile loaded successfully:', userData);
        setUser(userData);
      } else {
        console.log('No profile found, creating default profile');
        await createDefaultProfile(session.user);
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  const createDefaultProfile = async (authUser: SupabaseUser) => {
    try {
      console.log('Creating default profile for:', authUser.email);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .insert({
          id: authUser.id,
          email: authUser.email,
          name: authUser.email?.split('@')[0] || 'Utilisateur',
          role: 'technicien',
          base_id: '550e8400-e29b-41d4-a716-446655440001'
        })
        .select()
        .maybeSingle();
      
      if (error) {
        console.error('Error creating profile:', error);
        return;
      }
      
      if (profile) {
        const userData = {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          baseId: profile.base_id,
          createdAt: profile.created_at
        };
        console.log('Default profile created:', userData);
        setUser(userData);
      }
    } catch (error) {
      console.error('Error creating default profile:', error);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      console.log('Attempting login for:', email);
      
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
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
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