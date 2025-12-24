// src/AdminPage.js
import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, query, orderBy, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import Papa from 'papaparse'; // CSV 파싱 라이브러리 (npm install papaparse)

const AdminPage = () => {
  const [lectures, setLectures] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  // 입력 폼 상태변수
  const [newProfName, setNewProfName] = useState("");
  const [newCourse, setNewCourse] = useState({
    grade: "1-1", department: "Global Convergence Management", name: "", credit: "3", hours: "3", estStudents: 40
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
          department: data.department || "-",
          name: data.courseName,
          credit: `${data.credits} / ${data.hours}`,
          estStudents: data.estStudents || 0,
          totalSections: data.sectionInfo?.total || 1,
          languageMap: data.languageMap || {},
          applicants: data.applicants || {}
        };
      });
      // 정렬: 학년순 -> 학과순
      lectureData.sort((a, b) => a.grade.localeCompare(b.grade) || a.department.localeCompare(b.department));
      setLectures(lectureData);
    });

    // 2. 교수님 목록 가져오기
    const profRef = collection(db, "professors");
    const q = query(profRef, orderBy("name"));
    const unsubProf = onSnapshot(q, (snapshot) => {
      const profList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProfessors(profList);
    });

    return () => {
      unsubCourses();
      unsubProf();
    };
  }, []);

  // --- 기능 0: CSV 일괄 업로드 (New!) ---
  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);

    Papa.parse(file, {
      header: true, // 첫 줄을 제목으로 인식
      skipEmptyLines: true, // 빈 줄 무시
      encoding: "UTF-8", // 한글 깨짐 방지 핵심!
      complete: async (results) => {
        try {
          const jsonData = results.data;
          
          // 데이터가 비었으면 중단
          if (jsonData.length === 0) {
            alert("데이터가 없거나 형식이 잘못되었습니다.");
            setIsUploading(false);
            return;
          }

          // 병합된 셀(빈칸) 채우기용 변수
          let lastDept = "";
          let lastGrade = "";

          const batch = writeBatch(db);
          let count = 0;

          jsonData.forEach((row) => {
            // 1. 빈칸 채우기 (엑셀의 '셀 병합' 효과 내기)
            if (row['학과'] && row['학과'].trim() !== "") lastDept = row['학과'];
            if (row['학년'] && row['학년'].trim() !== "") lastGrade = row['학년'];

            // 2. 필수 데이터 확인
            if (!row['과목명']) return;

            // 3. 데이터 정제 및 객체 생성
            const courseData = {
              department: row['학과'] || lastDept,
              targetGrade: String(row['학년'] || lastGrade),
              courseName: row['과목명'],
              credits: Number(row['학점'] || 3),
              hours: Number(row['시수'] || 3),
              estStudents: Number(row['예상 학생 수'] || 0),
              description: row['과목개요'] || "Major",
              sectionInfo: { total: Number(row['예상분반수'] || 1) },
              prevProfInfo: { name: row['작년 담당교수'] || "", note: "" },
              languageMap: { "1": "영어" }, // 기본값 영어 (나중에 변경 가능)
              applicants: {},
              createdAt: new Date()
            };

            const newDocRef = doc(collection(db, "semesters", "2026_spring", "courses"));
            batch.set(newDocRef, courseData);
            count++;
          });

          await batch.commit();
          alert(`성공! 총 ${count}개의 강의가 등록되었습니다.`);

        } catch (error) {
          console.error("CSV Upload Error:", error);
          alert("업로드 중 오류 발생. 콘솔을 확인하세요.");
        } finally {
          setIsUploading(false);
          e.target.value = ""; // 파일 입력 초기화
        }
      },
      error: (error) => {
        console.error("CSV Parse Error:", error);
        alert("CSV 파일을 읽는 중 오류가 발생했습니다.");
        setIsUploading(false);
      }
    });
  };

  // --- 기존 기능들 (교수 추가, 강의 개설, 수정) ---
  const handleAddProfessor = async () => {
    if (!newProfName.trim()) return;
    await addDoc(collection(db, "professors"), { name: newProfName });
    setNewProfName("");
  };

  const handleDeleteProfessor = async (id) => {
    if (window.confirm("정말 삭제하시겠습니까?")) {
      await deleteDoc(doc(db, "professors", id));
    }
  };

  const handleAddCourse = async () => {
    if (!newCourse.name) { alert("과목명을 입력하세요"); return; }
    await addDoc(collection(db, "semesters", "2026_spring", "courses"), {
      targetGrade: newCourse.grade,
      department: newCourse.department,
      courseName: newCourse.name,
      credits: Number(newCourse.credit),
      hours: Number(newCourse.hours),
      estStudents: Number(newCourse.estStudents),
      sectionInfo: { total: 1 },
      applicants: {},
      languageMap: { "1": "영어" },
      description: "Major",
      createdAt: new Date()
    });
    setNewCourse({ ...newCourse, name: "" });
    alert("새 과목이 개설되었습니다!");
  };

  const handleEstStudentsChange = async (docId, val) => updateDoc(doc(db, "semesters", "2026_spring", "courses", docId), { estStudents: Number(val) });
  const handleSectionCountChange = async (docId, val) => updateDoc(doc(db, "semesters", "2026_spring", "courses", docId), { "sectionInfo.total": Number(val) });
  const handleLanguageChange = async (docId, secIdx, val) => updateDoc(doc(db, "semesters", "2026_spring", "courses", docId), { [`languageMap.${secIdx}`]: val });

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#fff3e0', minHeight: '100vh' }}>
      <header style={{ marginBottom: '20px', padding: '20px', backgroundColor: '#ff9800', color: 'white', borderRadius: '8px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h2 style={{ margin: 0 }}>🛠️ 관리자 모드 (CSV 지원)</h2>
        <div style={{ backgroundColor: 'white', padding: '10px', borderRadius: '5px', display:'flex', alignItems:'center', gap:'10px' }}>
            <span style={{color: '#333', fontWeight:'bold', fontSize:'0.9rem'}}>📊 CSV 업로드: </span>
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleCsvUpload} 
              disabled={isUploading}
              style={{ fontSize: '0.9rem' }}
            />
            {isUploading && <span style={{color:'red', fontWeight:'bold'}}>업로드 중...</span>}
        </div>
      </header>

      {/* 교수진 관리 및 신규 강의 개설 섹션은 동일하므로 생략 없이 위 코드에 포함됨 */}
      <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, color: '#e65100' }}>👥 교수진 관리</h3>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <input type="text" placeholder="교수님 성함" value={newProfName} onChange={(e) => setNewProfName(e.target.value)} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
          <button onClick={handleAddProfessor} style={{ padding: '8px 16px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>추가</button>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {professors.map(p => (
            <span key={p.id} style={{ padding: '5px 10px', backgroundColor: '#eee', borderRadius: '15px', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '5px' }}>
              {p.name} <button onClick={() => handleDeleteProfessor(p.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'red', fontWeight: 'bold' }}>x</button>
            </span>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, color: '#e65100' }}>📘 신규 강의 개설 (직접 입력)</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="text" placeholder="과목명" value={newCourse.name} onChange={(e) => setNewCourse({...newCourse, name: e.target.value})} style={{ padding: '8px', width: '200px' }} />
          <button onClick={handleAddCourse} style={{ padding: '8px 16px', backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>강의 생성</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ef6c00', textAlign: 'center', backgroundColor: '#ffe0b2', color: '#bf360c' }}>
              <th style={{ padding: '12px' }}>학년</th>
              <th style={{ padding: '12px' }}>학과</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>과목명</th>
              <th style={{ padding: '12px' }}>분반 수</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>언어 설정</th>
            </tr>
          </thead>
          <tbody>
            {lectures.map((lecture) => (
              <tr key={lecture.id} style={{ borderBottom: '1px solid #eee', textAlign: 'center', height: '50px' }}>
                <td>{lecture.grade}</td>
                <td style={{ fontSize: '0.9em', color: '#666' }}>{lecture.department}</td>
                <td style={{ textAlign: 'left', fontWeight: 'bold' }}>{lecture.name}</td>
                <td>
                  <input type="number" min="1" value={lecture.totalSections} onChange={(e) => handleSectionCountChange(lecture.id, e.target.value)} style={{ width: '40px', textAlign: 'center', fontWeight: 'bold', color: '#e65100' }} />
                </td>
                <td style={{ textAlign: 'left' }}>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {Array.from({ length: lecture.totalSections }, (_, i) => i + 1).map(secNum => (
                      <select key={secNum} value={lecture.languageMap[secNum] || "영어"} onChange={(e) => handleLanguageChange(lecture.id, secNum, e.target.value)} style={{ fontSize: '0.8em' }}>
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