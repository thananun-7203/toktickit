const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface Requester {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

// Issue 2 + Issue 4 — call the backend.
// Loads the health check first, then the categories.
export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await fetch(`${API_URL}/api/health`);
  if (!healthRes.ok) {
    throw new Error(`Health check failed with status ${healthRes.status}`);
  }
  const health = await healthRes.json();
  if (health.status !== "ok") {
    throw new Error("Health check reported a non-ok status");
  }

  const categoriesRes = await fetch(`${API_URL}/api/categories`);
  if (!categoriesRes.ok) {
    throw new Error(`Categories request failed with status ${categoriesRes.status}`);
  }

  const categories: Category[] = await categoriesRes.json();

  return { online: true, categories };
}

// Lab 2 Issue 2 — Development Requester selection.
// Loads the active requesters used to populate the selector (FR-2, BR-6).
export async function getRequesters(): Promise<Requester[]> {
  const res = await fetch(`${API_URL}/api/v1/requesters`);
  if (!res.ok) {
    throw new Error(`Requesters request failed with status ${res.status}`);
  }
  return res.json();
}
