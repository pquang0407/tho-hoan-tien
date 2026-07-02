import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

import About from "./pages/About";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

import "./index.css";

function App() {
  const [currentPage, setCurrentPage] = useState("about");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return unsubscribe;
  }, []);

  const handlePageChange = (page) => {
    if (page === "dashboard" && !user) {
      setCurrentPage("login");
      return;
    }

    setCurrentPage(page);
  };

  return (
    <>
      {currentPage === "about" && (
        <About
          changePage={handlePageChange}
          user={user}
        />
      )}

      {currentPage === "login" && (
        <Login
          changePage={setCurrentPage}
        />
      )}

      {currentPage === "dashboard" && (
        <Dashboard
          changePage={setCurrentPage}
          user={user}
        />
      )}
    </>
  );
}

export default App;