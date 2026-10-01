/* 주제28 「독립 선언문」 웹앱 — 로직(app.js) */
const CONFIG = {
  SHEET_WEBAPP_URL: "https://script.google.com/macros/s/AKfycbyXSjCfWY_HiZFqW_OBR-FQDoIfF1z_STqyKWUI31MacHeY3u7hbirFSFDvW-5yuUHaJQ/exec",
  /* 포털 커리큘럼 관리에 이 id 하나로 활동을 등록한다 */
  GAME_NAME: "28차시_독립선언문",
  STEP1_MIN: 15,
  REASON_MIN: 10,
  SHORT_MIN: 5,
  FINAL_MIN: 10,
  MAX_ROLES: 2
};

const S = {
  sid: "", name: "", ban: 0, preview: false,
  eventId: "", declId: "", step1Submitted: false,
  roles: [], cards: {}, finalLine: "", sending: false
};

const $ = id => document.getElementById(id);
const byId = (arr, id) => arr.find(x => x.id === id);

function show(n) {
  ["s0", "s1", "s2", "s3"].forEach(k => { $(k).hidden = (k !== "s" + n); });
  $("steps").hidden = (n === 0);
  document.querySelectorAll("#steps li").forEach(li => {
    const k = Number(li.dataset.n);
    li.className = k === n ? "on" : (k < n ? "done" : "");
  });
  window.scrollTo(0, 0);
}

function parseSid(sid) {
  if (!/^\d{5}$/.test(sid)) return null;
  return { grade: Number(sid[0]), ban: Number(sid.slice(1, 3)), num: Number(sid.slice(3)) };
}

function makeOpt(label, pressed, onClick) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "opt"; b.textContent = label;
  b.setAttribute("aria-pressed", pressed ? "true" : "false");
  b.addEventListener("click", onClick);
  return b;
}

function setPressed(container, btn) {
  container.querySelectorAll(".opt").forEach(o => o.setAttribute("aria-pressed", o === btn ? "true" : "false"));
}

function sentenceCount(t) {
  return t.split(/[.!?。]+|\n+/).filter(s => s.trim().length >= 4).length;
}

async function postToSheet(payload) {
  if (S.preview) return { result: "success", preview: true };
  const res = await fetch(CONFIG.SHEET_WEBAPP_URL, { method: "POST", body: JSON.stringify(payload) });
  const json = await res.json();
  if (json.result !== "success") throw new Error(json.message || "저장 실패");
  return json;
}

/* ── 화면 0 ── */
function startApp() {
  const sid = $("sid").value.trim();
  const name = $("sname").value.trim();
  if (!parseSid(sid)) { $("startErr").textContent = "학번은 숫자 5자리로 써 줘. (예: 30512)"; return; }
  if (!name) { $("startErr").textContent = "이름을 써 줘."; return; }
  $("startErr").textContent = "";
  S.sid = sid; S.name = name; S.ban = parseSid(sid).ban;
  show(1);
}

/* ── 화면 1 ── */
function renderStep1() {
  $("step1Intro").textContent = STEP1_INTRO;

  const tl = $("timeline");
  TIMELINE.forEach(t => {
    const li = document.createElement("li");
    if (t.year) {
      const y = document.createElement("span"); y.className = "yr"; y.textContent = t.year + "년";
      li.appendChild(y);
    }
    li.appendChild(document.createTextNode(t.text));
    const p = document.createElement("span"); p.className = "pg"; p.textContent = "(" + t.page + "쪽)";
    li.appendChild(p);
    tl.appendChild(li);
  });

  const ev = $("eventCards");
  EVENT_CARDS.forEach(c => {
    const b = makeOpt(c.label, false, () => { S.eventId = c.id; setPressed(ev, b); updateStep1(); });
    ev.appendChild(b);
  });
  const dc = $("declCards");
  DECL_CARDS.forEach(c => {
    const b = makeOpt(c.label, false, () => { S.declId = c.id; setPressed(dc, b); updateStep1(); });
    dc.appendChild(b);
  });
  if (DECL_SOURCE_TEXT) { $("declSource").textContent = DECL_SOURCE_TEXT; $("declSourceBox").hidden = false; }

  STEP1_HINTS.forEach(h => { const li = document.createElement("li"); li.textContent = h; $("step1Hints").appendChild(li); });
  STEP1_CHIPS.forEach(c => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip"; b.textContent = c;
    b.addEventListener("click", () => {
      const ta = $("step1Text");
      ta.value += (ta.value && !/\s$/.test(ta.value) ? " " : "") + c.replace("…", " ");
      ta.focus(); updateStep1();
    });
    $("step1Chips").appendChild(b);
  });

  $("step1Text").addEventListener("input", updateStep1);
  $("step1Submit").addEventListener("click", submitStep1);
  $("exampleBtn").addEventListener("click", showExamples);
  $("toStep2").addEventListener("click", goStep2);
  updateStep1();
}

function updateStep1() {
  const t = $("step1Text").value.trim();
  $("step1Count").textContent = t.length;
  const n = sentenceCount(t);
  let msg = "";
  if (t.length && t.length < CONFIG.STEP1_MIN) msg = "한 문장은 써야 제출할 수 있어.";
  else if (t.length && n < 2) msg = "2~3문장이면 딱 좋아. 제출은 할 수 있어.";
  $("step1Msg").textContent = msg;
  const ready = S.eventId && S.declId && t.length >= CONFIG.STEP1_MIN;
  $("step1Submit").disabled = !ready || S.step1Submitted;
}

function submitStep1() {
  /* 1단계는 화면 안에서만 잠그고, 시트 저장은 마무리에서 한 번만 한다(같은 id로 두 번 저장하면 포털이 1단계만 끝나도 완료로 볼 수 있음) */
  S.step1Submitted = true;
  $("step1Text").readOnly = true;
  $("step1Submit").textContent = "다 썼어";
  $("step1Submit").disabled = true;
  $("exampleBtn").disabled = false;
  $("exampleBtn").textContent = "다른 대표가 쓴 글 보기";
  $("toStep2").hidden = false;
}

function showExamples() {
  const box = $("examples");
  if (!box.hidden) return;
  EXAMPLES.forEach(ex => {
    const d = document.createElement("div"); d.className = "ex";
    const tag = document.createElement("div"); tag.className = "tag"; tag.textContent = ex.name + " · 상상해서 쓴 예시야";
    const meta = document.createElement("div"); meta.className = "meta";
    meta.textContent = "고른 이유: " + ex.reason + " / 고른 문장: " + ex.decl;
    const p = document.createElement("p"); p.textContent = ex.text;
    d.append(tag, meta, p); box.appendChild(d);
  });
  box.hidden = false;
  $("exampleBtn").disabled = true;
}

/* ── 화면 2 ── */
function goStep2() {
  $("recapText").textContent = $("step1Text").value.trim();
  $("recapDecl").textContent = byId(DECL_CARDS, S.declId).label;
  show(2);
}

function buildRoleForms() {
  const tabs = $("roleTabs");
  ROLE_CARDS.forEach(rc => {
    S.cards[rc.id] = { cardId: rc.id, customRoleName: "", reached: "", reason: "", limitJudgement: "", limitReason: "", bubble: "" };
    const tb = makeOpt(rc.emoji + " " + rc.name, false, () => toggleRole(rc.id, tb));
    tabs.appendChild(tb);
    $("roleForms").appendChild(buildRoleForm(rc));
  });
}

function toggleRole(id, btn) {
  const i = S.roles.indexOf(id);
  $("roleErr").textContent = "";
  if (i >= 0) {
    S.roles.splice(i, 1);
    btn.setAttribute("aria-pressed", "false");
  } else {
    if (S.roles.length >= CONFIG.MAX_ROLES) { $("roleErr").textContent = "입장은 최대 2개까지 고를 수 있어. 하나를 먼저 해제해 줘."; return; }
    S.roles.push(id);
    btn.setAttribute("aria-pressed", "true");
  }
  ROLE_CARDS.forEach(rc => { $("role_" + rc.id).hidden = S.roles.indexOf(rc.id) < 0; });
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function radioGroup(opts, onPick) {
  const row = el("div", "radio-row");
  opts.forEach(o => {
    const b = makeOpt(o.label, false, () => { setPressed(row, b); onPick(o.id); });
    row.appendChild(b);
  });
  return row;
}

function hintBox(list) {
  const d = el("details", "hint");
  d.appendChild(el("summary", "", "💡 막막하면 힌트 보기"));
  const ul = el("ul");
  list.forEach(h => ul.appendChild(el("li", "", h)));
  d.appendChild(ul);
  return d;
}

function textField(rows, onInput, placeholder) {
  const ta = el("textarea");
  ta.rows = rows; if (placeholder) ta.placeholder = placeholder;
  ta.addEventListener("input", () => onInput(ta.value));
  return ta;
}

function buildRoleForm(rc) {
  const c = S.cards[rc.id];
  const form = el("div", "role-card"); form.id = "role_" + rc.id; form.hidden = true;
  form.appendChild(el("h3", "", rc.emoji + " " + rc.name + "의 입장"));

  if (rc.custom) {
    form.appendChild(el("div", "q", "누구의 입장에서 읽을래? 직접 써도 되고, 골라도 돼."));
    const inp = el("input"); inp.placeholder = "입장 이름";
    inp.addEventListener("input", () => { c.customRoleName = inp.value; });
    form.appendChild(inp);
    const chips = el("div", "chips");
    rc.chips.forEach(t => {
      const b = el("button", "chip", t); b.type = "button";
      b.addEventListener("click", () => { inp.value = t; c.customRoleName = t; });
      chips.appendChild(b);
    });
    form.appendChild(chips);
  }

  rc.facts.forEach(f => {
    const box = el("div", "fact");
    box.appendChild(el("div", "src", f.head));
    f.lines.forEach(l => box.appendChild(el("p", "", l)));
    form.appendChild(box);
  });

  form.appendChild(el("div", "q", "① 내가 고른 문장이 이 사람에게 닿았을까?"));
  form.appendChild(radioGroup(REACHED_OPTS, v => { c.reached = v; }));

  form.appendChild(el("div", "q", "② 이유 — " + rc.reasonPrompt));
  form.appendChild(hintBox(rc.hints));
  form.appendChild(textField(5, v => { c.reason = v; }));

  form.appendChild(el("div", "q", "③ 이걸 선언문의 한계라고 볼 수 있을까?"));
  form.appendChild(radioGroup(LIMIT_OPTS, v => { c.limitJudgement = v; }));

  if (rc.bubble) {
    const bb = el("div", "bubble-box");
    bb.appendChild(el("div", "q", "④ 💬 말풍선 한마디"));
    bb.appendChild(el("p", "", BUBBLE_PROMPT));
    bb.appendChild(textField(2, v => { c.bubble = v; }));
    form.appendChild(bb);
  }
  return form;
}

function validateStep2() {
  if (S.roles.length < 1) return "입장을 1개 이상 골라 줘.";
  for (const id of S.roles) {
    const rc = byId(ROLE_CARDS, id), c = S.cards[id];
    const nm = rc.custom ? (c.customRoleName.trim() || "기타") : rc.name;
    if (rc.custom && !c.customRoleName.trim()) return "기타 카드에 입장 이름을 써 줘.";
    if (!c.reached) return nm + " 카드: ①을 골라 줘.";
    if (c.reason.trim().length < CONFIG.REASON_MIN) return nm + " 카드: 이유를 조금 더 써 줘.";
    if (!c.limitJudgement) return nm + " 카드: ③을 골라 줘.";
    if (rc.bubble && c.bubble.trim().length < CONFIG.SHORT_MIN) return nm + " 카드: 말풍선을 써 줘.";
  }
  return "";
}

function goStep3() {
  const err = validateStep2();
  $("s2Err").textContent = err;
  if (!err) show(3);
}

/* ── 화면 3 ── */
function roleName(id) {
  const rc = byId(ROLE_CARDS, id), c = S.cards[id];
  return rc.custom ? "기타(" + c.customRoleName.trim() + ")" : rc.name;
}

function buildOutText() {
  const ev = byId(EVENT_CARDS, S.eventId), dc = byId(DECL_CARDS, S.declId);
  const lines = [];
  lines.push("[독립 선언문] " + S.sid + " " + S.name, "");
  lines.push("■ 식민지 대표의 글");
  lines.push("(독립이 필요한 이유: " + ev.label + " / 고른 선언문 문장: " + dc.label + ")");
  lines.push($("step1Text").value.trim(), "");
  S.roles.forEach(id => {
    const c = S.cards[id];
    lines.push("■ 다른 입장에서 읽기: " + roleName(id));
    lines.push("내 문장이 닿았을까? " + byId(REACHED_OPTS, c.reached).label);
    lines.push(c.reason.trim());
    lines.push("선언문의 한계라고 볼 수 있을까? " + byId(LIMIT_OPTS, c.limitJudgement).label);
    if (byId(ROLE_CARDS, id).bubble) lines.push("말풍선: " + c.bubble.trim());
    lines.push("");
  });
  lines.push("■ 내 판단 한 줄", S.finalLine);
  return lines.join("\n");
}

async function finish() {
  if (S.sending) return;
  const fl = $("finalLine").value.trim();
  if (fl.length < CONFIG.FINAL_MIN) { $("s3Err").textContent = "한 줄을 조금 더 써 줘."; return; }
  S.finalLine = fl; $("s3Err").textContent = "";
  S.sending = true; $("finishBtn").disabled = true;
  const cards = S.roles.map(id => Object.assign({}, S.cards[id], { customRoleName: S.cards[id].customRoleName.trim() }));
  const step1Text = $("step1Text").value.trim();
  const payload = {
    studentId: S.sid, studentName: S.name, gameName: CONFIG.GAME_NAME,
    choiceSummary: S.roles.map(roleName).join(" / "), diffSummary: "",
    reflection: fl + "\n\n" + cards.map(c => c.reason.trim()).join("\n"),
    choicesJson: JSON.stringify({
      sid: S.sid, name: S.name, ban: S.ban, eventCardId: S.eventId, declId: S.declId,
      step1Text: step1Text, step1Submitted: S.step1Submitted, cards: cards, finalLine: fl,
      ts: new Date().toISOString()
    })
  };
  try {
    await postToSheet(payload);
  } catch (e) {
    $("s3Err").textContent = "저장이 안 됐어. 인터넷을 확인하고 다시 눌러 줘.";
    S.sending = false; $("finishBtn").disabled = false;
    return;
  }
  S.sending = false;
  $("finishBtn").textContent = "저장 완료";
  $("finalLine").readOnly = true;
  $("outText").value = buildOutText();
  const link = PADLET_BY_BAN[S.ban];
  if (link) { $("padletBtn").href = link; $("padletBtn").hidden = false; }
  else { $("padletBtn").hidden = true; $("outMsg").textContent = "우리 반 패들렛 링크는 선생님께 물어봐."; }
  $("outCard").hidden = false;
  $("outCard").scrollIntoView({ behavior: "smooth" });
}

async function copyOut() {
  const ta = $("outText");
  try {
    await navigator.clipboard.writeText(ta.value);
  } catch (e) {
    ta.removeAttribute("readonly"); ta.select(); document.execCommand("copy"); ta.setAttribute("readonly", "");
  }
  $("outMsg").textContent = "복사했어. 패들렛에 붙여넣기 해.";
}

/* ── 부팅 (모든 함수 선언 뒤, 파일 맨 마지막) ── */
function init() {
  const q = new URLSearchParams(location.search);
  S.preview = q.get("preview") === "1";
  let sid = (q.get("sid") || "").trim(), name = (q.get("name") || "").trim();
  if (S.preview) {
    $("previewBar").hidden = false;
    if (!sid) sid = "30512";
    if (!name) name = "미리보기";
  }
  $("sid").value = sid; $("sname").value = name;

  $("startBtn").addEventListener("click", startApp);
  $("toStep3").addEventListener("click", goStep3);
  $("finishBtn").addEventListener("click", finish);
  $("copyBtn").addEventListener("click", copyOut);
  $("finalPrompt").textContent = FINAL_PROMPT;
  FINAL_HINTS.forEach(h => { const li = document.createElement("li"); li.textContent = h; $("finalHints").appendChild(li); });
  renderStep1();
  buildRoleForms();
}

init();
