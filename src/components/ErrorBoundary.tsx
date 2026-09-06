import { Component, ReactNode } from "react";
import { captureAppError } from "@/lib/monitoring";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary]", error);
    }
    void captureAppError({
      eventName: "app_runtime_error",
      error,
      metadata: { source: "error_boundary" },
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-heading text-2xl font-bold">Etwas ist schiefgelaufen</h1>
          <p className="text-muted-foreground text-sm">
            Die App konnte nicht vollständig geladen werden. Lade sie bitte erneut.
            Bleibt das Problem bestehen, schließe RewirePerform vollständig und öffne die App noch einmal.
          </p>
          <button
            onClick={this.handleReload}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
          >
            App neu laden
          </button>
          {import.meta.env.DEV && this.state.error?.message && (
            <pre className="text-xs text-muted-foreground/70 mt-4 whitespace-pre-wrap break-words">
              {this.state.error.message}
            </pre>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
