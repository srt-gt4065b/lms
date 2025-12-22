// src/AdminPage.js
import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';

const AdminPage = () => {
  const [lectures, setLectures] = useState([]);
  const [professors, setProfessors] = useState([]); // DB에서 가져올 교수님 목록
  
  // 입력 폼 상태변수들
  const [newProfName, setNewProfName] = useState("");
  const [newCourse, setNewCourse] = useState({
    grade: "1-1", department: "AI경영학과", name: "", credit: "3", hours: "3", estStudents: 40
  });

  const languages = ["한국어", "영어", "중국어"]; 

  useEffect(() => {
    // 1. 강의 목록 가져오기
    const coursesRef = collection(db, "semesters", "2026_spring", "courses");
    const unsubCourses = onSnapshot(coursesRef, (snapshot) => {
      const lectureData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          grade: data.targetGrade,
          name: data.courseName,
          credit: `${data.credits} / ${data.hours}`,
          estStudents: data.estStudents || 0,
          totalSections: data.sectionInfo?.total || 1,
          languageMap: data.languageMap || {},
          applicants: data.applicants || {}
        };
      });
      lectureData.sort((a, b) => a.grade.localeCompare(b.grade));
      setLectures(lectureData);
    });

    // 2. 교수님 목록 가져오기 (새로 만든 'professors' 컬렉션)
    const profRef = collection(db, "professors");
    const q = query(profRef, orderBy("name")); // 이름순 정렬
    const unsubProf = onSnapshot(q, (snapshot) => {
      const profList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProfessors(profList);
    });

    return () => {
      unsubCourses();
      unsubProf();
    };
  }, []);

  // --- 기능 1: 교수님 추가/삭제 ---
  const handleAddProfessor = async () => {
    if (!newProfName.trim()) return;
    try {
      await addDoc(collection(db, "professors"), { name: newProfName });
      setNewProfName(""); // 입력창 비우기
      alert("교수님이 추가되었습니다.");
    } catch (e) { console.error(e); alert("오류 발생"); }
  };

  const handleDeleteProfessor = async (id) => {
    if (window.confirm("정말 삭제하시겠습니까?")) {
      await deleteDoc(doc(db, "professors", id));
    }
  };

  // --- 기능 2: 신규 과목 추가 ---
  const handleAddCourse = async () => {
    if (!newCourse.name) { alert("과목명을 입력하세요"); return; }
    try {
      await addDoc(collection(db, "semesters", "2026_spring", "courses"), {
        targetGrade: newCourse.grade,
        department: newCourse.department,
        courseName: newCourse.name,
        credits: Number(newCourse.credit),
        hours: Number(newCourse.hours),
        estStudents: Number(newCourse.estStudents),
        sectionInfo: { total: 1, intl_chinese: 0, intl_english: 0 }, // 기본 1분반
        applicants: {},
        languageMap: {},
        description: "",
        createdAt: new Date()
      });
      setNewCourse({ ...newCourse, name: "" }); // 과목명만 초기화 (나머진 편의상 유지)
      alert("새 과목이 개설되었습니다!");
    } catch (e) { console.error(e); alert("오류 발생"); }
  };

  // --- 기존 기능: 설정 변경 ---
  const handleEstStudentsChange = async (docId, val) => {
    await updateDoc(doc(db, "semesters", "2026_spring", "courses", docId), { estStudents: Number(val) });
  };
  const handleSectionCountChange = async (docId, val) => {
    await updateDoc(doc(db, "semesters", "2026_spring", "courses", docId), { "sectionInfo.total": Number(val) });
  };
  const handleLanguageChange = async (docId, secIdx, val) => {
    await updateDoc(doc(db, "semesters", "2026_spring", "courses", docId), { [`languageMap.${secIdx}`]: val });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#fff3e0', minHeight: '100vh' }}>
      <header style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#ff9800', color: 'white', borderRadius: '8px' }}>
        <h2 style={{ margin: 0 }}>🛠️ 관리자 모드 통합</h2>
      </header>

      {/* 1. 교수님 관리 섹션 */}
      <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, color: '#e65100' }}>👥 교수진 관리</h3>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <input 
            type="text" placeholder="교수님 성함" value={newProfName}
            onChange={(e) => setNewProfName(e.target.value)}
            style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          <button onClick={handleAddProfessor} style={{ padding: '8px 16px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>추가</button>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {professors.map(p => (
            <span key={p.id} style={{ padding: '5px 10px', backgroundColor: '#eee', borderRadius: '15px', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '5px' }}>
              {p.name}
              <button onClick={() => handleDeleteProfessor(p.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'red', fontWeight: 'bold' }}>x</button>
            </span>
          ))}
        </div>
      </div>

      {/* 2. 신규 강의 개설 섹션 */}
      <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, color: '#e65100' }}>📘 신규 강의 개설</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={newCourse.grade} onChange={(e) => setNewCourse({...newCourse, grade: e.target.value})} style={{ padding: '8px' }}>
            <option>1-1</option><option>1-2</option><option>2-1</option><option>2-2</option><option>3-1</option><option>3-2</option><option>4-1</option><option>4-2</option>
          </select>
          <input type="text" placeholder="학과 (예: AI경영)" value={newCourse.department} onChange={(e) => setNewCourse({...newCourse, department: e.target.value})} style={{ padding: '8px', width: '120px' }} />
          <input type="text" placeholder="과목명" value={newCourse.name} onChange={(e) => setNewCourse({...newCourse, name: e.target.value})} style={{ padding: '8px', width: '200px' }} />
          <input type="number" placeholder="학점" value={newCourse.credit} onChange={(e) => setNewCourse({...newCourse, credit: e.target.value})} style={{ padding: '8px', width: '50px' }} />
          <input type="number" placeholder="시수" value={newCourse.hours} onChange={(e) => setNewCourse({...newCourse, hours: e.target.value})} style={{ padding: '8px', width: '50px' }} />
          <input type="number" placeholder="예상인원" value={newCourse.estStudents} onChange={(e) => setNewCourse({...newCourse, estStudents: e.target.value})} style={{ padding: '8px', width: '70px' }} />
          
          <button onClick={handleAddCourse} style={{ padding: '8px 16px', backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>강의 생성</button>
        </div>
      </div>

      {/* 3. 강의 목록 테이블 (기존 기능) */}
      <div style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ef6c00', textAlign: 'center', backgroundColor: '#ffe0b2', color: '#bf360c' }}>
              <th style={{ padding: '12px' }}>학년</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>과목명</th>
              <th style={{ padding: '12px' }}>예상인원</th>
              <th style={{ padding: '12px' }}>분반 수</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>언어 설정</th>
            </tr>
          </thead>
          <tbody>
            {lectures.map((lecture) => (
              <tr key={lecture.id} style={{ borderBottom: '1px solid #eee', textAlign: 'center', height: '50px' }}>
                <td>{lecture.grade}</td>
                <td style={{ textAlign: 'left', fontWeight: 'bold' }}>{lecture.name}</td>
                <td>
                  <input type="number" value={lecture.estStudents} onChange={(e) => handleEstStudentsChange(lecture.id, e.target.value)} style={{ width: '50px', textAlign: 'center' }} />
                </td>
                <td>
                  <input type="number" min="1" value={lecture.totalSections} onChange={(e) => handleSectionCountChange(lecture.id, e.target.value)} style={{ width: '40px', textAlign: 'center', fontWeight: 'bold', color: '#e65100' }} />
                </td>
                <td style={{ textAlign: 'left' }}>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {Array.from({ length: lecture.totalSections }, (_, i) => i + 1).map(secNum => (
                      <select key={secNum} value={lecture.languageMap[secNum] || "한국어"} onChange={(e) => handleLanguageChange(lecture.id, secNum, e.target.value)} style={{ fontSize: '0.8em' }}>
                        {languages.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default AdminPage;