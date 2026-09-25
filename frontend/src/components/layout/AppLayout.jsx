import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ThemeContext } from "../../context/ThemeContext";

export function AppLayout({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          backgroundColor: "var(--bg-page)",
          color: "var(--text-primary)",
          width: "100%",
        }}
      >
        {/* Desktop-First Collapsible Sidebar */}
        <Sidebar />

        {/* Main App Container */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0, // Prevents flex child overflow
            overflowX: "hidden",
          }}
        >
          <Topbar />

          <main
            style={{
              flex: 1,
              padding: "2.5rem",
              maxWidth: "1440px",
              width: "100%",
              margin: "0 auto",
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </ThemeContext.Provider>
  );
}
