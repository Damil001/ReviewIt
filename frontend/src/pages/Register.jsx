import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Mail, Lock, User, Loader2, Sparkles } from 'lucide-react';
import { SERVER_BASE_URL } from '../config.js';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const result = await register(name, email, password);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 -right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 -left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md glass animate-fade-in border-border/50 shadow-2xl shadow-primary/5">
        <CardHeader className="space-y-4 text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-lg shadow-primary/30 animate-pulse-glow">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-3xl font-bold gradient-text">ReviewIt</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Create your account to get started
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          {error && (
            <Alert variant="destructive" className="animate-fade-in bg-destructive/10 border-destructive/30">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground/90">Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="John Doe"
                  className="pl-10 h-11 bg-secondary/50 border-border/50 focus:border-primary/50 transition-all duration-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground/90">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="pl-10 h-11 bg-secondary/50 border-border/50 focus:border-primary/50 transition-all duration-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground/90">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={6}
                  className="pl-10 pr-10 h-11 bg-secondary/50 border-border/50 focus:border-primary/50 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Must be at least 6 characters</p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 font-semibold bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 transition-all duration-300 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              window.location.href = `${SERVER_BASE_URL}/api/auth/google`;
            }}
            className="w-full h-11 border-border/50 hover:bg-secondary/50 transition-all"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>
        </CardContent>

        <CardFooter className="justify-center pt-2 pb-6">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
