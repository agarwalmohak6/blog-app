// =============================================================================
// pages/Login.jsx — Login & Register Page (Premium UI)
// =============================================================================
import { useState, useId } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Navigate } from "react-router-dom";
import {
  loginUser,
  registerUser,
  selectAuthLoading,
  selectAuthError,
  selectIsLoggedIn,
  clearAuthError,
} from "../features/auth/authSlice";

// Eye icons as inline SVG (no dependency needed)
const EyeOpen = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeClosed = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

export default function Login() {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const loading    = useSelector(selectAuthLoading);
  const authError  = useSelector(selectAuthError);

  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email:    "",
    password: "",
    bio:      "",
  });

  const emailId    = useId();
  const passwordId = useId();
  const usernameId = useId();

  if (isLoggedIn) return <Navigate to="/" replace />;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (authError) dispatch(clearAuthError());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (mode === "login") {
        await dispatch(loginUser({ email: formData.email, password: formData.password })).unwrap();
      } else {
        await dispatch(registerUser(formData)).unwrap();
      }
      navigate("/");
    } catch {
      // Handled by Redux authError state
    }
  };

  const switchMode = () => {
    setMode((m) => m === "login" ? "register" : "login");
    setShowPassword(false);
    dispatch(clearAuthError());
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Card icon */}
        <div className="auth-card__icon">✍️</div>

        <h1 className="auth-card__title">
          {mode === "login" ? "Welcome back" : "Join the blog"}
        </h1>
        <p className="auth-card__subtitle">
          {mode === "login"
            ? "Sign in to bookmark posts and leave comments."
            : "Create your account in seconds."}
        </p>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>

          {/* Register-only fields */}
          {mode === "register" && (
            <>
              <div className="form-group">
                <label htmlFor={usernameId}>Username</label>
                <input
                  id={usernameId}
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="yourname"
                  autoComplete="username"
                  required
                  minLength={3}
                  maxLength={50}
                />
              </div>

              <div className="form-group">
                <label htmlFor={`${usernameId}-bio`}>Bio <span style={{fontWeight:400,color:'var(--color-text-muted)'}}>— optional</span></label>
                <textarea
                  id={`${usernameId}-bio`}
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Tell us about yourself..."
                  rows={2}
                  maxLength={500}
                />
              </div>
            </>
          )}

          {/* Email */}
          <div className="form-group">
            <label htmlFor={emailId}>Email</label>
            <input
              id={emailId}
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          {/* Password with eye toggle */}
          <div className="form-group">
            <label htmlFor={passwordId}>Password</label>
            {/* Wrapper div for the eye icon positioning */}
            <div className="form-group--password">
              <input
                id={passwordId}
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={mode === "register" ? "At least 8 characters" : "Enter your password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={mode === "register" ? 8 : undefined}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeClosed /> : <EyeOpen />}
              </button>
            </div>
          </div>

          {/* Error message */}
          {authError && (
            <p className="auth-form__error" role="alert">
              ⚠️ {authError}
            </p>
          )}

          <button
            type="submit"
            className="btn btn--primary btn--full"
            style={{ padding: '0.75rem', fontSize: '0.95rem', marginTop: '0.25rem' }}
            disabled={loading}
          >
            {loading
              ? (mode === "login" ? "Signing in..." : "Creating account...")
              : mode === "login" ? "Sign In" : "Create Account"
            }
          </button>
        </form>

        <p className="auth-card__switch">
          {mode === "login" ? "New here? " : "Already have an account? "}
          <button type="button" className="link-btn" onClick={switchMode}>
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
