import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import authLogo from '@/assets/auth-logo.png';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { secureStorage } from '@/lib/storage';
export default function Auth() {
  const {
    isAuthenticated
  } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [signupForm, setSignupForm] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: '',
    role: '',
    baseId: ''
  });
  const [bases, setBases] = useState<Array<{
    id: string;
    name: string;
  }>>([]);
  useEffect(() => {
    const fetchBases = async () => {
      const {
        data
      } = await supabase.from('bases').select('id, name').order('name');
      setBases(data || []);
    };
    fetchBases();

    // Load remembered email on component mount
    const rememberedEmail = secureStorage.getRememberedEmail();
    const isRemembered = secureStorage.isRememberMeEnabled();
    if (rememberedEmail && isRemembered) {
      setLoginForm(prev => ({
        ...prev,
        email: rememberedEmail
      }));
      setRememberMe(true);
    }
  }, []);
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const {
        error
      } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password
      });
      if (error) {
        toast({
          title: "Erreur de connexion",
          description: error.message,
          variant: "destructive"
        });
      } else {
        // Save/clear remembered email based on remember me checkbox
        secureStorage.saveRememberedEmail(loginForm.email, rememberMe);
        toast({
          title: "Connexion réussie",
          description: "Redirection en cours..."
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupForm.password !== signupForm.confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive"
      });
      return;
    }
    if (!signupForm.role || !signupForm.baseId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un rôle et une base",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      const {
        error
      } = await supabase.auth.signUp({
        email: signupForm.email,
        password: signupForm.password,
        options: {
          data: {
            name: signupForm.name,
            role: signupForm.role,
            base_id: signupForm.baseId
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      if (error) {
        toast({
          title: "Erreur d'inscription",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Inscription réussie",
          description: "Vérifiez votre email pour confirmer votre compte"
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-marine-500 to-ocean-500 p-4">
      <Card className="w-full max-w-md rounded-lg">
        <CardHeader className="text-center">
          <img src={authLogo} alt="Corail Caraibes logo" className="w-50 h-50 object-contain rounded-lg mx-auto mb-4" />
          <CardTitle className="text-2xl">Corail Caraibes</CardTitle>
          <CardDescription>Gestionnaire de flotte</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Inscription</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" value={loginForm.email} onChange={e => setLoginForm({
                  ...loginForm,
                  email: e.target.value
                })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Mot de passe</Label>
                  <Input id="login-password" type="password" value={loginForm.password} onChange={e => setLoginForm({
                  ...loginForm,
                  password: e.target.value
                })} required />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember-me" checked={rememberMe} onCheckedChange={checked => setRememberMe(checked as boolean)} />
                  <Label htmlFor="remember-me" className="text-sm font-normal">
                    Se souvenir de moi
                  </Label>
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Connexion...' : 'Se connecter'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nom complet</Label>
                  <Input id="signup-name" type="text" value={signupForm.name} onChange={e => setSignupForm({
                  ...signupForm,
                  name: e.target.value
                })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" value={signupForm.email} onChange={e => setSignupForm({
                  ...signupForm,
                  email: e.target.value
                })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Mot de passe</Label>
                  <Input id="signup-password" type="password" value={signupForm.password} onChange={e => setSignupForm({
                  ...signupForm,
                  password: e.target.value
                })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                  <Input id="confirm-password" type="password" value={signupForm.confirmPassword} onChange={e => setSignupForm({
                  ...signupForm,
                  confirmPassword: e.target.value
                })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rôle</Label>
                  <Select value={signupForm.role} onValueChange={value => setSignupForm({
                  ...signupForm,
                  role: value
                })} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chef_base">Chef de base</SelectItem>
                      <SelectItem value="technicien">Technicien</SelectItem>
                      <SelectItem value="direction">Direction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="base">Base d'affectation</Label>
                  <Select value={signupForm.baseId} onValueChange={value => setSignupForm({
                  ...signupForm,
                  baseId: value
                })} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une base" />
                    </SelectTrigger>
                    <SelectContent>
                      {bases.map(base => <SelectItem key={base.id} value={base.id}>
                          {base.name}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={loading || !signupForm.role || !signupForm.baseId}>
                  {loading ? 'Inscription...' : "S'inscrire"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>;
}