-- Lab 2 Issue 6: add requester-selected priority to Ticket.
-- Nullable at the database level so tickets created before this migration remain valid.
-- POST /api/v1/tickets requires Low / Medium / High for all new tickets.
ALTER TABLE "Ticket" ADD COLUMN "requestedPriority" TEXT;
