# AI Development Log

This log summarizes the key phases, prompts, and engineering iterations during the development of the Document Intake Assistant.

## Prompt 1 — Backend Foundation
**Request:** Build the backend first based on the assignment requirements. Establish a clean architecture using Node.js, Express, TypeScript, and Zod for validation. Ensure structured information is collected through LLM conversations, missing values are represented explicitly, and a fictional Document is generated. Do not build the frontend yet.

**Result:** A modular 6-layer architecture was created comprising types, schemas, an in-memory session state, an LLM service abstraction (via native fetch to OpenAI), a conversation orchestrator, and document generation. The `PersonalWishesState` was designed using a robust `Field<T>` wrapper to track status (`unknown`, `unconfirmed`, `confirmed`).

## Prompt 2 — Backend Audit
**Request:** Audit and improve the backend against the technical test requirements. Build a comprehensive test suite (Vitest) covering multi-turn conversations, single-message multi-field extraction, error handling, corrections, ambiguous inputs, and contradictions. Address any bugs found.

**Result:** An exhaustive suite of 129 tests across 13 files was created. The audit uncovered several critical areas requiring engineering judgement and fixes:
- Added a `MAX_MESSAGE_LENGTH` limit and Express body parsing limits to prevent DoS via excessively large inputs.
- Hardened Zod schemas using `.strip()` to discard unexpected or hallucinated keys returned by the LLM.
- Expanded the LLM system prompt rules to explicitly handle contradictions (e.g., "no children" then mentioning a son) and ambiguous inputs (e.g., executor name without relationship) by asking for clarification rather than inventing facts.
- Fixed API contract issues by ensuring all routes returned the required `sessionId` and initial `assistantMessage`.

## Prompt 3 — Frontend Implementation
**Request:** Build a simple, polished web interface for the Assistant using React, TypeScript, Vite, and Tailwind CSS. The UI must feature a left panel for the conversation and a right panel for live preview of the structured state and draft document. Integrate with the existing backend without changing the API contract.

**Result:** The React SPA was built using a dual-pane `h-screen` layout. It features a centralized, strongly-typed API client (`src/services/api.ts`). The UI successfully displays status badges for collected information, handles loading states gracefully, and presents a dismissable error banner for API/LLM failures without breaking the conversation flow.

## Prompt 4 — Final Verification
**Request:** Perform end-to-end verification. Run all build and test checks for both frontend and backend. Ensure the project structure is clean, `.env` is ignored, and the README contains thorough documentation including a production improvements section.

**Result:** Final builds and type-checks were run. An issue with a TypeScript parameter property in the frontend API client (`api.ts`) causing a build error under `erasableSyntaxOnly` was identified and fixed. Both servers were run concurrently to verify the live interaction, layout constraints, and error recovery.

## Notable Engineering Judgements & Corrections

1. **Validating LLM Output Instead of Trusting It:**
   Initially, the `LlmExtractedFieldsSchema` was a standard Zod object. I realized that LLMs often hallucinate extra properties (e.g., returning a `confidence` score or `internal_notes`). I corrected the schemas by appending `.strip()`, ensuring that any unexpected keys are silently removed before they can contaminate the structured state.

2. **Handling Corrections Without Blindly Overwriting State:**
   The `mergeExtractedFields` logic was specifically designed to handle partial updates. If an LLM response only contains an updated `full_name`, the merge logic updates only that field while preserving the existing values for `home_address`, `executor`, etc. Missing fields in the LLM JSON do not overwrite previously confirmed fields with `null`.

3. **Managing LLM Failures Gracefully:**
   In `orchestrator.ts`, if the LLM request times out or returns malformed JSON, the system does not simply throw a 500 error and crash the session. Instead, it catches the error, preserves the existing conversation history and state, and pushes a fallback `assistantMessage` ("I apologise, but I had trouble processing that. Please try again."). This ensures the frontend can display the error without losing the user's progress.
