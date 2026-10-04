import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionTaken,
  ActionTakenStatus,
  ApiError,
  completeStaffActionFollowUp,
  createStaffActionTaken,
  getActionsTaken,
  StaffAssignee,
  updateStaffActionStatus,
  updateStaffActionTaken,
} from "./api.js";

type PanelState = "loading" | "success" | "error";
type DialogState =
  | { type: "create" }
  | { type: "edit"; action: ActionTaken }
  | { type: "reassign"; action: ActionTaken }
  | { type: "complete"; action: ActionTaken }
  | { type: "cancel"; action: ActionTaken }
  | null;

interface Props {
  ticketId: number;
  ticketStatus: string;
  ticketVersion: number;
  currentUserId?: number;
  assignees?: StaffAssignee[];
  readOnly?: boolean;
  onTicketVersionChange?: (version: number) => void;
  onRefreshTicket?: () => Promise<number | void> | number | void;
}

const ACTIVE_TICKET_STATUSES = new Set(["New", "Open", "In Progress", "Waiting for Requester", "Reopened"]);
const ACTIVE_ACTION_STATUSES = new Set<ActionTakenStatus>(["Planned", "In Progress"]);
const MAX_TEXT = 2000;

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function localInputValue(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function codePoints(value: string): number {
  return Array.from(value).length;
}

function focusFirstInvalidField(): void {
  window.setTimeout(() => {
    document.querySelector<HTMLElement>(".action-modal .is-invalid")?.focus();
  }, 0);
}

function newClientRequestId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    return (char === "x" ? value : (value & 0x3) | 0x8).toString(16);
  });
}

function statusClass(status: ActionTakenStatus): string {
  return `action-status-${status.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function actionErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "STALE_ACTION_TAKEN") return "This Action changed after you opened it. Refresh current data before retrying.";
    if (error.code === "STALE_TICKET_STATE") return "The Ticket changed after this screen loaded. Refresh current data before retrying.";
    if (error.code === "ACTION_ASSIGNEE_NOT_ELIGIBLE") return "That assignee is no longer eligible. Refresh and choose an active IT Staff or Administrator.";
    if (error.code === "ACTION_COMPLETION_REQUIRES_ASSIGNEE") return "Only the current assignee can complete this Action. Reassign it first if needed.";
    if (error.code === "ACTION_NOT_EDITABLE") return "This Action is already terminal and can no longer be edited.";
    if (error.code === "IDEMPOTENCY_KEY_REUSE") return "This Action submission key no longer matches the original draft. Start a new Action form before submitting different work.";
    if (error.code === "FOLLOW_UP_NOT_OUTSTANDING") return "This follow-up is no longer outstanding. Refresh the current Action state before trying again.";
  }
  return error instanceof Error ? error.message : "Unable to update Action Taken";
}

export default function ActionsTakenPanel({
  ticketId,
  ticketStatus,
  ticketVersion,
  currentUserId,
  assignees = [],
  readOnly = false,
  onTicketVersionChange,
  onRefreshTicket,
}: Props) {
  const [state, setState] = useState<PanelState>("loading");
  const [actions, setActions] = useState<ActionTaken[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyActionId, setBusyActionId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const ticketVersionRef = useRef(ticketVersion);

  useEffect(() => { ticketVersionRef.current = ticketVersion; }, [ticketVersion]);

  const loadActions = useCallback(async (): Promise<ActionTaken[] | null> => {
    setState("loading");
    setError(null);
    try {
      const loaded = await getActionsTaken(ticketId);
      setActions(loaded);
      setState("success");
      return loaded;
    } catch (loadError) {
      setState("error");
      setError(actionErrorMessage(loadError));
      return null;
    }
  }, [ticketId]);

  useEffect(() => { void loadActions(); }, [loadActions]);

  async function refreshAll() {
    setNotice(null);
    let loaded: ActionTaken[] | null = null;
    try {
      [loaded] = await Promise.all([loadActions(), Promise.resolve(onRefreshTicket?.())]);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? "Unable to refresh current Ticket state." : "Unable to refresh current Ticket state.");
      return;
    }
    if (!loaded) return;
    setDialog((current) => {
      if (!current || current.type === "create") return current;
      const refreshed = loaded.find((item) => item.id === current.action.id);
      return refreshed ? { ...current, action: refreshed } : current;
    });
  }

  function replaceAction(updated: ActionTaken) {
    setActions((current) => current
      .map((item) => item.id === updated.id ? updated : item)
      .sort((a, b) => {
        const time = new Date(b.actionDateTime).getTime() - new Date(a.actionDateTime).getTime();
        return time || b.id - a.id;
      }));
  }

  async function syncTicketVersionAfterMutation(): Promise<void> {
    const refreshedVersion = await onRefreshTicket?.();
    if (typeof refreshedVersion === "number") {
      ticketVersionRef.current = refreshedVersion;
      onTicketVersionChange?.(refreshedVersion);
      return;
    }
    throw new Error("Unable to refresh current Ticket state.");
  }

  async function transition(action: ActionTaken, status: "In Progress") {
    setBusyActionId(action.id);
    setError(null);
    setNotice(null);
    try {
      const updated = await updateStaffActionStatus(action.id, {
        status,
        expectedVersion: action.version,
        expectedTicketVersion: ticketVersionRef.current,
      });
      replaceAction(updated);
      await syncTicketVersionAfterMutation();
      setNotice(`Action moved to ${status}.`);
    } catch (transitionError) {
      setError(transitionError instanceof Error && transitionError.message === "Unable to refresh current Ticket state."
        ? transitionError.message
        : actionErrorMessage(transitionError));
    } finally {
      setBusyActionId(null);
    }
  }

  async function completeFollowUp(action: ActionTaken) {
    setBusyActionId(action.id);
    setError(null);
    setNotice(null);
    try {
      const updated = await completeStaffActionFollowUp(action.id, action.version, ticketVersionRef.current);
      replaceAction(updated);
      await syncTicketVersionAfterMutation();
      setNotice("Follow-up marked as completed.");
    } catch (followUpError) {
      setError(actionErrorMessage(followUpError));
    } finally {
      setBusyActionId(null);
    }
  }

  const canAdd = !readOnly && ACTIVE_TICKET_STATUSES.has(ticketStatus);
  const currentWorkflowCycle = actions.reduce((max, action) => Math.max(max, action.workflowCycle), 0);
  const currentCycleActions = actions.filter((action) => action.workflowCycle === currentWorkflowCycle);
  const hasCompletedWithResult = currentCycleActions.some((action) => action.status === "Completed" && Boolean(action.result?.trim()));
  const hasActiveActions = currentCycleActions.some((action) => action.status === "Planned" || action.status === "In Progress");
  const hasOutstandingFollowUp = currentCycleActions.some((action) => action.status !== "Cancelled" && action.followUpStatus === "OUTSTANDING");
  const resolutionBlocked = !hasCompletedWithResult || hasActiveActions || hasOutstandingFollowUp;

  return (
    <section className="actions-panel" aria-labelledby={`actions-taken-title-${ticketId}`}>
      <div className="actions-panel-header">
        <div>
          <div className="actions-title-row">
            <h2 id={`actions-taken-title-${ticketId}`}>Actions Taken</h2>
            <span className="actions-count" aria-label={`${actions.length} Actions`}>{actions.length}</span>
          </div>
          <p>{readOnly ? "Read the work recorded by support for this Ticket." : "Track operational work performed on this Ticket."}</p>
        </div>
        {canAdd && (
          <button type="button" className="btn btn-success actions-add-button" onClick={() => { setNotice(null); setDialog({ type: "create" }); }}>
            <span aria-hidden="true">＋</span> Add Action
          </button>
        )}
      </div>

      {!readOnly && !ACTIVE_TICKET_STATUSES.has(ticketStatus) && (
        <div className="actions-terminal-ticket-note" role="status">
          New Actions cannot be added while this Ticket is {ticketStatus}.
        </div>
      )}
      {!readOnly && ticketStatus !== "Resolved" && ticketStatus !== "Closed" && (
        <section className={`actions-resolution-gate ${resolutionBlocked ? "is-blocked" : "is-ready"}`} aria-labelledby={`resolution-gate-title-${ticketId}`}>
          <div className="actions-resolution-gate-heading">
            <div>
              <h3 id={`resolution-gate-title-${ticketId}`}>Resolution Gate</h3>
              <p>{resolutionBlocked ? "Resolve is blocked until all current-cycle requirements pass." : "All current-cycle Resolution Gate requirements are satisfied."}</p>
            </div>
            <span className="actions-resolution-gate-state">{resolutionBlocked ? "Blocked" : "Ready"}</span>
          </div>
          <ul>
            <li className={hasCompletedWithResult ? "pass" : "blocked"}>{hasCompletedWithResult ? "✓" : "!"} Current-cycle Completed Action with non-blank Result</li>
            <li className={!hasActiveActions ? "pass" : "blocked"}>{!hasActiveActions ? "✓" : "!"} No current-cycle Planned / In Progress Actions</li>
            <li className={!hasOutstandingFollowUp ? "pass" : "blocked"}>{!hasOutstandingFollowUp ? "✓" : "!"} No current-cycle outstanding follow-up</li>
          </ul>
        </section>
      )}
      {error && (
        <div className="actions-feedback actions-feedback-error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => void refreshAll()}>Refresh</button>
        </div>
      )}
      {notice && <div className="actions-feedback actions-feedback-success" role="status">✓ {notice}</div>}

      {state === "loading" ? (
        <div className="actions-state" role="status"><span className="spinner-border spinner-border-sm" aria-hidden="true" /> Loading Actions Taken…</div>
      ) : state === "error" ? (
        <div className="actions-state actions-state-error">
          <span>Unable to load Actions Taken.</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => void loadActions()}>Retry</button>
        </div>
      ) : actions.length === 0 ? (
        <div className="actions-empty">
          <div className="actions-empty-icon" aria-hidden="true">▤</div>
          <strong>No Actions Taken have been recorded for this Ticket yet.</strong>
          <span>{readOnly ? "Support work will appear here when it is recorded." : "Add the first Action to start tracking the work performed on this Ticket."}</span>
          {canAdd && <button type="button" className="btn btn-success btn-sm" onClick={() => setDialog({ type: "create" })}>＋ Add Action</button>}
        </div>
      ) : (
        <div className="actions-list">
          {actions.map((action) => {
            const active = ACTIVE_ACTION_STATUSES.has(action.status);
            const isAssignee = currentUserId === action.assignee.id;
            const ticketActionable = ACTIVE_TICKET_STATUSES.has(ticketStatus);
            return (
              <article key={action.id} className={`action-card ${statusClass(action.status)}`}>
                <div className="action-card-top">
                  <div className="action-card-heading">
                    <span className={`action-status-badge ${statusClass(action.status)}`}>{action.status}</span>
                    <time dateTime={action.actionDateTime}>{formatDateTime(action.actionDateTime)}</time>
                    <h3>{action.description}</h3>
                    <span className="action-business-time-help">Action Date/Time — when the work actually occurred</span>
                  </div>
                  {!readOnly && active && ticketActionable && (
                    <div className="action-card-controls" aria-label={`Controls for Action ${action.id}`}>
                      <button type="button" className="btn btn-sm btn-outline-secondary" disabled={busyActionId === action.id} onClick={() => setDialog({ type: "edit", action })}>Edit</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" disabled={busyActionId === action.id} onClick={() => setDialog({ type: "reassign", action })}>Reassign</button>
                      {action.status === "Planned" && <button type="button" className="btn btn-sm btn-outline-success" disabled={busyActionId === action.id} onClick={() => void transition(action, "In Progress")}>Start</button>}
                      {isAssignee ? (
                        <button type="button" className="btn btn-sm btn-success" disabled={busyActionId === action.id} onClick={() => setDialog({ type: "complete", action })}>Complete</button>
                      ) : (
                        <span className="action-assignee-only" title="Reassign this Action before completing it">Assignee completes</span>
                      )}
                      <button type="button" className="btn btn-sm btn-outline-danger" disabled={busyActionId === action.id} onClick={() => setDialog({ type: "cancel", action })}>Cancel</button>
                    </div>
                  )}
                  {!readOnly && active && !ticketActionable && (
                    <span className="action-terminal-ticket-control-note" role="status">Reopen Ticket before changing this Action.</span>
                  )}
                </div>

                <dl className="action-details-grid">
                  <div><dt>Assignee</dt><dd>{action.assignee.name}<small>{action.assignee.role.replace("_", " ")}</small></dd></div>
                  <div><dt>Result</dt><dd>{action.result ?? "Not recorded yet"}</dd></div>
                  <div><dt>Follow-Up Required</dt><dd><span className={`action-yes-no ${action.followUpRequired ? "yes" : "no"}`}>{action.followUpRequired ? "Yes" : "No"}</span></dd></div>
                  {action.followUpRequired && <div><dt>Follow-up Note</dt><dd>{action.followUpNote ?? "Not recorded"}</dd></div>}
                  {action.followUpRequired && (
                    <div><dt>Follow-Up Status</dt><dd><span className={`action-follow-up-badge ${action.followUpStatus.toLowerCase()}`}>
                      {action.followUpStatus === "NOT_REQUIRED" ? "Not required" : action.followUpStatus === "OUTSTANDING" ? "Outstanding" : "Completed"}
                    </span></dd></div>
                  )}
                  {action.followUpStatus === "COMPLETED" && (
                    <>
                      <div><dt>Follow-up completed by</dt><dd>{action.followUpCompletedBy?.name ?? "Not recorded"}</dd></div>
                      <div><dt>Follow-up completed at</dt><dd>{action.followUpCompletedAt ? formatDateTime(action.followUpCompletedAt) : "Not recorded"}</dd></div>
                    </>
                  )}
                  {action.attachmentNotes && <div className="action-detail-wide"><dt>Attachment Notes</dt><dd>{action.attachmentNotes}</dd></div>}
                  {action.status === "Completed" && (
                    <>
                      <div><dt>Performed by</dt><dd>{action.performedBy?.name ?? "Not recorded"}</dd></div>
                      <div><dt>Completed at</dt><dd>{action.completedAt ? formatDateTime(action.completedAt) : "Not recorded"}</dd></div>
                    </>
                  )}
                  {action.status === "Cancelled" && (
                    <>
                      <div><dt>Cancelled by</dt><dd>{action.cancelledBy?.name ?? "Not recorded"}</dd></div>
                      <div><dt>Cancelled at</dt><dd>{action.cancelledAt ? formatDateTime(action.cancelledAt) : "Not recorded"}</dd></div>
                    </>
                  )}
                </dl>

                {!readOnly && action.status === "Completed" && action.followUpStatus === "OUTSTANDING" && ticketActionable && (
                  <div className="action-follow-up-control">
                    <div><strong>Required follow-up is still outstanding.</strong><span>Complete it before resolving this Ticket.</span></div>
                    <button type="button" className="btn btn-success btn-sm" disabled={busyActionId === action.id} onClick={() => void completeFollowUp(action)}>
                      {busyActionId === action.id ? "Saving…" : "Mark Follow-up Complete"}
                    </button>
                  </div>
                )}

                <div className="action-audit-row">
                  <span><strong>Created by</strong> {action.createdBy.name}</span>
                  <span><strong>Recorded at</strong> {formatDateTime(action.createdAt)}</span>
                  <span><strong>Updated at</strong> {formatDateTime(action.updatedAt)}</span>
                  {active && !action.performedBy && <span>Not completed yet</span>}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {dialog?.type === "create" && (
        <ActionFormDialog
          mode="create"
          ticketId={ticketId}
          ticketVersion={ticketVersionRef.current}
          assignees={assignees}
          onClose={() => setDialog(null)}
          onRefresh={() => void refreshAll()}
          onSaved={async (saved, parentChanged) => {
            setActions((current) => [saved, ...current.filter((item) => item.id !== saved.id)].sort((a, b) => new Date(b.actionDateTime).getTime() - new Date(a.actionDateTime).getTime() || b.id - a.id));
            await syncTicketVersionAfterMutation();
            setDialog(null);
            setNotice(parentChanged ? "Action created successfully." : "The original Action submission was recovered successfully.");
          }}
        />
      )}
      {dialog?.type === "edit" && (
        <ActionFormDialog
          mode="edit"
          action={dialog.action}
          ticketId={ticketId}
          ticketVersion={ticketVersionRef.current}
          assignees={assignees}
          onClose={() => setDialog(null)}
          onRefresh={() => void refreshAll()}
          onSaved={async (saved) => { replaceAction(saved); await syncTicketVersionAfterMutation(); setDialog(null); setNotice("Action updated successfully."); }}
        />
      )}
      {dialog?.type === "reassign" && (
        <ReassignDialog
          action={dialog.action}
          ticketVersion={ticketVersionRef.current}
          assignees={assignees}
          onClose={() => setDialog(null)}
          onRefresh={() => void refreshAll()}
          onSaved={async (saved) => { replaceAction(saved); await syncTicketVersionAfterMutation(); setDialog(null); setNotice("Action reassigned successfully."); }}
        />
      )}
      {dialog?.type === "complete" && (
        <CompleteDialog
          action={dialog.action}
          ticketVersion={ticketVersionRef.current}
          onClose={() => setDialog(null)}
          onRefresh={() => void refreshAll()}
          onSaved={async (saved) => { replaceAction(saved); await syncTicketVersionAfterMutation(); setDialog(null); setNotice("Action completed successfully."); }}
        />
      )}
      {dialog?.type === "cancel" && (
        <CancelDialog
          action={dialog.action}
          ticketVersion={ticketVersionRef.current}
          onClose={() => setDialog(null)}
          onRefresh={() => void refreshAll()}
          onSaved={async (saved) => { replaceAction(saved); await syncTicketVersionAfterMutation(); setDialog(null); setNotice("Action cancelled."); }}
        />
      )}
    </section>
  );
}

type Draft = {
  actionDateTime: string;
  description: string;
  assigneeId: string;
  followUpRequired: boolean;
  followUpNote: string;
  attachmentNotes: string;
};

function validateDraft(draft: Draft): Record<string, string> {
  const fields: Record<string, string> = {};
  const description = draft.description.trim();
  if (!draft.actionDateTime) fields.actionDateTime = "Action Date/Time is required.";
  else {
    const time = new Date(draft.actionDateTime).getTime();
    if (Number.isNaN(time)) fields.actionDateTime = "Enter a valid Action Date/Time.";
    else if (time > Date.now() + 5 * 60_000) fields.actionDateTime = "Action Date/Time cannot be more than 5 minutes in the future.";
  }
  if (!description) fields.description = "Description is required.";
  else if (codePoints(description) > MAX_TEXT) fields.description = `Description must be at most ${MAX_TEXT} characters.`;
  if (!draft.assigneeId) fields.assigneeId = "Assignee is required.";
  if (draft.followUpRequired && !draft.followUpNote.trim()) fields.followUpNote = "Follow-up Note is required when follow-up is Yes.";
  if (codePoints(draft.followUpNote.trim()) > MAX_TEXT) fields.followUpNote = `Follow-up Note must be at most ${MAX_TEXT} characters.`;
  if (codePoints(draft.attachmentNotes.trim()) > MAX_TEXT) fields.attachmentNotes = `Attachment Notes must be at most ${MAX_TEXT} characters.`;
  return fields;
}

function ActionFormDialog({
  mode,
  action,
  ticketId,
  ticketVersion,
  assignees,
  onClose,
  onRefresh,
  onSaved,
}: {
  mode: "create" | "edit";
  action?: ActionTaken;
  ticketId: number;
  ticketVersion: number;
  assignees: StaffAssignee[];
  onClose: () => void;
  onRefresh: () => void;
  onSaved: (action: ActionTaken, parentChanged: boolean) => Promise<void> | void;
}) {
  const [draft, setDraft] = useState<Draft>(() => ({
    actionDateTime: localInputValue(action?.actionDateTime ?? new Date()),
    description: action?.description ?? "",
    assigneeId: String(action?.assignee.id ?? assignees[0]?.id ?? ""),
    followUpRequired: action?.followUpRequired ?? false,
    followUpNote: action?.followUpNote ?? "",
    attachmentNotes: action?.attachmentNotes ?? "",
  }));
  const [clientRequestId] = useState(() => newClientRequestId());
  const [fields, setFields] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const nextFields = validateDraft(draft);
    setFields(nextFields);
    if (Object.keys(nextFields).length) { focusFirstInvalidField(); return; }
    setBusy(true);
    setFormError(null);
    try {
      if (mode === "create") {
        const result = await createStaffActionTaken(ticketId, {
          clientRequestId,
          expectedTicketVersion: ticketVersion,
          actionDateTime: new Date(draft.actionDateTime).toISOString(),
          description: draft.description.trim(),
          assigneeId: Number(draft.assigneeId),
          followUpRequired: draft.followUpRequired,
          followUpNote: draft.followUpRequired ? draft.followUpNote.trim() : null,
          attachmentNotes: draft.attachmentNotes.trim() || null,
        });
        await onSaved(result.action, result.created);
      } else if (action) {
        const saved = await updateStaffActionTaken(action.id, {
          expectedVersion: action.version,
          expectedTicketVersion: ticketVersion,
          actionDateTime: new Date(draft.actionDateTime).toISOString(),
          description: draft.description.trim(),
          assigneeId: Number(draft.assigneeId),
          followUpRequired: draft.followUpRequired,
          followUpNote: draft.followUpRequired ? draft.followUpNote.trim() : null,
          attachmentNotes: draft.attachmentNotes.trim() || null,
        });
        await onSaved(saved, true);
      }
    } catch (error) {
      if (error instanceof ApiError && error.fields) setFields(error.fields);
      setFormError(actionErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ActionModal title={mode === "create" ? "Add Action" : "Edit Action"} busy={busy} onClose={onClose}>
      {mode === "create" && <div className="action-info-banner">ⓘ New Actions start as <strong>Planned</strong> automatically.</div>}
      {formError && <DialogError message={formError} onRefresh={onRefresh} />}
      <div className="action-form-grid">
        <Field label="Action Date/Time" required error={fields.actionDateTime} helper="When did this work actually happen? Backdating is allowed.">
          <input className={`form-control ${fields.actionDateTime ? "is-invalid" : ""}`} type="datetime-local" value={draft.actionDateTime} disabled={busy} onChange={(event) => setDraft({ ...draft, actionDateTime: event.target.value })} />
        </Field>
        <Field label="Assignee" required error={fields.assigneeId}>
          <select className={`form-select ${fields.assigneeId ? "is-invalid" : ""}`} value={draft.assigneeId} disabled={busy} onChange={(event) => setDraft({ ...draft, assigneeId: event.target.value })}>
            <option value="" disabled>Select eligible assignee</option>
            {assignees.map((person) => <option key={person.id} value={person.id}>{person.name} ({person.role})</option>)}
          </select>
        </Field>
        <Field label="Description" required error={fields.description} count={`${codePoints(draft.description)}/${MAX_TEXT}`} wide>
          <textarea className={`form-control ${fields.description ? "is-invalid" : ""}`} rows={4} value={draft.description} disabled={busy} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
        </Field>
        <Field label="Follow-Up Required" required wide>
          <div className="action-radio-row">
            <label><input type="radio" checked={draft.followUpRequired} disabled={busy} onChange={() => setDraft({ ...draft, followUpRequired: true })} /> Yes</label>
            <label><input type="radio" checked={!draft.followUpRequired} disabled={busy} onChange={() => setDraft({ ...draft, followUpRequired: false, followUpNote: "" })} /> No</label>
          </div>
        </Field>
        {draft.followUpRequired && (
          <Field label="Follow-up Note" required error={fields.followUpNote} count={`${codePoints(draft.followUpNote)}/${MAX_TEXT}`} wide>
            <textarea className={`form-control ${fields.followUpNote ? "is-invalid" : ""}`} rows={3} value={draft.followUpNote} disabled={busy} onChange={(event) => setDraft({ ...draft, followUpNote: event.target.value })} />
          </Field>
        )}
        <Field label="Attachment Notes" error={fields.attachmentNotes} count={`${codePoints(draft.attachmentNotes)}/${MAX_TEXT}`} helper="Text notes only. This does not upload a new file." wide>
          <textarea className={`form-control ${fields.attachmentNotes ? "is-invalid" : ""}`} rows={3} value={draft.attachmentNotes} disabled={busy} onChange={(event) => setDraft({ ...draft, attachmentNotes: event.target.value })} />
        </Field>
      </div>
      <ModalFooter busy={busy} onCancel={onClose} onSubmit={() => void submit()} submitLabel={mode === "create" ? "Create Action" : "Save Changes"} />
    </ActionModal>
  );
}

function ReassignDialog({ action, ticketVersion, assignees, onClose, onRefresh, onSaved }: {
  action: ActionTaken;
  ticketVersion: number;
  assignees: StaffAssignee[];
  onClose: () => void;
  onRefresh: () => void;
  onSaved: (action: ActionTaken) => Promise<void> | void;
}) {
  const [assigneeId, setAssigneeId] = useState(String(action.assignee.id));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!assigneeId || Number(assigneeId) === action.assignee.id) { setError("Choose a different eligible assignee."); return; }
    setBusy(true); setError(null);
    try {
      await onSaved(await updateStaffActionTaken(action.id, {
        expectedVersion: action.version,
        expectedTicketVersion: ticketVersion,
        assigneeId: Number(assigneeId),
      }));
    } catch (submitError) { setError(actionErrorMessage(submitError)); }
    finally { setBusy(false); }
  }
  return (
    <ActionModal title="Reassign Action" busy={busy} onClose={onClose}>
      {error && <DialogError message={error} onRefresh={onRefresh} />}
      <p className="action-modal-intro">Reassign this active Action before another Staff member completes it.</p>
      <Field label="Assignee" required>
        <select className="form-select" value={assigneeId} disabled={busy} onChange={(event) => setAssigneeId(event.target.value)}>
          {assignees.map((person) => <option key={person.id} value={person.id}>{person.name} ({person.role})</option>)}
        </select>
      </Field>
      <ModalFooter busy={busy} onCancel={onClose} onSubmit={() => void submit()} submitLabel="Reassign Action" />
    </ActionModal>
  );
}

function CompleteDialog({ action, ticketVersion, onClose, onRefresh, onSaved }: {
  action: ActionTaken;
  ticketVersion: number;
  onClose: () => void;
  onRefresh: () => void;
  onSaved: (action: ActionTaken) => Promise<void> | void;
}) {
  const [result, setResult] = useState(action.result ?? "");
  const [followUpRequired, setFollowUpRequired] = useState(action.followUpRequired);
  const [followUpNote, setFollowUpNote] = useState(action.followUpNote ?? "");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit() {
    const next: Record<string, string> = {};
    if (!result.trim()) next.result = "Result is required to complete an Action.";
    else if (codePoints(result.trim()) > MAX_TEXT) next.result = `Result must be at most ${MAX_TEXT} characters.`;
    if (followUpRequired && !followUpNote.trim()) next.followUpNote = "Follow-up Note is required when follow-up is Yes.";
    if (codePoints(followUpNote.trim()) > MAX_TEXT) next.followUpNote = `Follow-up Note must be at most ${MAX_TEXT} characters.`;
    setFields(next);
    if (Object.keys(next).length) { focusFirstInvalidField(); return; }
    setBusy(true); setError(null);
    try {
      await onSaved(await updateStaffActionStatus(action.id, {
        status: "Completed",
        expectedVersion: action.version,
        expectedTicketVersion: ticketVersion,
        result: result.trim(),
        followUpRequired,
        followUpNote: followUpRequired ? followUpNote.trim() : null,
      }));
    } catch (submitError) {
      if (submitError instanceof ApiError && submitError.fields) setFields(submitError.fields);
      setError(actionErrorMessage(submitError));
    } finally { setBusy(false); }
  }
  return (
    <ActionModal title="Complete Action" busy={busy} onClose={onClose}>
      {error && <DialogError message={error} onRefresh={onRefresh} />}
      <div className="action-complete-summary">
        <strong>{action.description}</strong>
        <span>Current status: {action.status}</span>
        <span>Assignee: {action.assignee.name}</span>
        <span>Action Date/Time: {formatDateTime(action.actionDateTime)}</span>
      </div>
      <Field label="Result" required error={fields.result} count={`${codePoints(result)}/${MAX_TEXT}`}>
        <textarea className={`form-control ${fields.result ? "is-invalid" : ""}`} rows={4} value={result} disabled={busy} onChange={(event) => setResult(event.target.value)} />
      </Field>
      <Field label="Follow-Up Required" required>
        <div className="action-radio-row">
          <label><input type="radio" checked={followUpRequired} disabled={busy} onChange={() => setFollowUpRequired(true)} /> Yes</label>
          <label><input type="radio" checked={!followUpRequired} disabled={busy} onChange={() => { setFollowUpRequired(false); setFollowUpNote(""); }} /> No</label>
        </div>
      </Field>
      {followUpRequired && <Field label="Follow-up Note" required error={fields.followUpNote} count={`${codePoints(followUpNote)}/${MAX_TEXT}`}><textarea className={`form-control ${fields.followUpNote ? "is-invalid" : ""}`} rows={3} value={followUpNote} disabled={busy} onChange={(event) => setFollowUpNote(event.target.value)} /></Field>}
      <ModalFooter busy={busy} onCancel={onClose} onSubmit={() => void submit()} submitLabel="Complete Action" />
    </ActionModal>
  );
}

function CancelDialog({ action, ticketVersion, onClose, onRefresh, onSaved }: {
  action: ActionTaken; ticketVersion: number; onClose: () => void; onRefresh: () => void; onSaved: (action: ActionTaken) => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    setBusy(true); setError(null);
    try {
      await onSaved(await updateStaffActionStatus(action.id, { status: "Cancelled", expectedVersion: action.version, expectedTicketVersion: ticketVersion }));
    } catch (submitError) { setError(actionErrorMessage(submitError)); }
    finally { setBusy(false); }
  }
  return (
    <ActionModal title="Cancel Action" busy={busy} onClose={onClose}>
      {error && <DialogError message={error} onRefresh={onRefresh} />}
      <div className="action-cancel-warning" role="alert">
        <strong>Cancel this Action?</strong>
        <span>Cancellation is terminal. The Action remains visible for audit history and cannot be edited afterward.</span>
      </div>
      <p className="action-modal-intro"><strong>{action.description}</strong></p>
      <ModalFooter busy={busy} onCancel={onClose} onSubmit={() => void submit()} submitLabel="Cancel Action" danger />
    </ActionModal>
  );
}

function ActionModal({ title, busy, onClose, children }: { title: string; busy: boolean; onClose: () => void; children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  closeRef.current = onClose;
  busyRef.current = busy;
  useEffect(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
    focusable()[0]?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busyRef.current) { event.preventDefault(); closeRef.current(); return; }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); returnFocusRef.current?.focus(); };
  }, []);
  return (
    <div className="action-modal-backdrop" onMouseDown={(event) => { if (!busy && event.target === event.currentTarget) onClose(); }}>
      <div className="action-modal" role="dialog" aria-modal="true" aria-labelledby="action-modal-title" ref={dialogRef}>
        <header className="action-modal-header"><h2 id="action-modal-title">{title}</h2><button type="button" className="action-modal-close" aria-label="Close dialog" disabled={busy} onClick={onClose}>×</button></header>
        <div className="action-modal-body">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, required = false, error, helper, count, wide = false, children }: { label: string; required?: boolean; error?: string; helper?: string; count?: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={`action-field ${wide ? "action-field-wide" : ""}`}><span className="action-field-label">{label}{required && <span className="action-required"> *</span>}</span>{children}<span className="action-field-meta">{error ? <span className="action-field-error">{error}</span> : helper ? <span>{helper}</span> : <span />}{count && <span>{count}</span>}</span></label>;
}

function DialogError({ message, onRefresh }: { message: string; onRefresh: () => void }) {
  const refreshUseful = /changed|eligible|refresh/i.test(message);
  return <div className="actions-feedback actions-feedback-error" role="alert"><span>{message}</span>{refreshUseful && <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRefresh}>Refresh</button>}</div>;
}

function ModalFooter({ busy, onCancel, onSubmit, submitLabel, danger = false }: { busy: boolean; onCancel: () => void; onSubmit: () => void; submitLabel: string; danger?: boolean }) {
  return <div className="action-modal-footer"><button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={onCancel}>Cancel</button><button type="button" className={`btn ${danger ? "btn-danger" : "btn-success"}`} disabled={busy} onClick={onSubmit}>{busy ? "Saving…" : submitLabel}</button></div>;
}
