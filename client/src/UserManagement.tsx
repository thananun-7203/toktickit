import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AdminUser,
  ApiError,
  createAdminUser,
  getAdminUsers,
  setAdminInitialPassword,
  updateAdminUser,
  UserRole,
} from "./api.js";

interface Props {
  currentUserId: number;
}

const ROLES: UserRole[] = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"];

type LoadState = "loading" | "success" | "error";
type UserForm = {
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
};

function roleLabel(role: UserRole): string {
  if (role === "IT_STAFF") return "IT Staff";
  if (role === "ADMINISTRATOR") return "Administrator";
  return "Requester";
}

function roleToken(role: UserRole): string {
  return role.toLowerCase().replace("_", "-");
}

function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length;
}

function validatePassword(value: string): string | null {
  if ([...value].length < 10) return "Password must be at least 10 characters.";
  if (!/\p{L}/u.test(value)) return "Password must include at least one letter.";
  if (!/\p{Nd}/u.test(value)) return "Password must include at least one digit.";
  if (utf8Bytes(value) > 72) return "Password must be at most 72 UTF-8 bytes.";
  return null;
}

function safeFailure(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  if (error.code === "SELF_DEACTIVATION_FORBIDDEN") return "You cannot deactivate your own Administrator account.";
  if (error.code === "LAST_ACTIVE_ADMIN_REQUIRED") return "At least one active Administrator is required. Activate or create another Administrator first.";
  if (error.code === "ASSIGNED_TICKETS_REQUIRE_REASSIGNMENT") return "Reassign this user's tickets before deactivating the account or changing the role to Requester.";
  if (error.code === "STALE_USER_STATE") return "This user changed while you were editing. Refresh the list and try again.";
  if (error.code === "DUPLICATE_EMAIL") return "A user with this email already exists.";
  if (error.status === 403) return "You do not have permission to manage users.";
  if (error.status >= 500) return fallback;
  return error.message || fallback;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const dialogElement = dialog;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableSelector = [
      "button:not([disabled])",
      "[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      '[tabindex]:not([tabindex="-1"]):not([disabled])',
    ].join(",");

    const explicit = dialogElement.querySelector<HTMLElement>("[data-autofocus]");
    const first = dialogElement.querySelector<HTMLElement>(focusableSelector);
    (explicit ?? first ?? dialogElement).focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(dialogElement.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) {
        event.preventDefault();
        dialogElement.focus();
        return;
      }

      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (!event.shiftKey && document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    }

    dialogElement.addEventListener("keydown", handleKeyDown);
    return () => {
      dialogElement.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, []);

  return (
    <div className="admin-modal-backdrop" role="presentation">
      <section ref={dialogRef} tabIndex={-1} className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-modal-title">
        <div className="admin-modal-header">
          <h2 id="admin-modal-title">{title}</h2>
          <button type="button" className="admin-modal-close" aria-label={`Close ${title}`} onClick={onClose}>×</button>
        </div>
        {children}
      </section>
    </div>
  );
}

function UserFields({
  form,
  setForm,
  errors,
}: {
  form: UserForm;
  setForm: (next: UserForm) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="admin-form-grid">
      <label>
        <span>Name <span aria-hidden="true">*</span></span>
        <input data-autofocus className={`form-control ${errors.name ? "is-invalid" : ""}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        {errors.name && <span className="admin-field-error">{errors.name}</span>}
      </label>
      <label>
        <span>Email <span aria-hidden="true">*</span></span>
        <input className={`form-control ${errors.email ? "is-invalid" : ""}`} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        {errors.email && <span className="admin-field-error">{errors.email}</span>}
      </label>
      <label>
        <span>Role <span aria-hidden="true">*</span></span>
        <select className={`form-select ${errors.role ? "is-invalid" : ""}`} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
          {ROLES.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
        </select>
        {errors.role && <span className="admin-field-error">{errors.role}</span>}
      </label>
      <label>
        Status
        <select className="form-select" value={form.isActive ? "active" : "inactive"} onChange={(e) => setForm({ ...form, isActive: e.target.value === "active" })}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </label>
    </div>
  );
}

export default function UserManagement({ currentUserId }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [reloadKey, setReloadKey] = useState(0);
  const [success, setSuccess] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<UserForm>({ name: "", email: "", role: "REQUESTER", isActive: true });
  const [createPassword, setCreatePassword] = useState("");
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState<UserForm>({ name: "", email: "", role: "REQUESTER", isActive: true });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const [passwordUser, setPasswordUser] = useState<AdminUser | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordBusy, setPasswordBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadState("loading");
    setLoadError(null);
    getAdminUsers({ search: search || undefined, role: role || undefined })
      .then((items) => {
        if (!active) return;
        setUsers(items);
        setLoadState("success");
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(safeFailure(error, "Unable to load users. Please try again."));
        setLoadState("error");
      });
    return () => { active = false; };
  }, [search, role, reloadKey]);

  const hasFilters = useMemo(() => Boolean(search || role), [search, role]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const value = searchDraft.trim();
    if ([...value].length > 100) {
      setLoadError("Search must be at most 100 characters.");
      return;
    }
    setSearch(value);
  }

  function clearFilters() {
    setSearchDraft("");
    setSearch("");
    setRole("");
  }

  function openCreate() {
    setCreateForm({ name: "", email: "", role: "REQUESTER", isActive: true });
    setCreatePassword("");
    setCreateErrors({});
    setCreateError(null);
    setCreateOpen(true);
  }

  function openEdit(user: AdminUser) {
    setEditing(user);
    setEditForm({ name: user.name, email: user.email, role: user.role, isActive: user.isActive });
    setEditErrors({});
    setEditError(null);
    setConfirmDeactivate(false);
  }

  function validateBasic(form: UserForm): Record<string, string> {
    const errors: Record<string, string> = {};
    const name = form.name.trim();
    if (!name || [...name].length > 100) errors.name = "Name must be between 1 and 100 characters.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = "A valid email is required.";
    return errors;
  }

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    const errors = validateBasic(createForm);
    const passwordIssue = validatePassword(createPassword);
    if (passwordIssue) errors.initialPassword = passwordIssue;
    if (Object.keys(errors).length) {
      setCreateErrors(errors);
      return;
    }
    setCreateBusy(true);
    setCreateErrors({});
    setCreateError(null);
    try {
      await createAdminUser({ ...createForm, name: createForm.name.trim(), email: createForm.email.trim(), initialPassword: createPassword });
      setCreateOpen(false);
      setSuccess("User created successfully. The user must change the initial password after signing in.");
      setReloadKey((value) => value + 1);
    } catch (error) {
      if (error instanceof ApiError && error.fields) setCreateErrors(error.fields);
      setCreateError(safeFailure(error, "Unable to create user."));
    } finally {
      setCreateBusy(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    if (editing.id === currentUserId && !editForm.isActive) {
      setEditError("You cannot deactivate your own Administrator account.");
      setConfirmDeactivate(false);
      return;
    }
    const errors = validateBasic(editForm);
    if (Object.keys(errors).length) {
      setEditErrors(errors);
      setConfirmDeactivate(false);
      return;
    }
    setEditBusy(true);
    setEditError(null);
    setEditErrors({});
    try {
      await updateAdminUser(editing.id, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
        isActive: editForm.isActive,
      });
      setEditing(null);
      setConfirmDeactivate(false);
      setSuccess("User changes saved successfully.");
      setReloadKey((value) => value + 1);
    } catch (error) {
      if (error instanceof ApiError && error.fields) setEditErrors(error.fields);
      setEditError(safeFailure(error, "Unable to save user changes."));
      setConfirmDeactivate(false);
    } finally {
      setEditBusy(false);
    }
  }

  function submitEdit(event: FormEvent) {
    event.preventDefault();
    if (editing?.isActive && !editForm.isActive) {
      if (editing.id === currentUserId) {
        setEditError("You cannot deactivate your own Administrator account.");
        return;
      }
      setConfirmDeactivate(true);
      return;
    }
    void saveEdit();
  }

  function openPassword(user: AdminUser) {
    setPasswordUser(user);
    setPassword("");
    setConfirmPassword("");
    setPasswordErrors({});
    setPasswordError(null);
  }

  async function submitPassword(event: FormEvent) {
    event.preventDefault();
    if (!passwordUser) return;
    const errors: Record<string, string> = {};
    const issue = validatePassword(password);
    if (issue) errors.initialPassword = issue;
    if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match.";
    if (Object.keys(errors).length) {
      setPasswordErrors(errors);
      return;
    }
    setPasswordBusy(true);
    setPasswordErrors({});
    setPasswordError(null);
    try {
      await setAdminInitialPassword(passwordUser.id, password, confirmPassword);
      setPasswordUser(null);
      setSuccess("New initial password saved. Existing sessions were ended and a password change will be required at next sign-in.");
      setReloadKey((value) => value + 1);
    } catch (error) {
      if (error instanceof ApiError && error.fields) setPasswordErrors(error.fields);
      setPasswordError(safeFailure(error, "Unable to set the initial password."));
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <section className="zen-card content-card admin-users-page" aria-labelledby="admin-users-title">
      <div className="admin-users-heading">
        <div>
          <h1 id="admin-users-title" className="page-title">User Management</h1>
          <p className="page-subtitle">Manage system users, roles, activation, and initial passwords.</p>
        </div>
        <div className="admin-heading-actions">
          {loadState === "success" && <span className="admin-user-count">{users.length} users</span>}
          <button type="button" className="btn btn-success" onClick={openCreate}>+ Create User</button>
        </div>
      </div>

      {success && <div className="alert alert-success" role="status">{success}<button type="button" className="btn-close" aria-label="Dismiss success message" onClick={() => setSuccess(null)} /></div>}

      <form className="admin-user-search" onSubmit={submitSearch}>
        <label htmlFor="admin-user-search">Search</label>
        <div className="input-group">
          <input id="admin-user-search" className="form-control" value={searchDraft} placeholder="Name or email" onChange={(e) => setSearchDraft(e.target.value)} />
          <button className="btn btn-success" type="submit">Search</button>
        </div>
      </form>

      <div className="admin-user-filters" aria-label="User Management filters">
        <label>Role
          <select aria-label="Role filter" className="form-select" value={role} onChange={(e) => setRole(e.target.value as UserRole | "")}>
            <option value="">All roles</option>
            {ROLES.map((item) => <option key={item} value={item}>{roleLabel(item)}</option>)}
          </select>
        </label>
        <div className="admin-filter-action"><button type="button" className="btn btn-outline-secondary" disabled={!hasFilters} onClick={clearFilters}>Clear filters</button></div>
      </div>

      {loadState === "loading" && <div className="admin-users-state" role="status"><span className="spinner-border spinner-border-sm" aria-hidden="true" /> Loading users…</div>}
      {loadState === "error" && <div className="alert alert-danger admin-users-state" role="alert"><span>{loadError}</span><button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setReloadKey((value) => value + 1)}>Retry</button></div>}
      {loadState === "success" && users.length === 0 && (
        <div className="admin-users-empty"><h2>{hasFilters ? "No results" : "No users"}</h2><p>{hasFilters ? "No users match the current search or role filter." : "No users are available."}</p>{hasFilters && <button type="button" className="btn btn-outline-success" onClick={clearFilters}>Clear filters</button>}</div>
      )}

      {loadState === "success" && users.length > 0 && (
        <>
          <div className="admin-users-table-wrap">
            <table className="admin-users-table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th><span className="visually-hidden">Action</span></th></tr></thead>
              <tbody>{users.map((user) => (
                <tr key={user.id}>
                  <td><strong>{user.name}</strong>{user.id === currentUserId && <small>You</small>}</td>
                  <td>{user.email}</td>
                  <td><span className={`admin-role-badge role-${roleToken(user.role)}`}>{roleLabel(user.role)}</span></td>
                  <td><span className={`admin-status-badge ${user.isActive ? "active" : "inactive"}`}>{user.isActive ? "Active" : "Inactive"}</span>{user.mustChangePassword && <small>Password change required</small>}</td>
                  <td><button type="button" className="btn btn-sm btn-outline-success" aria-label={`Edit ${user.name}`} onClick={() => openEdit(user)}>Edit</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="admin-users-cards">{users.map((user) => (
            <article className="admin-user-card" key={user.id}>
              <div className="admin-user-card-top"><strong>{user.name}</strong><span className={`admin-status-badge ${user.isActive ? "active" : "inactive"}`}>{user.isActive ? "Active" : "Inactive"}</span></div>
              <p>{user.email}</p>
              <span className={`admin-role-badge role-${roleToken(user.role)}`}>{roleLabel(user.role)}</span>
              {user.mustChangePassword && <small>Password change required</small>}
              <button type="button" className="btn btn-outline-success w-100" onClick={() => openEdit(user)}>Edit User</button>
            </article>
          ))}</div>
        </>
      )}

      {createOpen && (
        <Modal title="Create User" onClose={() => !createBusy && setCreateOpen(false)}>
          <form onSubmit={submitCreate}>
            <div className="admin-modal-body">
              {createError && <div className="alert alert-danger" role="alert">{createError}</div>}
              <UserFields form={createForm} setForm={setCreateForm} errors={createErrors} />
              <label className="admin-password-field"><span>Initial Password <span aria-hidden="true">*</span></span>
                <input type="password" className={`form-control ${createErrors.initialPassword ? "is-invalid" : ""}`} value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} />
                {createErrors.initialPassword && <span className="admin-field-error">{createErrors.initialPassword}</span>}
              </label>
              <div className="admin-password-note">The user must change this password after the next sign-in. Use at least 10 characters with a letter and a digit; maximum 72 UTF-8 bytes.</div>
            </div>
            <div className="admin-modal-footer"><button type="button" className="btn btn-outline-secondary" disabled={createBusy} onClick={() => setCreateOpen(false)}>Cancel</button><button className="btn btn-success" disabled={createBusy}>{createBusy ? "Creating…" : "Create User"}</button></div>
          </form>
        </Modal>
      )}

      {editing && !confirmDeactivate && (
        <Modal title="Edit User" onClose={() => !editBusy && setEditing(null)}>
          <form onSubmit={submitEdit}>
            <div className="admin-modal-body">
              {editError && <div className="alert alert-danger" role="alert">{editError}</div>}
              <UserFields form={editForm} setForm={setEditForm} errors={editErrors} />
              {editing.id === currentUserId && <div className="admin-safety-note">Your own Administrator account cannot be deactivated.</div>}
              <button type="button" className="btn btn-outline-success admin-password-action" onClick={() => { const target = editing; setEditing(null); openPassword(target); }}>Set New Initial Password</button>
            </div>
            <div className="admin-modal-footer"><button type="button" className="btn btn-outline-secondary" disabled={editBusy} onClick={() => setEditing(null)}>Cancel</button><button className="btn btn-success" disabled={editBusy}>{editBusy ? "Saving…" : "Save Changes"}</button></div>
          </form>
        </Modal>
      )}

      {editing && confirmDeactivate && (
        <Modal title="Deactivate User" onClose={() => !editBusy && setConfirmDeactivate(false)}>
          <div className="admin-modal-body">
            <div className="admin-danger-copy"><strong>Deactivate {editing.name}?</strong><p>The user will no longer be able to sign in. If this user owns tickets, the operation will be blocked until those tickets are reassigned.</p></div>
          </div>
          <div className="admin-modal-footer"><button data-autofocus type="button" className="btn btn-outline-secondary" disabled={editBusy} onClick={() => setConfirmDeactivate(false)}>Cancel</button><button type="button" className="btn btn-danger" disabled={editBusy} onClick={() => void saveEdit()}>{editBusy ? "Deactivating…" : "Deactivate User"}</button></div>
        </Modal>
      )}

      {passwordUser && (
        <Modal title="Set Initial Password" onClose={() => !passwordBusy && setPasswordUser(null)}>
          <form onSubmit={submitPassword}>
            <div className="admin-modal-body">
              <p className="admin-modal-intro">Set a new initial password for <strong>{passwordUser.name}</strong>.</p>
              {passwordError && <div className="alert alert-danger" role="alert">{passwordError}</div>}
              <div className="admin-password-note">Existing sessions will end. The user must change this password after the next sign-in.</div>
              <label className="admin-password-field"><span>New Initial Password <span aria-hidden="true">*</span></span><input data-autofocus type="password" className={`form-control ${passwordErrors.initialPassword ? "is-invalid" : ""}`} value={password} onChange={(e) => setPassword(e.target.value)} />{passwordErrors.initialPassword && <span className="admin-field-error">{passwordErrors.initialPassword}</span>}</label>
              <label className="admin-password-field"><span>Confirm Password <span aria-hidden="true">*</span></span><input type="password" className={`form-control ${passwordErrors.confirmPassword ? "is-invalid" : ""}`} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />{passwordErrors.confirmPassword && <span className="admin-field-error">{passwordErrors.confirmPassword}</span>}</label>
            </div>
            <div className="admin-modal-footer"><button type="button" className="btn btn-outline-secondary" disabled={passwordBusy} onClick={() => setPasswordUser(null)}>Cancel</button><button className="btn btn-success" disabled={passwordBusy}>{passwordBusy ? "Saving…" : "Set Password"}</button></div>
          </form>
        </Modal>
      )}
    </section>
  );
}
