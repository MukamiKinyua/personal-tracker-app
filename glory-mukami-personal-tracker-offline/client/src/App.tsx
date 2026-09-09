import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { RecordStoreProvider } from "./contexts/RecordStoreContext";
import { SearchPalette } from "./components/SearchPalette";
import { TimersProvider } from "./contexts/TimersContext";
import { TimerBar } from "./components/TimerBar";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

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
              <Router />
            </TooltipProvider>
          </TimersProvider>
        </RecordStoreProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
