/* 주제28 「독립 선언문」 웹앱 — 로직(app.js) */
const CONFIG = {
  SHEET_WEBAPP_URL: "https://script.google.com/macros/s/AKfycbyXSjCfWY_HiZFqW_OBR-FQDoIfF1z_STqyKWUI31MacHeY3u7hbirFSFDvW-5yuUHaJQ/exec",
  /* 포털 커리큘럼 관리에 이 id 하나로 활동을 등록한다 */
  GAME_NAME: "28차시_독립선언문_글쓰기",
  FIND_MIN: 3,
  STEP1_MIN: 15,
  REASON_MIN: 10,
  SHORT_MIN: 5,
  FINAL_MIN: 10,
  MAX_ROLES: 2
};

const S = {
  sid: "", name: "", ban: 0, preview: false,
  eventId: "", declId: "", step1Submitted: false,
  find: { D1: "", D2: "", D3: "", D4: "" },
  roles: [], roleIdx: 0, rolePart: 1, cards: {},
  finalLine: "", sending: false, padletUrl: ""
};

/* 화면 목록: stage는 위쪽 4단계 막대, label은 그 아래 작은 진행 표시 */
const SCREENS = {
  s0: { stage: "" },
  a1: { stage: "find", label: "찾기 1/3" },
  a2: { stage: "find", label: "찾기 2/3" },
  a3: { stage: "find", label: "찾기 3/3" },
  w1: { stage: "write", label: "쓰기 1/3" },
  w2: { stage: "write", label: "쓰기 2/3" },
  w3: { stage: "write", label: "쓰기 3/3" },
  r0: { stage: "read", label: "읽기 1/2" },
  rr: { stage: "read", label: "읽기 2/2" },
  f1: { stage: "wrap", label: "마무리 1/2" },
  f2: { stage: "wrap", label: "마무리 2/2" }
};
const STAGES = ["find", "write", "read", "wrap"];

const $ = id => document.getElementById(id);
const byId = (arr, id) => arr.find(x => x.id === id);

function show(key, labelOverride) {
  Object.keys(SCREENS).forEach(k => { $(k).hidden = (k !== key); });
  const sc = SCREENS[key];
  $("steps").hidden = !sc.stage;
  const cur = STAGES.indexOf(sc.stage);
  document.querySelectorAll("#steps li").forEach(li => {
    const i = STAGES.indexOf(li.dataset.k);
    li.className = i === cur ? "on" : (i < cur ? "done" : "");
  });
  const text = labelOverride || sc.label || "";
  $("sub").hidden = !text;
  $("sub").textContent = text;
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

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
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

function radioGroup(opts, onPick) {
  const row = el("div", "radio-row");
  opts.forEach(o => {
    const b = makeOpt(o.label, false, () => { setPressed(row, b); onPick(o.id); });
    row.appendChild(b);
  });
  return row;
}

async function postToSheet(payload) {
  if (S.preview) return { result: "success", preview: true };
  const res = await fetch(CONFIG.SHEET_WEBAPP_URL, { method: "POST", body: JSON.stringify(payload) });
  const json = await res.json();
  if (json.result !== "success") throw new Error(json.message || "저장 실패");
  return json;
}

/* 패들렛 링크는 백엔드 학년정보(포트폴리오)에서 가져온다. 조회 실패 시에만 data.js의 예비 링크를 쓴다. */
function ensureUrlScheme(u) {
  u = String(u || "").trim();
  return u && !/^https?:\/\//i.test(u) ? "https://" + u : u;
}

async function loadPadletUrl(grade, ban) {
  try {
    const res = await fetch(CONFIG.SHEET_WEBAPP_URL + "?mode=curriculum");
    const json = await res.json();
    const pf = json && json.grades && json.grades[String(grade)] && json.grades[String(grade)].portfolio;
    if (!pf) return "";
    return ensureUrlScheme(pf.urlByBan ? (pf.urlByBan[ban] || pf.urlByBan[String(ban)] || "") : (pf.url || ""));
  } catch (e) {
    return "";
  }
}

/* ── 시작 ── */
function startApp() {
  const sid = $("sid").value.trim();
  const name = $("sname").value.trim();
  if (!parseSid(sid)) { $("startErr").textContent = "학번은 숫자 5자리로 써 줘. (예: 30512)"; return; }
  if (!name) { $("startErr").textContent = "이름을 써 줘."; return; }
  $("startErr").textContent = "";
  const p = parseSid(sid);
  S.sid = sid; S.name = name; S.ban = p.ban;
  loadPadletUrl(p.grade, p.ban).then(u => { S.padletUrl = u; });
  show("a1");
}

/* ── 1. 찾기: 선언문 상자에서 조항 4개, 본문에서 독립 이유 ── */
function renderFind() {
  $("findIntro").textContent = FIND_INTRO;
  if (DECL_SOURCE_TEXT) document.querySelectorAll(".decl-src").forEach(d => { d.querySelector(".source-text").textContent = DECL_SOURCE_TEXT; d.hidden = false; });

  FIND_CARDS.forEach((fc, i) => {
    const card = el("div", "card find-card");
    card.appendChild(el("h3", "", fc.emoji + " " + fc.head));
    card.appendChild(el("p", "prompt", fc.q));
    card.appendChild(hintBox(fc.hints));
    card.appendChild(textField(2, v => { S.find[fc.id] = v; }, FIND_PLACEHOLDER));
    $(i < 2 ? "findA1" : "findA2").appendChild(card);
  });

  $("reasonHead").textContent = "📍 " + REASON_FIND_HEAD;
  $("reasonQ").textContent = REASON_FIND_Q;
  $("reasonEventQ").textContent = REASON_EVENT_Q;

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
    const b = makeOpt(c.label, false, () => { S.eventId = c.id; setPressed(ev, b); });
    ev.appendChild(b);
  });

  $("a1Next").addEventListener("click", () => {
    const err = validateFind(["D1", "D2"]);
    $("a1Err").textContent = err;
    if (!err) show("a2");
  });
  $("a2Back").addEventListener("click", () => show("a1"));
  $("a2Next").addEventListener("click", () => {
    const err = validateFind(["D3", "D4"]);
    $("a2Err").textContent = err;
    if (!err) show("a3");
  });
  $("a3Back").addEventListener("click", () => show("a2"));
  $("a3Next").addEventListener("click", goWrite);
}

function validateFind(ids) {
  for (const id of ids) {
    if (S.find[id].trim().length < CONFIG.FIND_MIN) return "「" + byId(FIND_CARDS, id).head + "」: 상자에서 찾아서 짧게 써 줘.";
  }
  return "";
}

function goWrite() {
  if (!S.eventId) { $("a3Err").textContent = "독립의 이유를 하나 골라 줘."; return; }
  $("a3Err").textContent = "";
  buildDeclChoices();
  show("w1");
}

/* ── 2. 쓰기 ── */
function makeOptRich(head, sub, pressed, onClick) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "opt";
  b.appendChild(el("span", "opt-head", head));
  b.appendChild(el("span", "opt-sub", sub));
  b.setAttribute("aria-pressed", pressed ? "true" : "false");
  b.addEventListener("click", onClick);
  return b;
}

function buildDeclChoices() {
  const dc = $("declCards");
  dc.textContent = "";
  FIND_CARDS.forEach(fc => {
    const b = makeOptRich(fc.emoji + " " + fc.head, S.find[fc.id].trim(), S.declId === fc.id, () => { S.declId = fc.id; setPressed(dc, b); });
    dc.appendChild(b);
  });
}

function renderStep1() {
  $("step1Intro").textContent = STEP1_INTRO;
  $("declNote").textContent = STEP1_DECL_NOTE;
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

  $("w1Back").addEventListener("click", () => show("a3"));
  $("w1Next").addEventListener("click", () => {
    if (!S.declId) { $("w1Err").textContent = "찾은 것 중 하나를 골라 줘."; return; }
    $("w1Err").textContent = "";
    $("s1Reason").textContent = byId(EVENT_CARDS, S.eventId).label;
    $("s1Decl").textContent = byId(FIND_CARDS, S.declId).head + " — " + S.find[S.declId].trim();
    show("w2");
  });
  $("w2Back").addEventListener("click", () => show("w1"));
  $("step1Text").addEventListener("input", updateStep1);
  $("step1Submit").addEventListener("click", submitStep1);
  $("toRoles").addEventListener("click", () => show("r0"));
  updateStep1();
}

function updateStep1() {
  const t = $("step1Text").value.trim();
  $("step1Count").textContent = t.length;
  const n = sentenceCount(t);
  let msg = "";
  if (t.length && t.length < CONFIG.STEP1_MIN) msg = "한 문장은 써야 제출할 수 있어.";
  else if (t.length && n < 2) msg = "2문장이면 딱 좋아. 제출은 할 수 있어.";
  $("step1Msg").textContent = msg;
  $("step1Submit").disabled = t.length < CONFIG.STEP1_MIN || S.step1Submitted;
}

function submitStep1() {
  /* 1단계는 화면 안에서만 잠그고, 시트 저장은 마무리에서 한 번만 한다(같은 id로 두 번 저장하면 포털이 1단계만 끝나도 완료로 볼 수 있음) */
  S.step1Submitted = true;
  $("step1Text").readOnly = true;
  $("w3Mine").textContent = $("step1Text").value.trim();
  renderExamples();
  show("w3");
}

function renderExamples() {
  const box = $("examples");
  if (box.childNodes.length) return;
  EXAMPLES.forEach(ex => {
    const d = el("div", "ex");
    d.appendChild(el("div", "tag", ex.name + " · 상상해서 쓴 예시야"));
    d.appendChild(el("div", "meta", "독립 이유: " + ex.reason + " / 근거 조항: " + ex.decl));
    d.appendChild(el("p", "", ex.text));
    box.appendChild(d);
  });
}

/* ── 3. 읽기: 입장 고르기 → 입장마다 두 화면(① 자료·이유, ② 한계·말풍선) ── */
function buildRoleForms() {
  const tabs = $("roleTabs");
  ROLE_CARDS.forEach(rc => {
    S.cards[rc.id] = { cardId: rc.id, customRoleName: "", reached: "", reason: "", limitJudgement: "", limitReason: "", bubble: "" };
    const tb = makeOpt(rc.emoji + " " + rc.name, false, () => toggleRole(rc.id, tb));
    tabs.appendChild(tb);
    $("roleForms").appendChild(buildRoleForm(rc));
  });
  $("r0Next").addEventListener("click", startRoles);
  $("rrNext").addEventListener("click", nextRolePart);
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
}

function buildRoleForm(rc) {
  const c = S.cards[rc.id];
  const form = el("div", "role-card"); form.id = "role_" + rc.id; form.hidden = true;
  form.appendChild(el("h3", "", rc.emoji + " " + rc.name + "의 입장"));
  const p1 = el("div", "part1"), p2 = el("div", "part2");

  if (rc.custom) {
    p1.appendChild(el("div", "q first", "누구의 입장에서 읽을래? 직접 써도 되고, 골라도 돼."));
    const inp = el("input"); inp.placeholder = "입장 이름";
    inp.addEventListener("input", () => { c.customRoleName = inp.value; });
    p1.appendChild(inp);
    const chips = el("div", "chips");
    rc.chips.forEach(t => {
      const b = el("button", "chip", t); b.type = "button";
      b.addEventListener("click", () => { inp.value = t; c.customRoleName = t; });
      chips.appendChild(b);
    });
    p1.appendChild(chips);
  }

  rc.facts.forEach(f => {
    const box = el("div", "fact");
    box.appendChild(el("div", "src", f.head));
    f.lines.forEach(l => box.appendChild(el("p", "", l)));
    p1.appendChild(box);
  });

  p1.appendChild(el("div", "q", REACHED_Q));
  p1.appendChild(radioGroup(REACHED_OPTS, v => { c.reached = v; }));
  p1.appendChild(el("div", "q", "② 이유 — " + rc.reasonPrompt));
  p1.appendChild(hintBox(rc.hints));
  p1.appendChild(textField(3, v => { c.reason = v; }));

  p2.appendChild(el("div", "q first", LIMIT_Q));
  p2.appendChild(radioGroup(LIMIT_OPTS, v => { c.limitJudgement = v; }));
  if (rc.bubble) {
    const bb = el("div", "bubble-box");
    bb.appendChild(el("div", "q", "④ 💬 말풍선 한마디"));
    bb.appendChild(el("p", "", BUBBLE_PROMPT));
    bb.appendChild(textField(2, v => { c.bubble = v; }));
    p2.appendChild(bb);
  }
  form.append(p1, p2);
  return form;
}

function roleName(id) {
  const rc = byId(ROLE_CARDS, id), c = S.cards[id];
  return rc.custom ? "기타(" + (c.customRoleName.trim() || "이름 없음") + ")" : rc.name;
}

function startRoles() {
  if (S.roles.length < 1) { $("roleErr").textContent = "입장을 1개 이상 골라 줘."; return; }
  $("roleErr").textContent = "";
  $("recapText").textContent = $("step1Text").value.trim();
  $("recapDecl").textContent = byId(FIND_CARDS, S.declId).head + " — " + S.find[S.declId].trim();
  S.roleIdx = 0; S.rolePart = 1;
  showRole();
}

function showRole() {
  const id = S.roles[S.roleIdx];
  ROLE_CARDS.forEach(r => { $("role_" + r.id).hidden = (r.id !== id); });
  const form = $("role_" + id);
  form.querySelector(".part1").hidden = (S.rolePart !== 1);
  form.querySelector(".part2").hidden = (S.rolePart !== 2);
  const last = S.roleIdx === S.roles.length - 1 && S.rolePart === 2;
  $("rrNext").textContent = last ? "다음: 마무리" : "다음";
  $("rrErr").textContent = "";
  const who = S.roles.length > 1 ? "입장 " + (S.roleIdx + 1) + "/" + S.roles.length + " · " : "";
  show("rr", "읽기 2/2 · " + who + S.rolePart + "/2");
}

function validateRolePart(id, part) {
  const rc = byId(ROLE_CARDS, id), c = S.cards[id];
  const nm = rc.custom ? (c.customRoleName.trim() || "기타") : rc.name;
  if (part === 1) {
    if (rc.custom && !c.customRoleName.trim()) return "기타 카드에 입장 이름을 써 줘.";
    if (!c.reached) return nm + " 카드: ①을 골라 줘.";
    if (c.reason.trim().length < CONFIG.REASON_MIN) return nm + " 카드: 이유를 한 문장 써 줘.";
  } else {
    if (!c.limitJudgement) return nm + " 카드: ③을 골라 줘.";
    if (rc.bubble && c.bubble.trim().length < CONFIG.SHORT_MIN) return nm + " 카드: 말풍선을 써 줘.";
  }
  return "";
}

function nextRolePart() {
  const id = S.roles[S.roleIdx];
  const err = validateRolePart(id, S.rolePart);
  $("rrErr").textContent = err;
  if (err) return;
  if (S.rolePart === 1) { S.rolePart = 2; showRole(); return; }
  if (S.roleIdx < S.roles.length - 1) { S.roleIdx += 1; S.rolePart = 1; showRole(); return; }
  show("f1");
}

/* ── 4. 마무리 ── */
function buildOutText() {
  const ev = byId(EVENT_CARDS, S.eventId), dc = byId(FIND_CARDS, S.declId);
  const lines = [];
  lines.push("[독립 선언문] " + S.sid + " " + S.name, "");
  lines.push("■ 선언문에서 찾은 것");
  FIND_CARDS.forEach(fc => lines.push("· " + fc.head + ": " + S.find[fc.id].trim()));
  lines.push("· " + REASON_FIND_HEAD + ": " + ev.label, "");
  lines.push("■ 식민지 대표의 글");
  lines.push("(근거로 쓴 조항: " + dc.head + ")");
  lines.push($("step1Text").value.trim(), "");
  S.roles.forEach(id => {
    const c = S.cards[id];
    lines.push("■ 다른 입장에서 읽기: " + roleName(id));
    lines.push("내가 고른 조항이 이 사람에게도 해당됐을까? " + byId(REACHED_OPTS, c.reached).label);
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
      find: S.find,
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
  $("finalLine").readOnly = true;
  $("outText").value = buildOutText();
  const link = S.padletUrl || PADLET_BY_BAN[S.ban];
  if (link) { $("padletBtn").href = link; $("padletBtn").hidden = false; }
  else { $("padletBtn").hidden = true; $("outMsg").textContent = "우리 반 패들렛 링크를 못 찾았어. 선생님께 물어봐."; }
  show("f2");
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
  $("finishBtn").addEventListener("click", finish);
  $("copyBtn").addEventListener("click", copyOut);
  $("finalPrompt").textContent = FINAL_PROMPT;
  FINAL_HINTS.forEach(h => { const li = document.createElement("li"); li.textContent = h; $("finalHints").appendChild(li); });
  renderFind();
  renderStep1();
  buildRoleForms();
}

init();
