import { FormEvent, useRef, useState } from "react";
import { ApiError } from "./api.js";
import { useAuth } from "./AuthContext.js";

type FieldName = "currentPassword" | "newPassword" | "confirmPassword";
type FieldErrors = Partial<Record<FieldName, string>>;

function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length;
}

function validateNewPassword(value: string): string | null {
  if (Array.from(value).length < 10) return "Password must be at least 10 characters";
  if (!/\p{L}/u.test(value)) return "Password must include at least one letter";
  if (!/\d/.test(value)) return "Password must include at least one number";
  if (utf8Bytes(value) > 72) return "Password must be at most 72 UTF-8 bytes";
  return null;
}

interface Props {
  mandatory: boolean;
  onDone?: () => void;
  onCancel?: () => void;
}

export default function ChangePassword({ mandatory, onDone, onCancel }: Props) {
  const { changePassword, signOut } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState<Record<FieldName, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const currentRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  function update(name: FieldName, value: string) {
    if (name === "currentPassword") setCurrentPassword(value);
    if (name === "newPassword") setNewPassword(value);
    if (name === "confirmPassword") setConfirmPassword(value);
    setErrors((current) => ({ ...current, [name]: undefined }));
    setAlert(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const next: FieldErrors = {};
    if (!currentPassword) next.currentPassword = "Current password is required";
    if (!newPassword) next.newPassword = "New password is required";
    else {
      const ruleError = validateNewPassword(newPassword);
      if (ruleError) next.newPassword = ruleError;
    }
    if (!confirmPassword) next.confirmPassword = "Confirm your new password";
    else if (newPassword !== confirmPassword) next.confirmPassword = "Passwords do not match";
    if (currentPassword && newPassword === currentPassword) next.newPassword = "New password must differ from current password";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      if (next.currentPassword) currentRef.current?.focus();
      else if (next.newPassword) newRef.current?.focus();
      else confirmRef.current?.focus();
      return;
    }

    setBusy(true);
    setAlert(null);
    try {
      await changePassword({ currentPassword, newPassword, confirmPassword });
      onDone?.();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fields) setErrors(err.fields as FieldErrors);
        if (err.code === "INVALID_CURRENT_PASSWORD") {
          setErrors((current) => ({ ...current, currentPassword: "Current password is incorrect" }));
          currentRef.current?.focus();
        } else if (err.status >= 500) {
          setAlert("Unable to change password. Please try again.");
        } else if (!err.fields) {
          setAlert(err.message);
        }
      } else {
        setAlert("Unable to change password. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  const requirements = [
    { met: Array.from(newPassword).length >= 10, text: "At least 10 characters" },
    { met: /\p{L}/u.test(newPassword), text: "Include at least one letter" },
    { met: /\d/.test(newPassword), text: "Include at least one number" },
    { met: utf8Bytes(newPassword) <= 72, text: "Maximum 72 UTF-8 bytes" },
  ];

  return (
    <div className="auth-page">
      <header className="auth-header">
        <div className="auth-header-inner">
          <div className="brand-lockup" aria-label="TokTickIT">
            <span className="brand-mark" aria-hidden="true" />
            <span>TokTickIT</span>
          </div>
          {mandatory && (
            <button type="button" className="auth-logout" disabled={busy} onClick={() => void signOut()}>
              Logout
            </button>
          )}
        </div>
      </header>

      <main className="auth-main">
        <section className="auth-card" aria-labelledby="change-password-title">
          <h1 id="change-password-title">Change Your Password</h1>
          <p className="auth-subtitle">
            {mandatory
              ? "You must change your initial password before continuing."
              : "Choose a new password for your account."}
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {([
              ["currentPassword", "Current password", currentPassword, currentRef],
              ["newPassword", "New password", newPassword, newRef],
              ["confirmPassword", "Confirm new password", confirmPassword, confirmRef],
            ] as const).map(([name, label, value, ref]) => (
              <div className="mb-3" key={name}>
                <label htmlFor={`change-${name}`} className="form-label">{label}</label>
                <div className="password-control">
                  <input
                    ref={ref}
                    id={`change-${name}`}
                    type={show[name] ? "text" : "password"}
                    autoComplete={name === "currentPassword" ? "current-password" : "new-password"}
                    className={`form-control ${errors[name] ? "is-invalid" : ""}`}
                    value={value}
                    disabled={busy}
                    onChange={(e) => update(name, e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    aria-label={show[name] ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
                    aria-pressed={show[name]}
                    disabled={busy}
                    onClick={() => setShow((current) => ({ ...current, [name]: !current[name] }))}
                  >
                    {show[name] ? "Hide" : "Show"}
                  </button>
                </div>
                {errors[name] && <div className="invalid-feedback d-block">{errors[name]}</div>}
              </div>
            ))}

            <div className="password-rules" aria-label="Password requirements">
              <strong>Password must:</strong>
              <ul>
                {requirements.map((rule) => (
                  <li key={rule.text} className={rule.met ? "met" : ""}>
                    <span aria-hidden="true">{rule.met ? "✓" : "•"}</span> {rule.text}
                  </li>
                ))}
              </ul>
            </div>

            {alert && <div className="alert alert-danger auth-alert" role="alert">{alert}</div>}

            <div className="auth-actions">
              {!mandatory && onCancel && (
                <button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={onCancel}>Cancel</button>
              )}
              <button type="submit" className="btn btn-success auth-primary" disabled={busy}>
                {busy ? (
                  <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Saving…</>
                ) : mandatory ? "Continue" : "Save Password"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
