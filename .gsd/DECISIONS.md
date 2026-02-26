# Decisions Log

> Architecture Decision Records for the project.

## ADR-001: Multi-file Bound Script Architecture (2026-02-26)

**Context:** Needed to decide between GAS Library, single-file, or multi-file bound scripts.

**Decision:** Multi-file bound scripts (Core.gs + Templates.gs + Main.gs) copied into each Sheet.

**Rationale:**
- GAS Libraries add latency on every function call and version management is fragile
- Single file would be too large and hard to maintain
- Multi-file leverages GAS's shared global scope (no imports needed)
- Copy-paste deployment is simple for a small team

**Status:** Accepted
