import { useEffect, useState, useCallback } from "react";
import {
  getTickets,
  getCategories,
  getRelatedSystems,
  Category,
  RelatedSystem,
  Ticket,
  GetTicketsParams,
} from "./api.js";

// Lab 2 Issue 4 — S3: My Tickets screen (ui-spec.md).
// Table (desktop/tablet) + cards (mobile), toolbar with debounced search,
// filters, sort, pagination. Handles loading/empty/no-results/error.

type LoadState = "idle" | "loading" | "success" | "error";

interface MyTicketsProps {
  requesterId: number;
  onCreateTicket?: () => void;
  onOpenTicket?: (ticketId: number) => void;
}

export default function MyTickets({ requesterId, onCreateTicket, onOpenTicket }: MyTicketsProps) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [systems, setSystems] = useState<RelatedSystem[]>([]);

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSystem, setFilterSystem] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "summary_asc">("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Debounce search 300ms
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  // Reset to page 1 when filters/sort/pageSize/search change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterCategory, filterSystem, sort, pageSize]);

  // Load dropdown data once
  useEffect(() => {
    let cancelled = false;
    Promise.all([getCategories(), getRelatedSystems()])
      .then(([cats, sys]) => {
        if (!cancelled) {
          setCategories(cats);
          setSystems(sys);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchTickets = useCallback(async () => {
    setLoadState("loading");
    setErrorMsg(null);
    const params: GetTicketsParams = {
      sort,
      page,
      pageSize,
    };
    if (debouncedSearch) params.search = debouncedSearch;
    if (filterCategory) params.categoryId = Number(filterCategory);
    if (filterSystem) params.relatedSystemId = Number(filterSystem);
    try {
      const res = await getTickets(params, requesterId);
      setTickets(res.items);
      setTotalItems(res.totalItems);
      setTotalPages(res.totalPages);
      setLoadState("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unable to load tickets");
      setLoadState("error");
    }
  }, [debouncedSearch, filterCategory, filterSystem, sort, page, pageSize, requesterId]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const hasActiveFilter = Boolean(debouncedSearch || filterCategory || filterSystem);

  function clearFilters() {
    setSearchInput("");
    setDebouncedSearch("");
    setFilterCategory("");
    setFilterSystem("");
    setSort("newest");
  }

  return (
    <div className="container py-4" style={{ maxWidth: 900 }}>
      <h2 className="h4 mb-3">My Tickets</h2>

      {/* Toolbar */}
      <div className="row g-2 mb-3 align-items-end">
        <div className="col-12 col-md-4">
          <label htmlFor="search" className="form-label form-label-sm mb-1">
            Search
          </label>
          <input
            id="search"
            className="form-control form-control-sm"
            placeholder="Search ticket no. or summary…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="col-6 col-md-2">
          <label htmlFor="filterCategory" className="form-label form-label-sm mb-1">
            Category
          </label>
          <select
            id="filterCategory"
            className="form-select form-select-sm"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-6 col-md-2">
          <label htmlFor="filterSystem" className="form-label form-label-sm mb-1">
            System
          </label>
          <select
            id="filterSystem"
            className="form-select form-select-sm"
            value={filterSystem}
            onChange={(e) => setFilterSystem(e.target.value)}
          >
            <option value="">All systems</option>
            {systems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-6 col-md-2">
          <label htmlFor="sort" className="form-label form-label-sm mb-1">
            Sort
          </label>
          <select
            id="sort"
            className="form-select form-select-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="summary_asc">Summary A-Z</option>
          </select>
        </div>
        <div className="col-6 col-md-2">
          <label htmlFor="pageSize" className="form-label form-label-sm mb-1">
            Page size
          </label>
          <select
            id="pageSize"
            className="form-select form-select-sm"
            value={String(pageSize)}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
          </select>
        </div>
      </div>

      {hasActiveFilter && (
        <button className="btn btn-sm btn-outline-secondary mb-3" onClick={clearFilters}>
          Clear filters
        </button>
      )}

      {loadState === "loading" && (
        <p className="text-secondary">
          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
          Loading tickets…
        </p>
      )}

      {loadState === "error" && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center">
          <span>{errorMsg}</span>
          <button className="btn btn-sm btn-outline-danger" onClick={fetchTickets}>
            Retry
          </button>
        </div>
      )}

      {loadState === "success" && totalItems === 0 && !hasActiveFilter && (
        <div className="text-center py-5">
          <p className="text-secondary mb-2">No tickets yet</p>
          <p className="small text-secondary mb-3">Create your first ticket to get started.</p>
          {onCreateTicket && (
            <button className="btn btn-success btn-sm" onClick={onCreateTicket}>
              Create Ticket
            </button>
          )}
        </div>
      )}

      {loadState === "success" && totalItems === 0 && hasActiveFilter && (
        <div className="text-center py-4">
          <p className="text-secondary">No results</p>
          <p className="small text-secondary">Try adjusting your search or filters.</p>
        </div>
      )}

      {loadState === "success" && tickets.length > 0 && (
        <>
          {/* Desktop/tablet table */}
          <div className="d-none d-md-block table-responsive">
            <table className="table table-hover align-middle">
              <thead style={{ backgroundColor: "#EAF6EF" }}>
                <tr>
                  <th>Ticket No</th>
                  <th>Summary</th>
                  <th>Category</th>
                  <th>Requested Priority</th>
                  <th>System</th>
                  <th>Created</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td className="fw-semibold">
                      {onOpenTicket ? (
                        <button
                          className="btn btn-link p-0 fw-semibold text-success"
                          aria-label={`Open ${t.ticketNumber}`}
                          onClick={() => onOpenTicket(t.id)}
                        >
                          {t.ticketNumber}
                        </button>
                      ) : (
                        t.ticketNumber
                      )}
                    </td>
                    <td>{t.summary}</td>
                    <td>{t.category.name}</td>
                    <td>{t.requestedPriority ?? "Not recorded"}</td>
                    <td>{t.relatedSystem.name}</td>
                    <td className="small text-secondary">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span
                        className="badge"
                        style={{ backgroundColor: "#EAF6EF", color: "#0B7A46" }}
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="d-md-none d-flex flex-column gap-2">
            {tickets.map((t) => (
              <div key={t.id} className="card p-3">
                <div className="d-flex justify-content-between">
                  {onOpenTicket ? (
                    <button
                      className="btn btn-link p-0 fw-semibold text-success"
                      aria-label={`Open ${t.ticketNumber}`}
                      onClick={() => onOpenTicket(t.id)}
                    >
                      {t.ticketNumber}
                    </button>
                  ) : (
                    <span className="fw-semibold">{t.ticketNumber}</span>
                  )}
                  <span className="badge" style={{ backgroundColor: "#EAF6EF", color: "#0B7A46" }}>
                    {t.status}
                  </span>
                </div>
                <p className="mb-1 mt-2">{t.summary}</p>
                <small className="text-secondary">
                  {t.category.name} · {t.requestedPriority ?? "Not recorded"} · {t.relatedSystem.name} · {new Date(t.createdAt).toLocaleDateString()}
                </small>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="d-flex justify-content-between align-items-center mt-3">
            <small className="text-secondary">
              Page {page} of {totalPages} · {totalItems} tickets
            </small>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-outline-success" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Prev
              </button>
              <button
                className="btn btn-sm btn-outline-success"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
