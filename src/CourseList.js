import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';

const CourseList = () => {
  const [lectures, setLectures] = useState([]);
  const [myId, setMyId] = useState(""); 
  const [professors, setProfessors] = useState([]); 

  // --- 필터 상태 ---
  const [selectedLang, setSelectedLang] = useState("ALL"); // 강의 언어 필터
  const [selectedDept, setSelectedDept] = useState("ALL"); // 학과 필터
  
  // --- UI 언어 상태 (기본값: 한국어) ---
  const [uiLang, setUiLang] = useState("KO"); // KO, EN, CN

  // 🌐 다국어 사전 (Interface Translations)
  const t = {
    KO: {
      title: "2026-1학기 강의 희망 신청",
      profName: "교수님 성함",
      selectPlace: "-- 선택하세요 --",
      filterDept: "학과 필터",
      filterLang: "강의 언어 필터",
      all: "전체",
      korean: "한국어",
      english: "영어",
      chinese: "중국어",
      grade: "학년",
      credit: "학점",
      est: "예상",
      students: "명",
      noDesc: "강의 설명이 없습니다.",
      section: "분반",
      applicant: "신청자",
      cancel: "취소 X",
      apply: "+ 신청",
      noResult: "조건에 맞는 강의가 없습니다. 😅",
      alertNoName: "먼저 상단에서 본인의 이름을 선택해주세요!",
      unknown: "미정"
    },
    EN: {
      title: "Course Application Spring 2026",
      profName: "Professor Name",
      selectPlace: "-- Select Name --",
      filterDept: "Department Filter",
      filterLang: "Instruction Language",
      all: "All",
      korean: "Korean",
      english: "English",
      chinese: "Chinese",
      grade: "Year",
      credit: "Credits",
      est: "Est.",
      students: "students",
      noDesc: "No description available.",
      section: "Sec",
      applicant: "Applicants",
      cancel: "Cancel X",
      apply: "+ Apply",
      noResult: "No courses found matching your criteria. 😅",
      alertNoName: "Please select your name at the top first!",
      unknown: "TBD"
    },
    CN: {
      title: "2026年春季学期 授课申请",
      profName: "教授姓名",
      selectPlace: "-- 请选择 --",
      filterDept: "学科筛选",
      filterLang: "授课语言",
      all: "全部",
      korean: "韩语",
      english: "英语",
      chinese: "中文",
      grade: "年级",
      credit: "学分",
      est: "预计",
      students: "人",
      noDesc: "暂无课程说明。",
      section: "分班",
      applicant: "申请人",
      cancel: "取消 X",
      apply: "+ 申请",
      noResult: "未找到符合条件的课程。 😅",
      alertNoName: "请先在上方选择您的姓名！",
      unknown: "未定"
    }
  };

  const ui = t[uiLang]; // 현재 선택된 언어팩

  useEffect(() => {
    const q = query(collection(db, "semesters", "2026_spring", "courses"), orderBy("courseName"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lectureData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          department: data.department || "Etc", 
          languageMap: data.languageMap || {},
          applicants: data.applicants || {}
        };
      });
      lectureData.sort((a, b) => 
        a.department.localeCompare(b.department) || 
        a.targetGrade.localeCompare(b.targetGrade) ||
        a.courseName.localeCompare(b.courseName)
      );
      setLectures(lectureData);
    });

    const profRef = collection(db, "professors");
    const qProf = query(profRef, orderBy("name"));
    const unsubProf = onSnapshot(qProf, (snapshot) => {
      setProfessors(snapshot.docs.map(d => d.data().name));
    });

    return () => {
      unsubscribe();
      unsubProf();
    };
  }, []);

  const handleApply = async (lectureId, section) => {
    if (!myId) { alert(ui.alertNoName); return; }
    const lectureRef = doc(db, "semesters", "2026_spring", "courses", lectureId);
    await updateDoc(lectureRef, { [`applicants.${section}`]: arrayUnion(myId) });
  };

  const handleCancel = async (lectureId, section) => {
    if (!myId) return;
    const lectureRef = doc(db, "semesters", "2026_spring", "courses", lectureId);
    await updateDoc(lectureRef, { [`applicants.${section}`]: arrayRemove(myId) });
  };

  const allDepartments = ["ALL", ...new Set(lectures.map(l => l.department))];

  const filteredLectures = lectures.filter(lecture => {
    const deptMatch = selectedDept === "ALL" || lecture.department === selectedDept;
    
    // DB에 저장된 언어값("한국어","영어" 등)을 필터링하기 위한 매핑
    // selectedLang이 'ALL'이 아니면, 해당 분반 언어목록에 포함되는지 확인
    const sectionLangs = Object.values(lecture.languageMap);
    
    // 필터 로직: 언어 필터가 'ALL'이면 통과, 아니면 해당 언어(예: "영어")가 포함된 분반이 있어야 함
    let langMatch = true;
    if (selectedLang !== "ALL") {
       // selectedLang 값은 "한국어", "영어", "중국어" (아래 버튼 value 참조)
       langMatch = sectionLangs.includes(selectedLang);
    }

    return deptMatch && langMatch;
  });

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      {/* 1. 헤더 & 언어 설정 & 로그인 */}
      <header style={{ borderBottom: '2px solid #eee', paddingBottom: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h1 style={{ color: '#1565c0', margin: 0 }}>{ui.title}</h1>
          
          {/* 🌍 UI 언어 변경 버튼 */}
          <div style={{ display: 'flex', gap: '5px' }}>
            <button onClick={() => setUiLang("KO")} style={{ opacity: uiLang==="KO"?1:0.5, cursor:'pointer', border:'none', background:'none', fontSize:'1.5rem' }}>🇰🇷</button>
            <button onClick={() => setUiLang("EN")} style={{ opacity: uiLang==="EN"?1:0.5, cursor:'pointer', border:'none', background:'none', fontSize:'1.5rem' }}>🇺🇸</button>
            <button onClick={() => setUiLang("CN")} style={{ opacity: uiLang==="CN"?1:0.5, cursor:'pointer', border:'none', background:'none', fontSize:'1.5rem' }}>🇨🇳</button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-end' }}>
          <span style={{ fontWeight:'bold' }}>{ui.profName}: </span>
          <select 
            value={myId} 
            onChange={(e) => setMyId(e.target.value)}
            style={{ padding: '8px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="">{ui.selectPlace}</option>
            {professors.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
      </header>

      {/* 2. 필터 컨트롤 영역 */}
      <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
        
        {/* 학과 필터 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: 'bold', color: '#555' }}>🏫 {ui.filterDept}:</span>
          <select 
            value={selectedDept} 
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '150px' }}
          >
            {allDepartments.map(dept => (
              <option key={dept} value={dept}>{dept === "ALL" ? ui.all : dept}</option>
            ))}
          </select>
        </div>

        {/* 강의 언어 필터 (DB 데이터 기준) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: 'bold', color: '#555' }}>🗣️ {ui.filterLang}:</span>
          <div style={{ display: 'flex', gap: '5px' }}>
            {[
              { label: ui.all, val: "ALL" },
              { label: ui.korean, val: "한국어" },
              { label: ui.english, val: "영어" },
              { label: ui.chinese, val: "중국어" }
            ].map(opt => (
              <button
                key={opt.val}
                onClick={() => setSelectedLang(opt.val)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  backgroundColor: selectedLang === opt.val ? '#1565c0' : '#e0e0e0',
                  color: selectedLang === opt.val ? 'white' : '#333',
                  transition: '0.2s'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. 강의 카드 리스트 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {filteredLectures.map(lecture => (
          <div key={lecture.id} style={{ border: '1px solid #ddd', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', backgroundColor: 'white', position: 'relative', overflow: 'hidden' }}>
            
            <div style={{ position: 'absolute', top: '0', right: '0', backgroundColor: '#e3f2fd', color: '#1565c0', padding: '5px 10px', fontSize: '0.8em', borderBottomLeftRadius: '10px', fontWeight: 'bold' }}>
              {lecture.department}
            </div>

            {/* 과목명은 번역하지 않고 DB 그대로 출력 */}
            <h3 style={{ marginTop: '10px', marginBottom: '5px', color: '#333' }}>{lecture.courseName}</h3>
            <p style={{ margin: 0, color: '#666', fontSize: '0.9em' }}>
              {lecture.targetGrade}{ui.grade} | {lecture.credits}{ui.credit} | {ui.est} {lecture.estStudents}{ui.students}
            </p>
            <p style={{ fontSize: '0.85em', color: '#999', marginTop: '5px' }}>
              {lecture.description || ui.noDesc}
            </p>

            <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px solid #eee' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Array.from({ length: lecture.sectionInfo?.total || 1 }, (_, i) => i + 1).map(sec => {
                const applicants = lecture.applicants?.[sec] || [];
                const isApplied = applicants.includes(myId);
                const lang = lecture.languageMap?.[sec] || ui.unknown;

                // 필터 적용 (언어 필터가 켜져있으면 해당 안되는 분반 숨김)
                if (selectedLang !== "ALL" && lang !== selectedLang) return null;

                // 언어 표시 텍스트 변환 (DB값 -> UI 언어)
                let langDisplay = lang;
                if(lang === "한국어") langDisplay = ui.korean;
                if(lang === "영어") langDisplay = ui.english;
                if(lang === "중국어") langDisplay = ui.chinese;

                return (
                  <div key={sec} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                    <div>
                      <span style={{ fontWeight: 'bold', marginRight: '5px' }}>{sec}{ui.section}</span>
                      <span style={{ fontSize: '0.8em', padding: '2px 6px', borderRadius: '4px', backgroundColor: lang === '영어' ? '#e8f5e9' : '#fff3e0', color: lang === '영어' ? '#2e7d32' : '#e65100' }}>
                        {langDisplay}
                      </span>
                      <div style={{ fontSize: '0.8em', color: '#666', marginTop: '2px' }}>
                        {ui.applicant}: {applicants.length > 0 ? applicants.join(", ") : "-"}
                      </div>
                    </div>

                    {isApplied ? (
                      <button onClick={() => handleCancel(lecture.id, sec)} style={{ backgroundColor: '#ffcdd2', color: '#c62828', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em' }}>
                        {ui.cancel}
                      </button>
                    ) : (
                      <button onClick={() => handleApply(lecture.id, sec)} style={{ backgroundColor: '#1565c0', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em' }}>
                        {ui.apply}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      {filteredLectures.length === 0 && (
        <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
          {ui.noResult}
        </div>
      )}
    </div>
  );
};

export default CourseList;