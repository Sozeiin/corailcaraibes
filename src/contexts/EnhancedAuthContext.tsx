import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { authRateLimiter, logSecurityEvent } from "@/lib/securityEnhancements";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: any) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: any) => Promise<void>;
  securityMetrics: {
    lastLoginAttempt?: Date;
    failedAttempts: number;
    rateLimited: boolean;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [securityMetrics, setSecurityMetrics] = useState({
    failedAttempts: 0,
    rateLimited: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);

      // Log authentication events
      if (event === 'SIGNED_IN' && session?.user) {
        await logSecurityEvent('login_success', {
          userId: session.user.id,
          email: session.user.email,
        });
        
        // Reset security metrics on successful login
        setSecurityMetrics({
          failedAttempts: 0,
          rateLimited: false,
        });

        toast({
          title: "Connexion réussie",
          description: "Vous êtes maintenant connecté.",
        });
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSecurityMetrics({
          failedAttempts: 0,
          rateLimited: false,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [toast]);

  const signIn = async (email: string, password: string) => {
    const identifier = email;
    
    // Check rate limiting
    if (authRateLimiter.isRateLimited(identifier)) {
      setSecurityMetrics(prev => ({ ...prev, rateLimited: true }));
      await logSecurityEvent('suspicious_activity', {
        email,
        reason: 'Rate limit exceeded',
      });
      throw new Error("Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.");
    }

    setSecurityMetrics(prev => ({ 
      ...prev, 
      lastLoginAttempt: new Date(),
      rateLimited: false 
    }));

    try {
      // Log login attempt
      await logSecurityEvent('login_attempt', { email });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Log failed attempt
        await logSecurityEvent('login_failure', {
          email,
          error: error.message,
        });

        setSecurityMetrics(prev => ({
          ...prev,
          failedAttempts: prev.failedAttempts + 1,
        }));

        throw error;
      }

      // Reset rate limiter on success
      authRateLimiter.reset(identifier);

    } catch (error: any) {
      console.error("Sign in error:", error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      if (error) throw error;

      await logSecurityEvent('login_attempt', {
        email,
        type: 'signup',
      });

      toast({
        title: "Inscription réussie",
        description: "Veuillez vérifier votre email pour confirmer votre compte.",
      });

    } catch (error: any) {
      console.error("Sign up error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté avec succès.",
      });
    } catch (error: any) {
      console.error("Sign out error:", error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;

      await logSecurityEvent('login_attempt', {
        email,
        type: 'password_reset',
      });

      toast({
        title: "Email de réinitialisation envoyé",
        description: "Vérifiez votre boîte mail pour réinitialiser votre mot de passe.",
      });
    } catch (error: any) {
      console.error("Password reset error:", error);
      throw error;
    }
  };

  const updateProfile = async (updates: any) => {
    try {
      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;

      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été mises à jour avec succès.",
      });
    } catch (error: any) {
      console.error("Profile update error:", error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    securityMetrics,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}