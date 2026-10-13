import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { RecordStoreProvider } from "./contexts/RecordStoreContext";
import { SearchPalette } from "./components/SearchPalette";
import { TimersProvider } from "./contexts/TimersContext";
import { TimerBar } from "./components/TimerBar";
import { NativeBridges } from "./components/NativeBridges";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import { Login } from "./pages/Login";
import { useAuth } from "./_core/hooks/useAuth";
import { useGoogleSignIn } from "./hooks/useGoogleSignIn";
import { useState, type ReactNode } from "react";

const GUEST_KEY = "glory-personal-tracker:continue-without-account";

function readGuestChoice(): boolean {
  try {
    return localStorage.getItem(GUEST_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Shows the sign-in page until someone signs in or chooses to continue
 * without an account. It steps aside whenever sign-in cannot work (no server
 * support, or offline) so nobody is ever locked out of their own journal.
 */
function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const signIn = useGoogleSignIn();
  const [guest, setGuest] = useState(readGuestChoice);

  if (guest || auth.user) return <>{children}</>;
  // Wait for both checks so nobody sees the wrong screen flash first.
  if (auth.loading || signIn.checking) return null;
  if (!signIn.available) return <>{children}</>;

  return (
    <Login
      onContinueWithoutAccount={() => {
        try {
          localStorage.setItem(GUEST_KEY, "1");
        } catch {
          // Private mode: the choice just lasts until the next launch.
        }
        setGuest(true);
      }}
    />
  );
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <RecordStoreProvider>
          <TimersProvider>
            <TooltipProvider>
              <Toaster />
              {/* App-wide, so Cmd+K reaches the journal from any page. */}
              <SearchPalette />
              {/* Above the router, so a rest timer survives navigating away
                  from the page that started it. */}
              <TimerBar />
              {/* Reminder schedule and home-screen widget, kept in step with
                  the journal. Renders nothing. */}
              <NativeBridges />
              <AuthGate>
                <Router />
              </AuthGate>
            </TooltipProvider>
          </TimersProvider>
        </RecordStoreProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
