// src/App.js
import React, { useState } from 'react';
import CourseList from './CourseList';
import AdminPage from './AdminPage';
import './App.css';

function App() {
  const [currentMode, setCurrentMode] = useState('professor');

  // ★ 비밀번호 확인 함수
  const handleAdminAccess = () => {
    const password = window.prompt("관리자 비밀번호를 입력하세요:");
    if (password === "1230") {
      setCurrentMode('admin');
    } else if (password !== null) {
      alert("비밀번호가 틀렸습니다!");
    }
  };

  return (
    <div className="App">
      <nav style={{ padding: '10px', backgroundColor: '#333', color: 'white', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <h3 style={{ margin: 0, paddingLeft: '10px' }}>🏫 강의 배정 시스템</h3>
        
        <button 
          onClick={() => setCurrentMode('professor')}
          style={{ 
            padding: '8px 16px', cursor: 'pointer', border: 'none', borderRadius: '4px',
            backgroundColor: currentMode === 'professor' ? '#2196F3' : '#555', color: 'white', fontWeight: 'bold'
          }}>
          교수용 (신청)
        </button>

        {/* ★ 클릭 시 비밀번호 함수 실행 */}
        <button 
          onClick={handleAdminAccess}
          style={{ 
            padding: '8px 16px', cursor: 'pointer', border: 'none', borderRadius: '4px',
            backgroundColor: currentMode === 'admin' ? '#ff9800' : '#555', color: 'white', fontWeight: 'bold'
          }}>
          관리자용 (설정)
        </button>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {currentMode === 'professor' ? <CourseList /> : <AdminPage />}
      </div>
    </div>
  );
}

export default App;