import React, { useState, useEffect } from 'react';
import About from './pages/About';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import './index.css';

function App() {
  const [currentPage, setCurrentPage] = useState('about');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Kiểm tra đăng nhập khi khởi động
  useEffect(() => {
    const userEmail = localStorage.getItem('userEmail');
    if (userEmail) setIsLoggedIn(true);
  }, []);

  const handlePageChange = (page) => {
    // Logic bảo vệ: Nếu chưa đăng nhập mà muốn vào dashboard -> bắt sang login
    if (page === 'dashboard' && !isLoggedIn) {
      setCurrentPage('login');
    } else {
      setCurrentPage(page);
    }
  };

  return (
    <>
      {currentPage === 'about' && <About changePage={handlePageChange} />}
      {currentPage === 'login' && <Login changePage={setCurrentPage} setIsLoggedIn={setIsLoggedIn} />}
      {currentPage === 'dashboard' && <Dashboard changePage={setCurrentPage} />}
    </>
  );
}

export default App;