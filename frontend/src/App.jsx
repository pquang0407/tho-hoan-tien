import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

import About from "./pages/About";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";

import History from "./pages/History";
import Wallet from "./pages/Wallet";

import DashboardLayout from "./components/DashboardLayout";

import "./index.css";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        Đang kiểm tra đăng nhập...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>

        {/* --- TRANG CHỦ CŨNG ĐƯỢC BỌC SIDEBAR --- */}
        <Route
          path="/"
          element={
            <DashboardLayout user={user}>
              <About user={user} />
            </DashboardLayout>
          }
        />

        {/* Trang Login (Không Sidebar) */}
        <Route
          path="/login"
          element={
            user
              ? <Navigate to="/dashboard" replace />
              : <Login />
          }
        />

        {/* --- CÁC TRANG CỦA USER --- */}
        <Route
          path="/dashboard"
          element={
            user ? (
              <DashboardLayout user={user}>
                <Dashboard user={user} />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* --- TRANG ADMIN --- */}
        <Route
          path="/admin"
          element={
            user
              ? <Admin user={user} />
              : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/history"
          element={
            user ? (
              <DashboardLayout user={user}>
                <History user={user} />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/wallet"
          element={
            user ? (
              <DashboardLayout user={user}>
                <Wallet user={user} />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;