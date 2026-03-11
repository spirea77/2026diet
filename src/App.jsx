import { useState, useEffect } from "react";

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];

const ITEMS = [
  { key: "fasting",   label: "간헐적단식", icon: "⏱️", color: "#a8c45a" },
  { key: "olive",     label: "올리브오일", icon: "🫒", color: "#c4a45a" },
  { key: "saltwater", label: "소금물",     icon: "🧂", color: "#5ac4c4" },
  { key: "vinegar",   label: "식초+레몬즙",icon: "🍋", color: "#c4915a" },
  { key: "exercise",  label: "운동",       icon: "💪", color: "#c45a8e" },
];

function pad(n) { return String(n).padStart(2, "0"); }

function generateTimeOptions() {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) {
      const label = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      options.push(label);
    }
  }
  return options;
}

function addHours(timeStr, hours) {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + hours * 60;
  const nh = Math.floor((total % (24 * 60)) / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function getWeekDates(weekOffset = 0) {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day === 0 ? 7 : day) - 1) + weekOffset * 7);
  
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function loadStorage() {
  try { return JSON.parse(localStorage.getItem("iftracker") || "{}"); } catch { return {}; }
}
function saveStorage(data) {
  localStorage.setItem("iftracker", JSON.stringify(data));
}

const timeOptions = generateTimeOptions();

// ─── Styles (폰트 제거 및 글자색 밝게 수정 완료) ──────────────────────────────────
const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #121212;
    --surface: #1e1e1e;
    --surface2: #2a2a2a;
    --accent: #a8c45a;
    --accent2: #d4e88a;
    --accent3: #6b8f2e;
    --text: #ffffff;
    --text2: #e0e0e0;
    --text3: #aaaaaa;
    --border: #333333;
    --gold: #c4a45a;
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    min-height: 100vh;
  }

  .app-header {
    text-align: center;
    padding: 48px 20px 32px;
    border-bottom: 1px solid var(--border);
    position: relative;
  }
  .app-header::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), transparent);
  }
  .header-label { font-size: 12px; letter-spacing: 2px; color: var(--accent); text-transform: uppercase; margin-bottom: 12px; font-weight: bold; }
  .header-title { font-size: clamp(28px, 5vw, 42px); font-weight: 800; letter-spacing: -1px; color: var(--text); }
  .header-title span { color: var(--accent); }
  .header-sub { margin-top: 10px; color: var(--text3); font-size: 14px; }

  .main { max-width: 900px; margin: 0 auto; padding: 32px 20px; }

  .date-bar {
    display: flex; align-items: center; justify-content: center; gap: 16px;
    margin-bottom: 28px; padding: 14px 24px;
    background: var(--surface); border: 1px solid var(--border); border-radius: 6px;
  }
  .date-bar button {
    background: none; border: 1px solid var(--border); color: var(--text2);
    cursor: pointer; width: 32px; height: 32px; border-radius: 4px; font-size: 14px;
    display: flex; align-items: center; justify-content: center; transition: all 0.2s;
  }
  .date-bar button:hover { border-color: var(--accent); color: var(--accent); }
  .date-label { font-size: 15px; font-weight: bold; color: var(--accent2); min-width: 200px; text-align: center; }

  .time-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
  @media (max-width: 580px) { .time-grid { grid-template-columns: 1fr; } }

  .time-card {
    background: var(--surface); border: 1px solid var(--border); border-radius: 6px;
    padding: 24px; position: relative; overflow: hidden;
  }
  .time-card::after {
    content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%;
    background: var(--accent3);
  }
  .time-card.end::after { background: var(--gold); }
  .card-label { font-size: 13px; font-weight: bold; color: var(--text2); margin-bottom: 16px; }

  .time-select-row { display: flex; align-items: center; gap: 8px; }
  .time-select {
    background: var(--surface2); border: 1px solid var(--border); color: var(--text);
    font-size: 28px; font-weight: 700; padding: 10px; border-radius: 6px; cursor: pointer; width: 130px;
    appearance: none; text-align: center; transition: border-color 0.2s;
  }
  .time-select:focus { outline: none; border-color: var(--accent); }
  .end-time { font-size: 36px; font-weight: 800; color: var(--gold); }
  .time-hint { font-size: 13px; color: var(--text3); margin-top: 10px; }
  .time-hint b { color: var(--gold); }

  .section-card { background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 24px; margin-bottom: 20px; }
  .section-label {
    font-size: 13px; font-weight: bold; color: var(--text2); margin-bottom: 18px;
    display: flex; align-items: center; gap: 12px;
  }
  .section-label::after { content: ''; flex: 1; height: 1px; background: var(--border); }

  .check-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(155px, 1fr)); gap: 12px; }

  .check-item {
    display: flex; align-items: center; gap: 10px; padding: 14px;
    background: var(--surface2); border: 1px solid var(--border); border-radius: 6px;
    cursor: pointer; transition: all 0.2s; user-select: none;
  }
  .check-item:hover { border-color: var(--accent3); }
  .check-item.checked { background: rgba(168,196,90,0.1); border-color: var(--accent); }

  .check-box {
    width: 20px; height: 20px; border: 2px solid var(--text3); border-radius: 4px;
    flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    font-size: 12px; transition: all 0.2s; color: var(--bg); font-weight: bold;
  }
  .check-item.checked .check-box { background: var(--accent); border-color: var(--accent); }
  .check-label { font-size: 14px; color: var(--text2); transition: color 0.2s; font-weight: 500; }
  .check-item.checked .check-label { color: var(--accent2); font-weight: bold; }

  .progress-bar { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; margin-top: 4px; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, var(--accent3), var(--accent)); transition: width 0.4s ease; }
  .progress-text { font-size: 12px; color: var(--text3); margin-top: 8px; font-weight: bold; }

  .action-row { display: flex; gap: 12px; margin-bottom: 40px; }
  @media (max-width: 580px) { .action-row { flex-direction: column; } }

  .save-btn {
    flex: 2; padding: 16px; background: var(--accent); color: var(--bg);
    border: none; border-radius: 6px; font-size: 15px; font-weight: 800; 
    cursor: pointer; transition: background 0.2s;
  }
  .save-btn:hover { background: var(--accent2); }

  .export-btn {
    flex: 1; padding: 16px; background: var(--surface2); color: var(--text);
    border: 1px solid var(--border); border-radius: 6px; font-size: 14px; font-weight: 600; 
    cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px;
  }
  .export-btn:hover { background: var(--surface); border-color: var(--accent); color: var(--accent); }

  .week-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .week-nav button {
    background: var(--surface2); border: 1px solid var(--border); color: var(--text2);
    cursor: pointer; padding: 8px 16px; border-radius: 4px; font-size: 13px; transition: all 0.2s;
  }
  .week-nav button:hover { border-color: var(--accent); color: var(--accent); }
  .week-range { font-size: 14px; color: var(--text2); font-weight: bold; }

  .week-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; }
  @media (max-width: 580px) { .week-grid { gap: 6px; } }

  .day-card {
    background: var(--surface); border: 1px solid var(--border); border-radius: 6px;
    padding: 14px 8px; text-align: center; min-height: 140px; display: flex; flex-direction: column;
  }
  .day-card.today { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
  .day-card.has-data { background: var(--surface2); }
  .day-name { font-size: 11px; color: var(--text3); margin-bottom: 6px; font-weight: bold; }
  .day-num { font-size: 18px; font-weight: 800; color: var(--text2); margin-bottom: 12px; }
  .day-card.today .day-num { color: var(--accent); }
  
  .day-times { font-size: 11px; color: var(--text3); margin-bottom: 10px; line-height: 1.4; background: rgba(0,0,0,0.2); padding: 4px; border-radius: 4px; }
  .day-dots { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; margin-top: auto; }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border); }
  .day-score { font-size: 11px; color: var(--text3); margin-top: 8px; font-weight: bold; }

  .legend { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 20px; padding: 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; justify-content: center; }
  .legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text2); font-weight: 500; }
  .legend-dot { width: 12px; height: 12px; border-radius: 50%; }

  .toast {
    position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%) translateY(100px);
    background: var(--accent); color: var(--bg); padding: 14px 32px; border-radius: 50px;
    font-size: 14px; font-weight: 800; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); z-index: 999; pointer-events: none;
  }
  .toast.show { transform: translateX(-50%) translateY(0); }
`;

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [currentDateKey, setCurrentDateKey] = useState(getTodayKey());
  const [startTime, setStartTime] = useState("20:00"); // 저녁 8시 기본값 세팅
  const [checked, setChecked] = useState({});
  const [weekOffset, setWeekOffset] = useState(0);
  const [toast, setToast] = useState(false);

  const endTime = addHours(startTime, 16);
  const todayKey = getTodayKey();

  // 날짜가 바뀔 때마다 저장된 데이터 불러오기
  useEffect(() => {
    const data = loadStorage();
    const rec = data[currentDateKey];
    if (rec) {
      setStartTime(rec.startTime || "20:00");
      setChecked(rec.checked || {});
    } else {
      setStartTime("20:00");
      setChecked({});
    }
  }, [currentDateKey]);

  const checkedCount = ITEMS.filter(i => checked[i.key]).length;
  const progressPct = (checkedCount / ITEMS.length) * 100;

  function toggleItem(key) {
    setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function changeDate(delta) {
    const [y, m, d] = currentDateKey.split("-").map(Number);
    const nd = new Date(y, m - 1, d);
    nd.setDate(nd.getDate() + delta);
    setCurrentDateKey(`${nd.getFullYear()}-${pad(nd.getMonth() + 1)}-${pad(nd.getDate())}`);
  }

  function formatDateLabel(key) {
    const [y, m, d] = key.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    return `${y}년 ${m}월 ${d}일 (${dayNames[date.getDay()]})`;
  }

  function saveDay() {
    const data = loadStorage();
    data[currentDateKey] = { startTime, endTime, checked };
    saveStorage(data);
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  }

  // 엑셀(CSV) 다운로드 기능 추가
  function exportToCSV() {
    const data = loadStorage();
    const dates = Object.keys(data).sort();
    
    if (dates.length === 0) {
      alert("내보낼 데이터가 없습니다. 먼저 기록을 저장해주세요!");
      return;
    }

    // 엑셀 파일의 첫 줄 (항목 이름)
    let csvContent = "날짜,단식시작(저녁),단식종료(아침),";
    ITEMS.forEach(item => { csvContent += `${item.label},`; });
    csvContent += "총 달성률\n";

    // 저장된 데이터를 한 줄씩 엑셀 양식으로 변환
    dates.forEach(date => {
      const rec = data[date];
      let row = `${date},${rec.startTime || ""},${rec.endTime || ""},`;
      let score = 0;
      
      ITEMS.forEach(item => {
        const isDone = rec.checked && rec.checked[item.key];
        row += `${isDone ? "O" : "X"},`;
        if (isDone) score++;
      });
      
      row += `${score}/${ITEMS.length}\n`;
      csvContent += row;
    });

    // 한글 깨짐 방지용 코드(\uFEFF)와 함께 파일 다운로드 실행
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "간헐적단식_기록.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const weekDates = getWeekDates(weekOffset);
  const data = loadStorage();

  const weekStart = weekDates[0].slice(5).replace("-", "/");
  const weekEnd = weekDates[6].slice(5).replace("-", "/");

  return (
    <>
      <style>{css}</style>

      <header className="app-header">
        <div className="header-label">16:8 Protocol</div>
        <h1 className="header-title">간헐적 <span>단식</span> 트래커</h1>
        <p className="header-sub">Intermittent Fasting Daily Log</p>
      </header>

      <main className="main">
        {/* 날짜 이동 바 */}
        <div className="date-bar">
          <button onClick={() => changeDate(-1)}>◀</button>
          <span className="date-label">{formatDateLabel(currentDateKey)}</span>
          <button onClick={() => changeDate(1)}>▶</button>
        </div>

        {/* 시간 설정 (저녁 -> 아침 순서로 변경 완료) */}
        <div className="time-grid">
          <div className="time-card">
            <div className="card-label">🌙 단식 시작 (저녁)</div>
            <div className="time-select-row">
              <select
                className="time-select"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
              >
                {timeOptions.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="time-hint">마지막 식사를 마친 시각을 선택하세요</div>
          </div>
          
          <div className="time-card end">
            <div className="card-label">🌅 단식 종료 (다음날 아침)</div>
            <div className="end-time">{endTime}</div>
            <div className="time-hint">시작 후 <b>16시간</b> 뒤 자동 계산</div>
          </div>
        </div>

        {/* 체크리스트 */}
        <div className="section-card">
          <div className="section-label">오늘의 실천 항목</div>
          <div className="check-grid">
            {ITEMS.map(item => (
              <div
                key={item.key}
                className={`check-item${checked[item.key] ? " checked" : ""}`}
                onClick={() => toggleItem(item.key)}
              >
                <div className="check-box">{checked[item.key] ? "✓" : ""}</div>
                <span>{item.icon}</span>
                <span className="check-label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 달성률 바 */}
        <div className="section-card" style={{ padding: "20px 24px" }}>
          <div className="section-label">오늘 달성률</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="progress-text">{checkedCount} / {ITEMS.length} 항목 완료</div>
        </div>

        {/* 저장 및 엑셀 내보내기 버튼 */}
        <div className="action-row">
          <button className="save-btn" onClick={saveDay}>✓ 오늘 기록 저장</button>
          <button className="export-btn" onClick={exportToCSV}>📥 엑셀(CSV) 내보내기</button>
        </div>

        {/* 주간 기록 달력 */}
        <div className="section-card">
          <div className="section-label">주간 현황 한눈에 보기</div>
          <div className="week-nav">
            <button onClick={() => setWeekOffset(w => w - 1)}>◀ 이전 주</button>
            <span className="week-range">{weekStart} ~ {weekEnd}</span>
            <button onClick={() => setWeekOffset(w => w + 1)}>다음 주 ▶</button>
          </div>

          <div className="week-grid">
            {weekDates.map((key, i) => {
              const rec = data[key];
              const [, , d] = key.split("-").map(Number);
              const isToday = key === todayKey;
              const score = rec ? ITEMS.filter(item => rec.checked?.[item.key]).length : 0;
              
              return (
                <div key={key} className={`day-card${isToday ? " today" : ""}${rec ? " has-data" : ""}`}>
                  <div className="day-name">{DAYS[i]}</div>
                  <div className="day-num">{d}</div>
                  {rec && (
                    <>
                      <div className="day-times">
                        {rec.startTime}<br/>↓<br/>{rec.endTime}
                      </div>
                      <div className="day-dots">
                        {ITEMS.map(item => (
                          <div
                            key={item.key}
                            className={`dot${rec.checked?.[item.key] ? " done" : ""}`}
                            style={rec.checked?.[item.key] ? { background: item.color } : {}}
                            title={item.label}
                          />
                        ))}
                      </div>
                      <div className="day-score">{score}/{ITEMS.length}</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="legend">
            {ITEMS.map(item => (
              <div key={item.key} className="legend-item">
                <div className="legend-dot" style={{ background: item.color }} />
                {item.label}
              </div>
            ))}
          </div>
        </div>

      </main>

      <div className={`toast${toast ? " show" : ""}`}>기록이 안전하게 저장되었습니다!</div>
    </>
  );
}