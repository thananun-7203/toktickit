// Pure helper for Development Requester activity filtering (BR-6).
export interface RequesterLike {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

export function filterActiveRequesters<T extends RequesterLike>(requesters: T[]): T[] {
  return requesters.filter((r) => r.isActive);
}
