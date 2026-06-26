import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Database, Sparkles, Lock, Mail, User as UserIcon, ArrowRight, Shield, BarChart3, CheckCircle, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

export const AuthPage: React.FC = () => {
  const { login, addToast } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        if (!email || !password) {
          addToast('Please enter your email and password.', 'warning');
          setLoading(false);
          return;
        }
        const res = await api.login({ email, password });
        login(res.user, res.token);
      } else {
        if (!name || !email || !password) {
          addToast('All fields are required.', 'warning');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          addToast('Passwords do not match.', 'error');
          setLoading(false);
          return;
        }
        const res = await api.register({ name, email, password });
        login(res.user, res.token);
      }
    } catch (error: any) {
      addToast(error.message || 'Authentication failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    addToast('Initiating Fast Demo Authentication...', 'info');
    setTimeout(() => {
      // Simulate OAuth successfully logging in with model credentials or default mock user
      const mockUser = {
        id: 'google_' + Math.random().toString(36).substring(2, 9),
        name: 'Demo Guest',
        email: 'guest@datasage.ai',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=DemoGuest',
        joinedAt: new Date().toISOString(),
        uploadedCount: 0,
        cleanedCount: 0,
        lastLogin: new Date().toISOString()
      };
      login(mockUser as any, mockUser.id);
    }, 800);
  };

  useEffect(() => {
    // Initialize Google Sign-In Client
    const initGoogleGSI = () => {
      const google = (window as any).google;
      if (google?.accounts?.id) {
        google.accounts.id.initialize({
          client_id: "360335838501-datasage-app.apps.googleusercontent.com",
          callback: (response: any) => {
            try {
              const token = response.credential;
              const base64Url = token.split('.')[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(window.atob(base64).split('').map((c) => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
              }).join(''));

              const googleUser = JSON.parse(jsonPayload);
              const userPayload = {
                id: 'google_' + googleUser.sub,
                name: googleUser.name,
                email: googleUser.email,
                avatarUrl: googleUser.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(googleUser.name)}`,
                joinedAt: new Date().toISOString(),
                uploadedCount: 0,
                cleanedCount: 0,
                lastLogin: new Date().toISOString()
              };
              login(userPayload as any, userPayload.id);
              addToast(`Successfully signed in as ${googleUser.name}!`, 'success');
            } catch (err) {
              console.error("Google authentication parsing error:", err);
              addToast("Google Sign-In succeeded, but failed to parse profile payload.", "error");
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        const btnEl = document.getElementById("google-signin-button");
        if (btnEl) {
          google.accounts.id.renderButton(btnEl, {
            theme: "filled_blue",
            size: "large",
            text: "continue_with",
            shape: "rectangular",
            width: btnEl.clientWidth || 380
          });
        }
      }
    };

    // Poll to check if the script is loaded
    const timer = setInterval(() => {
      const google = (window as any).google;
      if (google?.accounts?.id) {
        initGoogleGSI();
        clearInterval(timer);
      }
    }, 500);

    return () => clearInterval(timer);
  }, [isLogin]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Absolute Ambient Blobs */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full glow-bg-blue pointer-events-none z-0" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full glow-bg-purple pointer-events-none z-0" />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 z-10 items-center">
        
        {/* LEFT COLUMN: HERO INFORMATION */}
        <div className="lg:col-span-6 hidden lg:flex flex-col gap-8 text-left select-none">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 p-2.5 rounded-2xl shadow-lg shadow-indigo-500/25">
              <Database className="w-7 h-7 text-white" />
            </div>
            <h1 className="font-sans font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white via-indigo-200 to-cyan-200 bg-clip-text text-transparent">
              DataSage AI
            </h1>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-4xl font-extrabold tracking-tight leading-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              Turn Messy Data Into Production-Ready Insights.
            </h2>
            <p className="text-slate-400 leading-relaxed text-sm">
              Smarter CSV & Excel pre-processing. Automated cleaning, outlier capping, anomaly detection, statistical analysis, and interactive report exports backed by state-of-the-art AI.
            </p>
          </div>

          {/* Interactive Bento Feature Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-4 rounded-2xl flex flex-col gap-2 border border-slate-800/40">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              <h4 className="text-sm font-bold text-slate-200">Interactive Analytics</h4>
              <p className="text-xs text-slate-400 leading-normal">Plotly-style charts, distribution summaries & skew graphs.</p>
            </div>
            <div className="glass-card p-4 rounded-2xl flex flex-col gap-2 border border-slate-800/40">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h4 className="text-sm font-bold text-slate-200">Intelligent Preprocessing</h4>
              <p className="text-xs text-slate-400 leading-normal">Smart blank fills, capping outliers & formatting date columns.</p>
            </div>
            <div className="glass-card p-4 rounded-2xl flex flex-col gap-2 border border-slate-800/40">
              <Shield className="w-5 h-5 text-cyan-400" />
              <h4 className="text-sm font-bold text-slate-200">Audit Health Score</h4>
              <p className="text-xs text-slate-400 leading-normal">Real-time data quality score from 0 to 100 on upload.</p>
            </div>
            <div className="glass-card p-4 rounded-2xl flex flex-col gap-2 border border-slate-800/40">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <h4 className="text-sm font-bold text-slate-200">Email & PDF Export</h4>
              <p className="text-xs text-slate-400 leading-normal">Send clean datasets & summary PDFs with a single click.</p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LOGIN / REGISTER CARD */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="glass-card p-8 rounded-3xl border border-slate-800/80 shadow-2xl relative"
          >
            {/* Header tab selectors */}
            <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800/60 mb-6 relative">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  isLogin ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  !isLogin ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Register
              </button>
            </div>

            {/* Welcome messages */}
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold tracking-tight text-slate-100">
                {isLogin ? 'Welcome Back' : 'Create an Account'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isLogin ? 'Access your datasets and AI co-pilots' : 'Start cleaning your messy data in seconds'}
              </p>
            </div>

            {/* Credentials Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {!isLogin && (
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs text-slate-400 font-medium">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10.5 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-900/40 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-all focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs text-slate-400 font-medium">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10.5 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-900/40 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-all focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-400 font-medium">Password</label>
                  {isLogin && (
                    <button 
                      type="button" 
                      onClick={() => addToast('Simple MVP: please type standard email/pass. Password recovery omitted for simplicity.', 'info')} 
                      className="text-[10px] text-indigo-400 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10.5 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-900/40 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-all focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {!isLogin && (
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-xs text-slate-400 font-medium">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10.5 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-900/40 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-all focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              )}

              {isLogin && (
                <div className="flex items-center justify-between text-left">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      defaultChecked 
                      className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-indigo-500 focus:ring-indigo-500/20 cursor-pointer" 
                    />
                    <span className="text-xs text-slate-400 font-medium">Remember me</span>
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 hover:opacity-95 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6 text-center select-none">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-800/80" /></div>
              <span className="relative bg-slate-950/80 px-3 text-xs text-slate-500 font-medium uppercase tracking-wider">or</span>
            </div>

            {/* Google Authentication Container */}
            <div className="flex flex-col gap-3">
              <div id="google-signin-button" className="w-full flex justify-center h-[46px] overflow-hidden rounded-xl border border-slate-800 bg-slate-900/30" />
              
              <div className="text-[10px] text-slate-500 text-center leading-normal">
                If the Google frame doesn't load or is blocked in your iframe, click below:
              </div>
              
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-indigo-500/10 bg-indigo-500/5 hover:bg-indigo-500/10 text-xs text-indigo-400 transition-colors cursor-pointer font-semibold"
              >
                ⚡ Quick Bypass Login (Demo Guest)
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
