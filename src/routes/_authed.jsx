import { createFileRoute } from "@tanstack/react-router";
import { AuthGateError } from "@/components/auth/AuthGate";

// Login is optional: visitors can play solo and online anonymously.
// The StickArena actor accepts anonymous connections, and the game code
// already handles a missing user (default fighter name "Fighter").
export const Route = createFileRoute("/_authed")({
  ssr: false,
  errorComponent: AuthGateError,
});