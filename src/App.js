import { useState, useRef, useEffect, useCallback } from "react";

// ── Palette ───────────────────────────────────────────────
const C = {
  pageBg:     "#F5F0E8",
  sidebar:    "#1E1A12",
  sideHov:    "#2C2518",
  sideAct:    "#2C2518",
  accent:     "#C94F0A",
  accentHov:  "#A83F08",
  card:       "#FFFFFF",
  cardHov:    "#FDFAF6",
  border:     "#E2D9CE",
  borderSoft: "#EDE6DC",
  text:       "#1A1510",
  text2:      "#6E6358",
  text3:      "#ADA196",
  inputBg:    "#EDE8E0",
  doneText:   "#A09488",
  shadow:     "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd:   "0 4px 14px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06)",
  shadowDrag: "0 8px 28px rgba(0,0,0,0.16), 0 2px 6px rgba(0,0,0,0.1)",
};

const PRI = {
  high: { color: "#B83232", bg: "#FBF0F0", label: "High" },
  mid:  { color: "#C94F0A", bg: "#FBF3EE", label: "Medium" },
  low:  { color: "#3A7A50", bg: "#EEF7F1", label: "Low" },
};
const CAT = {
  work:     { ink: "#1E56A0", bg: "#EEF4FC", label: "Work" },
  personal: { ink: "#7B2F8A", bg: "#F6EEF8", label: "Personal" },
  health:   { ink: "#246B42", bg: "#EEF6F1", label: "Health" },
  study:    { ink: "#9A6510", bg: "#FBF5E8", label: "Study" },
};
const QUOTES = ["Begin.", "Keep going.", "One thing at a time.", "Stay the course.", "Almost there.", "Well done.", "All clear."];
const SEEDS = [
  { id: 1, text: "Review project proposal",    done: false, priority: "high", cat: "work",     due: "2026-06-09", ts: Date.now() - 5000 },
  { id: 2, text: "Morning run — 5 km",        done: false, priority: "mid",  cat: "health",   due: "2026-06-10", ts: Date.now() - 4000 },
  { id: 3, text: "Read 30 pages",            done: true,  priority: "low",  cat: "study",    due: "",           ts: Date.now() - 3000 },
  { id: 4, text: "Call mom",                 done: false, priority: "mid",  cat: "personal", due: "2026-06-15", ts: Date.now() - 2000 },
  { id: 5, text: "Fix login bug",            done: true,  priority: "high", cat: "work",     due: "",           ts: Date.now() - 1000 },
  { id: 6, text: "Drink 8 glasses of water", done: false, priority: "low",  cat: "health",   due: "2026-06-10", ts: Date.now() - 500 },
];

// ── Helpers ───────────────────────────────────────────────
const todayStr  = () => new Date().toISOString().split("T")[0];
const isOverdue = d  => d && new Date(d) < new Date(new Date().toDateString());
const isToday   = d  => d && d === todayStr();
function dueLabel(d) {
  if (!d) return null;
  if (isToday(d))   return { text: "Today",   late: false, today: true };
  if (isOverdue(d)) return { text: "Overdue", late: true,  today: false };
  const dt = new Date(d);
  return { text: dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }), late: false, today: false };
}
function ago(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)   return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  return Math.floor(s / 3600) + "h ago";
}

// ── Spark ─────────────────────────────────────────────────
function Spark({ x, y, color, onDone }) {
  const a = useRef(Math.random() * 2 * Math.PI);
  const r = useRef(26 + Math.random() * 34);
  useEffect(() => { const t = setTimeout(onDone, 600); return () => clearTimeout(t); }, [onDone]);
  return <div style={{
    position: "fixed", left: x, top: y, width: 6, height: 6, borderRadius: "50%",
    background: color, pointerEvents: "none", zIndex: 9999,
    animation: "spark 0.55s ease forwards",
    "--tx": `${Math.cos(a.current) * r.current}px`,
    "--ty": `${Math.sin(a.current) * r.current}px`,
  }} />;
}

// ── Sidebar nav item ──────────────────────────────────────
function SLink({ label, n, active, dot, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", padding: "8px 16px", border: "none", cursor: "pointer",
        background: active ? C.sideAct : hov ? "#28200F" : "transparent",
        color: active ? "#F0E8D8" : "#7A6848",
        fontSize: 13, fontFamily: "inherit", textAlign: "left",
        borderRadius: 6, marginBottom: 2,
        transition: "background 0.12s, color 0.12s",
        borderLeft: active ? "2px solid " + C.accent : "2px solid transparent",
      }}
    >
      {dot
        ? <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot, flexShrink: 0, opacity: active ? 1 : 0.55 }} />
        : <span style={{ width: 8, flexShrink: 0 }} />
      }
      <span style={{ flex: 1, letterSpacing: 0.1 }}>{label}</span>
      {n > 0 && (
        <span style={{
          fontSize: 11, fontVariantNumeric: "tabular-nums", fontWeight: 500,
          color: active ? "#C89060" : "#4A3A24",
          background: active ? "rgba(200,144,96,0.12)" : "rgba(255,255,255,0.05)",
          padding: "1px 7px", borderRadius: 10,
        }}>{n}</span>
      )}
    </button>
  );
}

// ── Inline-editable Task Card ─────────────────────────────
function TaskCard({ t, onToggle, onDelete, onEdit, dragHandleProps, isDragging, isOver }) {
  const [hov, setHov] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(t.text);
  const editRef = useRef();

  const due = dueLabel(t.due);
  const p = PRI[t.priority];
  const cc = CAT[t.cat];
  const ov = !t.done && isOverdue(t.due);

  const commitEdit = () => {
    const v = editText.trim();
    if (v && v !== t.text) onEdit(t.id, { text: v });
    else setEditText(t.text);
    setEditing(false);
  };

  useEffect(() => { if (editing) editRef.current?.focus(); }, [editing]);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "flex-start", gap: 12,
        padding: "14px 16px",
        background: isDragging ? "#FEFCF8" : hov ? C.cardHov : C.card,
        border: `1px solid ${isOver ? C.accent + "80" : ov ? "#E8BCBC" : C.border}`,
        borderLeft: ov ? "3px solid #B83232" : `1px solid ${isOver ? C.accent + "80" : C.border}`,
        borderRadius: 10,
        boxShadow: isDragging ? C.shadowDrag : hov ? C.shadowMd : C.shadow,
        opacity: t.done ? 0.52 : 1,
        transform: isDragging ? "rotate(1deg) scale(1.02)" : "none",
        transition: isDragging ? "none" : "box-shadow 0.15s, background 0.12s, opacity 0.2s, border-color 0.15s",
        animation: isDragging ? "none" : "rowIn 0.18s ease",
        cursor: isDragging ? "grabbing" : "default",
        userSelect: "none",
        position: "relative",
      }}
    >
      {/* Drag handle */}
      <div {...dragHandleProps}
        title="Drag to reorder"
        style={{
          display: "flex", flexDirection: "column", gap: 2.5,
          justifyContent: "center", padding: "2px 2px", marginTop: 2,
          cursor: isDragging ? "grabbing" : "grab",
          opacity: hov || isDragging ? 0.35 : 0,
          transition: "opacity 0.12s", flexShrink: 0,
        }}
      >
        {[0, 1, 2].map(i => (
          <span key={i} style={{ display: "block", width: 12, height: 1.5, borderRadius: 2, background: C.text2 }} />
        ))}
      </div>

      {/* Checkbox */}
      <button id={`c-${t.id}`} onClick={() => onToggle(t.id)}
        style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
          border: `1.5px solid ${t.done ? p.color : "#C8BEB4"}`,
          background: t.done ? p.color : "transparent",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.18s", boxShadow: t.done ? "0 1px 4px " + p.color + "44" : "none",
        }}
      >
        {t.done && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.8 7L9 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            ref={editRef}
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") { setEditText(t.text); setEditing(false); } }}
            style={{
              width: "100%", fontSize: 13.5, fontFamily: "inherit", color: C.text,
              background: "transparent", border: "none", borderBottom: `1.5px solid ${C.accent}`,
              outline: "none", padding: "0 0 2px", lineHeight: 1.6, letterSpacing: 0.05,
            }}
          />
        ) : (
          <div
            onDoubleClick={() => { if (!t.done) { setEditing(true); } }}
            title={t.done ? "" : "Double-click to edit"}
            style={{
              fontSize: 13.5, lineHeight: 1.6, wordBreak: "break-word",
              color: t.done ? C.doneText : C.text,
              textDecoration: t.done ? "line-through" : "none",
              fontWeight: 400, letterSpacing: 0.05,
              cursor: t.done ? "default" : "text",
            }}
          >
            {t.text}
          </div>
        )}

        {/* Meta */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 7 }}>
          <span style={{
            fontSize: 11, padding: "2px 9px", borderRadius: 20, fontWeight: 500,
            background: cc.bg, color: cc.ink, display: "flex", alignItems: "center", gap: 4,
          }}
          >
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: cc.ink, display: "inline-block" }} />
            {cc.label}
          </span>
          <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 20, fontWeight: 500, background: p.bg, color: p.color }}>
            {p.label}
          </span>
          {due && (
            <span style={{
              fontSize: 11, padding: "2px 9px", borderRadius: 20, fontWeight: 500,
              background: due.late ? "#FBF0F0" : due.today ? "#EEF7F1" : C.inputBg,
              color: due.late ? "#B83232" : due.today ? "#246B42" : C.text2,
            }}
            >{due.text}</span>
          )}
          <span style={{ fontSize: 11, color: C.text3 }}>{ago(t.ts)}</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        {!t.done && (
          <button
            onClick={() => { setEditing(true); }}
            title="Edit"
            style={{
              width: 26, height: 26, border: "none", borderRadius: 6,
              background: hov ? C.inputBg : "transparent",
              cursor: "pointer", color: C.text3, fontSize: 12,
              opacity: hov ? 1 : 0, transition: "opacity 0.12s, background 0.12s",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#EDE8E0"; e.currentTarget.style.color = C.text2; }}
            onMouseLeave={e => { e.currentTarget.style.background = hov ? C.inputBg : "transparent"; e.currentTarget.style.color = C.text3; }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M7.5 1.5L9.5 3.5L3.5 9.5H1.5V7.5L7.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <button
          onClick={() => onDelete(t.id)}
          title="Delete"
          style={{
            width: 26, height: 26, border: "none", borderRadius: 6,
            background: hov ? "#FBF0F0" : "transparent",
            cursor: "pointer", color: hov ? "#B83232" : C.text3,
            fontSize: 14, opacity: hov ? 1 : 0,
            transition: "opacity 0.12s, background 0.12s, color 0.12s",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >×</button>
      </div>
    </div>
  );
}

// ── Drag-and-drop list ────────────────────────────────────
function DraggableList({ items, onReorder, renderItem }) {
  const [dragging, setDragging] = useState(null); // id
  const [over, setOver] = useState(null);  // id
  const listRef = useRef();

  const handleDragStart = (e, id) => {
    setDragging(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    const rect = e.currentTarget.getBoundingClientRect();
    e.dataTransfer.setDragImage(e.currentTarget, e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleDragOver = (e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== dragging) setOver(id);
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (!dragging || dragging === targetId) { setDragging(null); setOver(null); return; }
    const arr = [...items];
    const from = arr.findIndex(i => i.id === dragging);
    const to = arr.findIndex(i => i.id === targetId);
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    onReorder(arr);
    setDragging(null); setOver(null);
  };

  const handleDragEnd = () => { setDragging(null); setOver(null); };

  return (
    <div ref={listRef} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {items.map(item => renderItem(item, {
        draggable: true,
        onDragStart: e => handleDragStart(e, item.id),
        onDragOver: e => handleDragOver(e, item.id),
        onDrop: e => handleDrop(e, item.id),
        onDragEnd: handleDragEnd,
      }, dragging === item.id, over === item.id && dragging !== item.id))}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────
export default function App() {
  const [todos, setTodos] = useState(SEEDS);
  const [input, setInput] = useState("");
  const [pri, setPri] = useState("mid");
  const [cat, setCat] = useState("personal");
  const [due, setDue] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState(true);
  const [q, setQ] = useState("");
  const [sparks, setSparks] = useState([]);
  const [nextId, setNextId] = useState(() => Math.max(...SEEDS.map(t => t.id)) + 1);
  const [addOpen, setAddOpen] = useState(false);
  const [sideOpen, setSideOpen] = useState(false); // mobile sidebar
  const ref = useRef();

  const total = todos.length;
  const doneN = todos.filter(t => t.done).length;
  const activeN = total - doneN;
  const overdueN = todos.filter(t => !t.done && isOverdue(t.due)).length;
  const pct = total > 0 ? Math.round(doneN / total * 100) : 0;

  const addTodo = () => {
    const text = input.trim(); if (!text) { ref.current?.focus(); return; }
    setTodos(p => [{ id: nextId, text, done: false, priority: pri, cat, due, ts: Date.now() }, ...p]);
    setNextId(n => n + 1); setInput(""); setDue("");
    ref.current?.focus();
  };

  const toggle = id => {
    const task = todos.find(t => t.id === id);
    if (task && !task.done) {
      const el = document.getElementById(`c-${id}`);
      if (el) {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const cols = [C.accent, "#1E56A0", "#246B42", "#7B2F8A", "#9A6510"];
        setSparks(p => [...p, ...Array.from({ length: 8 }, (_, i) => ({
          id: `${id}-${Date.now()}-${i}`, x: cx, y: cy, color: cols[i % 5],
        }))]);
      }
    }
    setTodos(p => p.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const del = id => setTodos(p => p.filter(t => t.id !== id));
  const clear = () => setTodos(p => p.filter(t => !t.done));
  const editTask = (id, patch) => setTodos(p => p.map(t => t.id === id ? { ...t, ...patch} : t));
  const reorder = newArr => setTodos(newArr);

  // Build filtered+sorted list (for display)
  let list = todos.filter(t => {
    if (filter === "active")  return !t.done;
    if (filter === "done")    return t.done;
    if (filter === "overdue") return !t.done && isOverdue(t.due);
    if (Object.keys(CAT).includes(filter)) return t.cat === filter;
    return true;
  });
  if (q.trim()) list = list.filter(t => t.text.toLowerCase().includes(q.toLowerCase()));
  
  // If search or filter active, sort; otherwise use manual order
  if (q.trim() || filter !== "all") {
    list = [...list].sort((a, b) => sort ? b.ts - a.ts : a.ts - b.ts);
  }

  const PAGE = { all: "All tasks", active: "In progress", done: "Completed", overdue: "Overdue", work: "Work", personal: "Personal", health: "Health", study: "Study" };

  const baseInput = {
    background: C.inputBg, border: `1px solid ${C.border}`,
    borderRadius: 7, color: C.text, fontFamily: "inherit",
    fontSize: 13, outline: "none", transition: "border-color 0.15s, box-shadow 0.15s",
  };

  const navContent = (
    <>
      {/* Brand */}
      <div style={{ padding: "28px 20px 22px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ fontFamily: "Georgia,'Times New Roman',serif", fontSize: 19, color: "#EDE0CC", letterSpacing: -0.3, fontWeight: 400 }}>
          Tasks
        </div>
        <div style={{ fontSize: 11.5, color: "#4A3A22", marginTop: 5 }}>
          {QUOTES[Math.min(doneN, QUOTES.length - 1)]}
        </div>
      </div>

      {/* Progress */}
      <div style={{ padding: "18px 20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
          <span style={{ fontSize: 10, color: "#4A3A22", letterSpacing: 0.8, textTransform: "uppercase", fontWeight: 700 }}>Progress</span>
          <span style={{ fontSize: 11, color: pct === 100 ? "#3A7A50" : C.accent, fontWeight: 700 }}>{pct}%</span>
        </div>
        <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{
            height: 3, borderRadius: 3, width: `${pct}%`,
            background: pct === 100 ? "#3A7A50" : C.accent,
            transition: "width 0.5s cubic-bezier(.4,0,.2,1)",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
          <span style={{ fontSize: 10, color: "#3A2E1C" }}>{doneN} done</span>
          <span style={{ fontSize: 10, color: "#3A2E1C" }}>{activeN} left</span>
        </div>
      </div>

      {/* Views */}
      <nav style={{ padding: "22px 10px 6px" }}>
        <div style={{ fontSize: 9.5, color: "#3A2E1C", letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 700, padding: "0 16px", marginBottom: 6 }}>Views</div>
        <SLink label="All tasks"   n={total}    active={filter === "all"}     onClick={() => { setFilter("all");     setSideOpen(false); }} />
        <SLink label="In progress" n={activeN}  active={filter === "active"}  onClick={() => { setFilter("active");  setSideOpen(false); }} />
        <SLink label="Completed"   n={doneN}    active={filter === "done"}    onClick={() => { setFilter("done");    setSideOpen(false); }} />
        <SLink label="Overdue"     n={overdueN} active={filter === "overdue"} dot="#B83232" onClick={() => { setFilter("overdue"); setSideOpen(false); }} />
      </nav>

      {/* Categories */}
      <nav style={{ padding: "10px 10px 6px" }}>
        <div style={{ fontSize: 9.5, color: "#3A2E1C", letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 700, padding: "0 16px", marginBottom: 6 }}>Categories</div>
        {Object.entries(CAT).map(([key, { ink, label }]) => (
          <SLink key={key} label={label} active={filter === key} dot={ink} onClick={() => { setFilter(key); setSideOpen(false); }} />
        ))}
      </nav>

      {/* Footer */}
      <div style={{ marginTop: "auto", padding: "18px 20px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "rgba(201,79,10,0.18)", border: "1px solid rgba(201,79,10,0.28)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: C.accent, flexShrink: 0,
          }}
          >U</div>
          <div>
            <div style={{ fontSize: 12.5, color: "#C8B898", fontWeight: 500 }}>My workspace</div>
            <div style={{ fontSize: 11, color: "#4A3A22" }}>{activeN} open</div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div style={{ fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif", display: "grid", gridTemplateColumns: "230px 1fr", minHeight: "100vh" }}>
      <style>{`
        @keyframes rowIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }
        @keyframes spark { 0%{opacity:1;transform:translate(0,0)scale(1)} 100%{opacity:0;transform:translate(var(--tx),var(--ty))scale(0)} }
        @keyframes slideIn { from{transform:translateX(-100%)} to{transform:translateX(0)} }
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#3A2E1C;border-radius:4px}
        button:focus-visible{outline:2px solid ${C.accent};outline-offset:2px}
        input[type=date]::-webkit-calendar-picker-indicator{opacity:0.4;cursor:pointer}
        @media(max-width:700px){
          .app-grid{grid-template-columns:1fr !important}
          .desktop-sidebar{display:none !important}
          .mobile-topbar{display:flex !important}
          .main-pad{padding:16px 14px 60px !important}
          .stats-grid{grid-template-columns:repeat(2,1fr) !important}
          .form-grid{grid-template-columns:1fr !important}
        }
      `}</style>

      {sparks.map(s => (
        <Spark key={s.id} x={s.x} y={s.y} color={s.color}
          onDone={() => setSparks(p => p.filter(c => c.id !== s.id))} />
      ))}

      {/* ── Desktop Sidebar ── */}
      <aside className="desktop-sidebar" style={{
        background: C.sidebar, display: "flex", flexDirection: "column",
        minHeight: "100vh", position: "sticky", top: 0, height: "100vh", overflowY: "auto",
      }}
      >
        {navContent}
      </aside>

      {/* ── Mobile: overlay sidebar ── */}
      {sideOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex" }}>
          <div style={{
            width: 240, background: C.sidebar, display: "flex", flexDirection: "column",
            height: "100vh", overflowY: "auto", animation: "slideIn 0.2s ease",
            boxShadow: "4px 0 24px rgba(0,0,0,0.3)",
          }}
          >
            {navContent}
          </div>
          <div style={{ flex: 1, background: "rgba(0,0,0,0.45)" }} onClick={() => setSideOpen(false)} />
        </div>
      )}

      {/* ── Main ── */}
      <main className="main-pad" style={{ background: C.pageBg, padding: "34px 30px 80px", overflowY: "auto", minHeight: "100vh" }}>

        {/* Mobile top bar */}
        <div className="mobile-topbar" style={{
          display: "none", alignItems: "center", justifyContent: "space-between",
          marginBottom: 20,
        }}
        >
          <button onClick={() => setSideOpen(true)} style={{
            width: 36, height: 36, border: `1px solid ${C.border}`, borderRadius: 8,
            background: C.card, cursor: "pointer", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 4, flexShrink: 0,
          }}
          >
            {[0, 1, 2].map(i => (
              <span key={i} style={{ width: 14, height: 1.5, background: C.text2, borderRadius: 2, display: "block" }} />
            ))}
          </button>
          <div style={{ fontFamily: "Georgia,serif", fontSize: 17, color: C.text, letterSpacing: -0.3 }}>Tasks</div>
          <button onClick={() => { setAddOpen(o => !o); setTimeout(() => ref.current?.focus(), 50); }}
            style={{
              width: 36, height: 36, background: C.accent, color: "#fff",
              border: "none", borderRadius: 8, fontSize: 20, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >+</button>
        </div>

        {/* Page header (desktop) */}
        <div className="desktop-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: "Georgia,'Times New Roman',serif", fontSize: 26, fontWeight: 400, color: C.text, letterSpacing: -0.6, lineHeight: 1 }}>
              {PAGE[filter]}
            </h1>
            <p style={{ fontSize: 13, color: C.text2, marginTop: 7 }}>
              {activeN} remaining
              {overdueN > 0 && <span style={{ color: "#B83232", marginLeft: 8 }}>· {overdueN} overdue</span>}
            </p>
          </div>
          <button onClick={() => { setAddOpen(o => !o); setTimeout(() => ref.current?.focus(), 50); }}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              height: 38, padding: "0 18px",
              background: C.accent, color: "#fff",
              border: "none", borderRadius: 8,
              fontSize: 13, fontWeight: 500, cursor: "pointer",
              fontFamily: "inherit", letterSpacing: 0.1,
              boxShadow: `0 2px 8px ${C.accent}44`,
              transition: "background 0.12s, box-shadow 0.12s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = C.accentHov; }}
            onMouseLeave={e => { e.currentTarget.style.background = C.accent; }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>{addOpen ? "−" : "+"}</span>
            New task
          </button>
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 26 }}>
          {[
            { n: total,    l: "Total",   c: C.text,    bg: C.card },
            { n: activeN,  l: "Active",  c: "#1E56A0", bg: "#F3F7FD" },
            { n: doneN,    l: "Done",    c: "#246B42", bg: "#F0F8F3" },
            { n: overdueN, l: "Overdue", c: "#B83232", bg: "#FBF0F0" },
          ].map(({ n, l, c, bg }) => (
            <div key={l} style={{ background: bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", boxShadow: C.shadow }}>
              <div style={{ fontSize: 26, fontWeight: 600, color: c, letterSpacing: -1, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{n}</div>
              <div style={{ fontSize: 10.5, color: C.text3, marginTop: 5, textTransform: "uppercase", letterSpacing: 0.7, fontWeight: 600 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Add panel */}
        {addOpen && (
          <div style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "20px", marginBottom: 16,
            boxShadow: C.shadowMd, animation: "rowIn 0.15s ease",
          }}
          >
            <div style={{ fontSize: 11.5, color: C.text2, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.9, marginBottom: 14 }}>New task</div>

            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input ref={ref} type="text" placeholder="What needs doing?"
                value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTodo()}
                style={{ ...baseInput, flex: 1, height: 40, padding: "0 14px" }}
                onFocus={e => { e.target.style.borderColor = C.accent; e.target.style.boxShadow = `0 0 0 3px ${C.accent}18`; }}
                onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }}
              />
              <button onClick={addTodo}
                style={{
                  height: 40, padding: "0 20px", background: C.accent, color: "#fff",
                  border: "none", borderRadius: 7, fontSize: 13, fontWeight: 500,
                  cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                }}
                onMouseEnter={e => e.currentTarget.style.background = C.accentHov}
                onMouseLeave={e => e.currentTarget.style.background = C.accent}
              >Add</button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: C.text3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 7 }}>Category</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(CAT).map(([key, { label, ink, bg }]) => {
                  const ac = cat === key;
                  return (
                    <button key={key} onClick={() => setCat(key)} style={{
                      padding: "5px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                      border: `1px solid ${ac ? ink + "80" : C.border}`,
                      background: ac ? bg : "transparent",
                      color: ac ? ink : C.text2, fontFamily: "inherit",
                      fontWeight: ac ? 600 : 400, transition: "all 0.12s",
                      display: "flex", alignItems: "center", gap: 5,
                    }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: ink }} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: C.text3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 7 }}>Due date</div>
                <input type="date" value={due} onChange={e => setDue(e.target.value)}
                  style={{ ...baseInput, width: "100%", height: 38, padding: "0 12px" }}
                  onFocus={e => { e.target.style.borderColor = C.accent; e.target.style.boxShadow = `0 0 0 3px ${C.accent}18`; }}
                  onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }}
                />
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.text3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 7 }}>Priority</div>
                <select value={pri} onChange={e => setPri(e.target.value)}
                  style={{ ...baseInput, width: "100%", height: 38, padding: "0 12px" }}
                >
                  <option value="low">Low</option>
                  <option value="mid">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Search + filter bar */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14, boxShadow: C.shadow }}>
          <div style={{ position: "relative", marginBottom: 10 }}>
            <svg style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", opacity: 0.3 }} width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke={C.text} strokeWidth="1.3" />
              <path d="M10 10L12.5 12.5" stroke={C.text} strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <input type="text" placeholder="Search tasks…" value={q} onChange={e => setQ(e.target.value)}
              style={{ ...baseInput, width: "100%", height: 36, padding: "0 12px 0 32px", background: C.inputBg }}
              onFocus={e => { e.target.style.borderColor = C.accent; e.target.style.boxShadow = `0 0 0 3px ${C.accent}18`; }}
              onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }}
            />
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
            {["all", "active", "done", "overdue", "work", "personal", "health", "study"].map(f => {
              const ac = filter === f;
              return (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: "4px 11px", borderRadius: 20, fontSize: 11.5, cursor: "pointer",
                  border: `1px solid ${ac ? C.accent + "60" : C.borderSoft}`,
                  background: ac ? C.accent + "12" : "transparent",
                  color: ac ? C.accent : C.text2, fontFamily: "inherit",
                  fontWeight: ac ? 600 : 400, transition: "all 0.1s", textTransform: "capitalize",
                }}
                >{f}</button>
              );
            })}
            <button onClick={() => setSort(s => !s)} style={{
              marginLeft: "auto", padding: "4px 11px", borderRadius: 20, fontSize: 11.5,
              border: `1px solid ${C.borderSoft}`, background: "transparent", color: C.text2,
              cursor: "pointer", fontFamily: "inherit",
            }}
            >
              Sort: {sort ? "Newest" : "Oldest"}
            </button>
          </div>
        </div>

        {/* Task List container */}
        <DraggableList
          items={list}
          onReorder={reorder}
          renderItem={(todo, dragProps, isDragging, isOver) => (
            <TaskCard
              key={todo.id}
              t={todo}
              onToggle={toggle}
              onDelete={del}
              onEdit={editTask}
              dragHandleProps={dragProps}
              isDragging={isDragging}
              isOver={isOver}
            />
          )}
        />
      </main>
    </div>
  );
}