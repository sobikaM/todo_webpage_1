import React, { useState } from "react";
import KanbanBoardWrapper from "./KanbanBoard";
import Login from "./Login";
import Signup from "./Signup";
import { GoogleOAuthProvider } from "@react-oauth/google";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));
  const [username, setUsername] = useState(localStorage.getItem("username") || "");
  const [showSignup, setShowSignup] = useState(false);

  const handleLogin = (username) => {
    setUsername(username);
    setIsLoggedIn(true);
    localStorage.setItem("username", username);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setIsLoggedIn(false);
    setUsername("");
  };

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {isLoggedIn ? (
        <div>
          <h1 style={{ textAlign: "center" }}>Kanban Board</h1>
          <KanbanBoardWrapper username={username} onLogout={handleLogout} />
        </div>
      ) : showSignup ? (
        <Signup
          onSignupComplete={() => setShowSignup(false)}
          switchToLogin={() => setShowSignup(false)}
        />
      ) : (
        <Login
          onLoginSuccess={handleLogin}
          switchToSignup={() => setShowSignup(true)}
        />
      )}
    </GoogleOAuthProvider>
  );
}

export default App;
