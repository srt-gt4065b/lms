// src/CourseList.js
import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';

const CourseList = () => {
  const [lectures, setLectures] = useState([]);
  const [filteredLectures, setFilteredLectures] = useState([]); 
  const [myName, setMyName] = useState(""); 
  const [filterLang, setFilterLang] = useState("전체"); 
  const [modalContent, setModalContent] = useState(null);

  // ★ 중요: 이제 교수님 목록도 DB에서 가져옵니다 (빈 배열로 시작)
  const [professors, setProfessors] = useState([]);

  useEffect(() => {
    // 1. 강의 목록 가져오기 (기존 코드)
    const coursesRef = collection(db, "semesters", "2026_spring", "courses");
    const unsubCourses = onSnapshot(coursesRef, (snapshot) => {
      let expandedData = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const totalSections = data.sectionInfo?.total || 1;
        const langMap = data.languageMap || {}; 

        for (let i = 1; i <= totalSections; i++) {
          let currentLang = langMap[i.toString()] || "한국어";
          let langColor = "#333";
          if (currentLang === "중국어") langColor = "red";
          else if (currentLang === "영어") langColor = "blue";
          
          expandedData.push({
            uniqueKey: `${doc.id}_${i}`,
            docId: doc.id,
            sectionIndex: i,
            grade: data.targetGrade,
            name: data.courseName,
            credit: `${data.credits} / ${data.hours}`,
            estStudents: data.estStudents || "-", 
            language: currentLang,
            langColor: langColor,
            prevProfessor: data.prevProfInfo?.name || "",
            applicants: data.applicants?.[i.toString()] || [],
            description: data.description || "등록된 강의 개요가 없습니다."
          });
        }
      });
      expandedData.sort((a, b) => a.grade.localeCompare(b.grade));
      setLectures(expandedData); 
    });

    // 2. ★ 교수님 목록 가져오기 (추가된 코드)
    const profRef = collection(db, "professors");
    const q = query(profRef, orderBy("name"));
    const unsubProf = onSnapshot(q, (snapshot) => {
      // DB에서 가져온 이름들로 목록 업데이트
      const names = snapshot.docs.map(doc => doc.data().name);
      setProfessors(names);
    });

    return () => {
      unsubCourses();
      unsubProf();
    };
  }, []);

  useEffect(() => {
    if (filterLang === "전체") {
      setFilteredLectures(lectures);
    } else {
      setFilteredLectures(lectures.filter(lec => lec.language === filterLang));
    }
  }, [lectures, filterLang]);

  const handleToggleWish = async (docId, sectionIndex, currentApplicants) => {
    if (!myName) {
      alert("상단에서 본인 이름을 먼저 선택해주세요!");
      return;
    }
    const lectureRef = doc(db, "semesters", "2026_spring", "courses", docId);
    const fieldPath = `applicants.${sectionIndex}`;

    try {
      if (currentApplicants.includes(myName)) {
        await updateDoc(lectureRef, { [fieldPath]: arrayRemove(myName) });
      } else {
        await updateDoc(lectureRef, { [fieldPath]: arrayUnion(myName) });
      }
    } catch (error) {
      console.error("신청 실패:", error);
      alert("오류 발생");
    }
  };

  const stickyHeaderStyle = {
    position: 'sticky', top: 0, backgroundColor: '#f5f5f5', zIndex: 100,
    padding: '12px', borderBottom: '2px solid #333', color: '#444'
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#e3f2fd', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, color: '#1565c0' }}>🛒 2026-1학기 강의 희망 신청</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: 'white', padding: '8px 15px', borderRadius: '25px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <span style={{ fontWeight: 'bold' }}>👤 사용자: </span>
            <select style={{ padding: '5px', border:'none', fontSize: '16px', outline:'none' }} value={myName} onChange={(e) => setMyName(e.target.value)}>
              <option value="">-- 선택 --</option>
              {professors.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: 'bold', color: '#555' }}>🌪️ 언어 필터:</span>
          {["전체", "한국어", "영어", "중국어"].map(lang => (
            <button key={lang} onClick={() => setFilterLang(lang)}
              style={{ padding: '6px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: filterLang === lang ? '#1976d2' : 'white', color: filterLang === lang ? 'white' : '#555', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              {lang}
            </button>
          ))}
        </div>
      </header>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '14px' }}>
        <thead>
          <tr style={{ textAlign: 'center' }}>
            <th style={stickyHeaderStyle}>학년</th>
            <th style={{ ...stickyHeaderStyle, textAlign: 'left' }}>과목명 (개요보기)</th>
            <th style={{ ...stickyHeaderStyle, width: '60px' }}>예상수</th>
            <th style={{ ...stickyHeaderStyle, width: '50px' }}>분반</th>
            <th style={{ ...stickyHeaderStyle, width: '80px' }}>언어</th>
            <th style={{ ...stickyHeaderStyle, width: '100px' }}>기존 담당</th>
            <th style={{ ...stickyHeaderStyle, textAlign: 'left' }}>희망 신청 (Click)</th>
          </tr>
        </thead>
        <tbody>
          {filteredLectures.map((lecture) => {
            const isMyWish = lecture.applicants.includes(myName);
            return (
              <tr key={lecture.uniqueKey} style={{ borderBottom: '1px solid #ddd', textAlign: 'center', height: '55px', backgroundColor: isMyWish ? '#e8f5e9' : 'white' }}>
                <td style={{ color: '#666' }}>{lecture.grade}</td>
                <td 
                  onClick={() => setModalContent({ title: lecture.name, desc: lecture.description })}
                  style={{ fontWeight: 'bold', textAlign: 'left', paddingLeft: '10px', cursor: 'pointer' }}
                >
                    <span style={{ textDecoration: 'underline', textUnderlineOffset: '4px', textDecorationColor: '#bbb' }}>{lecture.name}</span>
                    <span style={{fontSize: '0.8em', color: '#999', marginLeft:'5px', textDecoration: 'none'}}>({lecture.credit})</span>
                </td>
                <td style={{ color: '#555' }}>{lecture.estStudents}</td>
                <td style={{ fontWeight: 'bold' }}>{lecture.sectionIndex}</td>
                <td style={{ fontWeight: 'bold', color: lecture.langColor }}>{lecture.language}</td>
                <td style={{ color: '#aaa', fontSize:'0.9em' }}>{lecture.prevProfessor || "-"}</td>
                <td style={{ textAlign: 'left', paddingLeft: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => handleToggleWish(lecture.docId, lecture.sectionIndex, lecture.applicants)}
                      style={{ padding: '6px 12px', cursor: 'pointer', backgroundColor: isMyWish ? '#ff5252' : '#fff', color: isMyWish ? 'white' : '#555', border: isMyWish ? 'none' : '1px solid #ccc', borderRadius: '20px', fontSize: '0.85em', fontWeight: 'bold' }}>
                      {isMyWish ? "취소 X" : "+ 희망"}
                    </button>
                    {lecture.applicants.map(profName => (
                      <span key={profName} style={{ backgroundColor: profName === myName ? '#4caf50' : '#eee', color: profName === myName ? 'white' : '#333', padding: '4px 10px', borderRadius: '15px', fontSize: '0.85em', fontWeight: 'bold' }}>{profName}</span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {modalContent && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setModalContent(null)}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '10px', width: '80%', maxWidth: '600px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, borderBottom: '2px solid #2196F3', paddingBottom: '10px' }}>📘 {modalContent.title}</h3>
            <p style={{ lineHeight: '1.6', color: '#333', fontSize: '1.1em', whiteSpace: 'pre-wrap' }}>{modalContent.desc}</p>
            <div style={{ textAlign: 'right', marginTop: '20px' }}>
              <button onClick={() => setModalContent(null)} style={{ padding: '10px 20px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CourseList;