/**
 * mahleos-feedback-read - dedicated machine-to-machine feedback API
 *
 * This endpoint is intentionally separate from aggregate/evidence contracts.
 * It returns no account identifiers and projects every database response
 * through a strict allow-list before transmission.
 */
import { authenticateMahleOsFeedbackMachine } from "../_shared/mahleOsMachineAuth.ts";
import { handleMahleOsFeedbackRead } from "../_shared/mahleOsFeedbackHandler.ts";
import { serviceClient } from "../_shared/supabaseService.ts";

Deno.serve((request) =>
  handleMahleOsFeedbackRead(request, {
    authenticate: authenticateMahleOsFeedbackMachine,
    auditInvalidRequest: async ({ requestId, errorCode }) => {
      const { data, error } = await serviceClient().rpc(
        "audit_mahleos_feedback_invalid_request",
        {
          _request_id: requestId,
          _client_id: "mahleos-feedback-v1",
          _error_code: errorCode,
        },
      );
      return { data, error };
    },
    readPage: async ({ requestId, cursorCreatedAt, cursorId, limit }) => {
      const { data, error } = await serviceClient().rpc("read_mahleos_feedback_page", {
        _request_id: requestId,
        _client_id: "mahleos-feedback-v1",
        _cursor_created_at: cursorCreatedAt,
        _cursor_id: cursorId,
        _limit: limit,
      });
      return { data, error };
    },
  })
);
