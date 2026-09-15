import { FormEvent, useRef, useState } from "react";
import { ApiError } from "./api.js";
import { useAuth } from "./AuthContext.js";

type FieldErrors = { email?: string; password?: string };

function isEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function Login() {
  const { signIn, bootstrapError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState<string | null>(bootstrapError);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const normalized = email.trim();
    const next: FieldErrors = {};
    if (!normalized) next.email = "Email address is required";
    else if (!isEmail(normalized)) next.email = "Enter a valid email address";
    if (!password) next.password = "Password is required";
    setFieldErrors(next);
    setAlert(null);
    if (Object.keys(next).length > 0) {
      if (next.email) emailRef.current?.focus();
      else passwordRef.current?.focus();
      return;
    }

    setBusy(true);
    try {
      await signIn(normalized, password);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields) setFieldErrors(err.fields);
        if (err.code === "INVALID_CREDENTIALS") {
          setAlert("Email or password is incorrect.");
        } else if (err.code === "ACCOUNT_INACTIVE") {
          setAlert("This account cannot sign in. Contact an administrator.");
        } else if (err.code === "LOGIN_RATE_LIMITED") {
          setAlert("Too many sign-in attempts. Please wait and try again.");
        } else if (err.status >= 500) {
          setAlert("Unable to connect to TokTickIT. Please try again.");
        } else {
          setAlert(err.message);
        }
      } else {
        setAlert("Unable to connect to TokTickIT. Please try again.");
      }
      setPassword("");
      passwordRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <header className="auth-header">
        <div className="auth-header-inner">
          <div className="brand-lockup" aria-label="TokTickIT">
            <span className="brand-mark" aria-hidden="true" />
            <span>TokTickIT</span>
          </div>
        </div>
      </header>

      <main className="auth-main">
        <section className="auth-card" aria-labelledby="login-title">
          <h1 id="login-title">Sign in to your account</h1>
          <p className="auth-subtitle">Enter your credentials to access TokTickIT.</p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="login-email" className="form-label">Email address</label>
              <input
                ref={emailRef}
                id="login-email"
                type="email"
                autoComplete="username"
                className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`}
                value={email}
                disabled={busy}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((current) => ({ ...current, email: undefined }));
                  setAlert(null);
                }}
              />
              {fieldErrors.email && <div className="invalid-feedback d-block">{fieldErrors.email}</div>}
            </div>

            <div className="mb-3">
              <label htmlFor="login-password" className="form-label">Password</label>
              <div className="password-control">
                <input
                  ref={passwordRef}
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className={`form-control ${fieldErrors.password ? "is-invalid" : ""}`}
                  value={password}
                  disabled={busy}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((current) => ({ ...current, password: undefined }));
                    setAlert(null);
                  }}
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  disabled={busy}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {fieldErrors.password && <div className="invalid-feedback d-block">{fieldErrors.password}</div>}
            </div>

            {alert && <div className="alert alert-danger auth-alert" role="alert">{alert}</div>}

            <button type="submit" className="btn btn-success auth-primary" disabled={busy}>
              {busy ? (
                <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Signing in…</>
              ) : "Sign In"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
