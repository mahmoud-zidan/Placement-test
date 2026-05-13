const firebaseConfig = {
apiKey: "AIzaSyDsrWLvy8p_qnhimoOfPTvgnj6Ur_R2tW8",
authDomain: "placement-test-e5aa2.firebaseapp.com",
databaseURL: "https://placement-test-e5aa2-default-rtdb.firebaseio.com",
projectId: "placement-test-e5aa2",
storageBucket: "placement-test-e5aa2.appspot.com",
messagingSenderId: "379756680939",
appId: "1:379756680939:web:593c7e1ff765fc951e10ae"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();
const examsRef = db.ref("exams");
const resultsRef = db.ref("results");
const orgsRef = db.ref("organizations");

/* ================= AUTH LOGIC ================= */
let currentUser = null;

auth.onAuthStateChanged(user => {
    console.log("Auth state changed:", user ? user.email : "Logged out");
    currentUser = user;
    updateUIForAuth();
});

function isAdmin() {
    return currentUser && (currentUser.email === 'admin@modli.com' || currentUser.email.includes('admin'));
}

function updateUIForAuth() {
    const admin = isAdmin();
    console.log("Updating UI for auth. Admin status:", admin);
    
    // Toggle buttons
    document.getElementById("loginBtn").style.display = currentUser ? "none" : "block";
    document.getElementById("adminNav").style.display = currentUser ? "flex" : "none";
    
    // Toggle admin-only sections
    const adminElements = document.querySelectorAll(".admin-only");
    adminElements.forEach(el => {
        el.style.display = admin ? "block" : "none";
    });

    // Refresh exam list to show/hide edit/delete
    renderExamList();
}

function showLogin() {
    document.getElementById("loginOverlay").style.display = "flex";
}

function hideLogin() {
    document.getElementById("loginOverlay").style.display = "none";
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const pass = document.getElementById("loginPass").value;

    auth.signInWithEmailAndPassword(email, pass)
        .then(() => {
            showNotification("Logged in successfully!");
            hideLogin();
        })
        .catch(err => {
            showNotification("Login failed: " + err.message, true);
        });
}

function handleLogout() {
    auth.signOut().then(() => {
        showNotification("Logged out successfully");
        setView("list");
    });
}

/* ================= CACHE EXAMS & ORGS ================= */
let examsCache = {};
examsRef.on("value", s => {
    examsCache = s.val() || {};
    renderExamList();
});

let orgsCache = {};
orgsRef.on("value", s => {
    orgsCache = s.val() || {};
    renderOrgList();
});

/* ================= UTIL ================= */
let qid = 0;

function showNotification(msg, err=false){
console.log("Notification:", msg);
const n=document.getElementById("notificationArea");
if(!n) return;
n.textContent=msg;
n.className="notification "+(err?"error":"success");
n.style.display="block";
setTimeout(()=>n.style.display="none",3000);
}
window.showNotification = showNotification;

function customConfirm(title, msg, onConfirm) {
    const modal = document.getElementById("confirmModal");
    const t = document.getElementById("confirmTitle");
    const m = document.getElementById("confirmMsg");
    const btn = document.getElementById("confirmBtn");
    const cancel = document.getElementById("confirmCancel");

    t.textContent = title;
    m.textContent = msg;
    modal.style.display = "flex";

    const close = () => { modal.style.display = "none"; };

    btn.onclick = () => { close(); onConfirm(); };
    cancel.onclick = close;
}

function setView(view, newForm=false){
    console.log("Setting view:", view);
    
    // Admin access check
    if((view === 'form' || view === 'report' || view === 'orgs') && !isAdmin()) {
        showNotification("Admin access required", true);
        return;
    }

    // Hide all views
    ["listView","formView","report","orgsView"].forEach(v=>document.getElementById(v).style.display="none");
    
    // Update active nav state
    const navIds = { list: "nav-list", orgs: "nav-orgs", report: "nav-report" };
    Object.values(navIds).forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.remove("active");
    });
    if(navIds[view]) {
        const activeNav = document.getElementById(navIds[view]);
        if(activeNav) activeNav.classList.add("active");
    }

    // Show selected view
    const viewMap = {
        list: "listView",
        form: "formView",
        report: "report",
        orgs: "orgsView"
    };
    if(viewMap[view]) document.getElementById(viewMap[view]).style.display="block";

    if(view === "form" && newForm){
        document.getElementById("examForm").reset();
        document.getElementById("examVisibility").checked = true;
        document.getElementById("questionsContainer").innerHTML="";
        qid=0; addQuestion();
    }

    if(view === "orgs") renderOrgList();
    if(view === "report") populateReportFilters();
    if(view === "form") populateExamOrgDropdown();
}

function populateExamOrgDropdown() {
    const select = document.getElementById("examOrg");
    if(!select) return;
    
    // Clear existing except "All"
    select.innerHTML = '<option value="all">All Organizations (Public)</option>';
    
    Object.values(orgsCache).forEach(org => {
        const opt = document.createElement("option");
        opt.value = org.name;
        opt.textContent = org.name;
        select.appendChild(opt);
    });
}

/* ================= QUESTIONS ================= */
function addQuestion(q={text:"",answers:[{text:"",isCorrect:false}]}){
qid++;
const d=document.createElement("div");
d.className="question-block";
const questionNum = document.querySelectorAll(".question-block").length + 1;
d.innerHTML=`
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
    <label style="font-weight:bold; color: var(--primary);">Question ${questionNum}</label>
    <button type="button" class="danger" onclick="deleteQuestion(this)" style="padding:4px 12px; font-size: 0.8rem;">Delete</button>
</div>
<textarea style="width:100%; margin-bottom: 12px;" placeholder="Enter question text here..."></textarea>

<div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 12px; border: 1px solid var(--border);">
    <label style="margin-bottom: 8px; display: block; font-size: 0.85rem; font-weight: 600; color: #475569;">📁 Media Attachment (Optional)</label>
    <div style="display: flex; gap: 12px;">
        <select class="media-type" style="padding: 8px; border-radius: 6px; border: 1px solid var(--border); font-size: 0.9rem;">
            <option value="none">No Media</option>
            <option value="audio">Audio Link</option>
            <option value="video">Video Link (YouTube)</option>
        </select>
        <input type="text" class="media-url" placeholder="Paste link here..." style="flex-grow: 1; padding: 8px; border-radius: 6px; border: 1px solid var(--border); font-size: 0.9rem;">
    </div>
</div>

<div style="background: #fefce8; padding: 12px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #fef08a;">
    <label style="margin-bottom: 8px; display: block; font-size: 0.85rem; font-weight: 600; color: #854d0e;">⏱️ Time Limit for this Question</label>
    <div style="display: flex; align-items: center; gap: 10px;">
        <input type="number" class="question-time" min="0" placeholder="e.g. 30" style="width: 100px; padding: 8px; border-radius: 6px; border: 1px solid #fde047;" value="${q.timeLimit || 0}">
        <span style="font-size: 0.8rem; color: #a16207;">Seconds (0 = Unlimited)</span>
    </div>
</div>

<div class="answers" style="margin-top:15px; display: flex; flex-direction: column; gap: 8px;"></div>
<button type="button" class="secondary" onclick="addAnswer(this)" style="margin-top:15px; font-size: 0.9rem;">+ Add Answer</button>`;
document.getElementById("questionsContainer").appendChild(d);
const answersDiv = d.querySelector(".answers");
d.querySelector("textarea").value = q.text;
d.querySelector(".media-type").value = q.mediaType || "none";
d.querySelector(".media-url").value = q.mediaUrl || "";
if(q.answers && q.answers.length > 0) {
    q.answers.forEach(a => addAnswerToDiv(answersDiv, a));
} else {
    addAnswerToDiv(answersDiv);
}
}

function deleteQuestion(btn){
    if(document.querySelectorAll(".question-block").length <= 1){
        showNotification("You must have at least one question", true);
        return;
    }
    if(confirm("Are you sure you want to delete this question?")){
        const block = btn.closest(".question-block");
        if(block) block.remove();
        // Optional: Renumber questions if needed, but for now we'll just remove.
    }
}

function addAnswer(btn,a={text:"",isCorrect:false}){
const d=btn.parentNode.querySelector(".answers");
addAnswerToDiv(d, a);
}

function addAnswerToDiv(answersDiv,a={text:"",isCorrect:false}){
const answerDiv = document.createElement("div");
answerDiv.style.cssText = "display:flex;gap:12px;align-items:center; background: #fff; padding: 10px; border-radius: 8px; border: 1px solid var(--border);";
answerDiv.innerHTML=`
<input type="text" style="flex-grow:1; border: none; padding: 4px;" placeholder="Answer text" value="${a.text}">
<label style="white-space:nowrap; display: flex; align-items: center; gap: 6px; margin: 0; cursor: pointer;">
    <input type="checkbox" ${a.isCorrect?"checked":""}> Correct
</label>
<button type="button" class="danger" onclick="this.parentNode.remove()" style="padding:4px 8px; font-size: 0.8rem;">×</button>`;
answersDiv.appendChild(answerDiv);
}

/* ================= SAVE ================= */
document.getElementById("examForm").onsubmit=e=>{
e.preventDefault();
const key=document.getElementById("examKey").value;
const title = document.getElementById("examTitle").value.trim();
const targetOrg = document.getElementById("examOrg").value;
const isVisible = document.getElementById("examVisibility").checked;

if(!title){
    showNotification("Exam title is required", true);
    return;
}

const questions = [...document.querySelectorAll(".question-block")].map(q=>{
const text = q.querySelector("textarea").value.trim();
const mediaType = q.querySelector(".media-type").value;
const mediaUrl = q.querySelector(".media-url").value.trim();
const timeLimit = parseInt(q.querySelector(".question-time").value) || 0;

if(!text){
    showNotification("All questions must have text", true);
    throw new Error("Question text is empty");
}
return {
    text: text,
    mediaType: mediaType !== "none" ? mediaType : null,
    mediaUrl: mediaUrl || null,
    timeLimit: timeLimit,
    answers:[...q.querySelectorAll(".answers > div")].map(a=>({
        text:a.querySelector("input[type=text]").value.trim(),
        isCorrect:a.querySelector("input[type=checkbox]").checked
    }))
};
});

if(questions.length === 0){
    showNotification("At least one question is required", true);
    return;
}

const exam={
    title: title,
    targetOrg: targetOrg,
    isVisible: isVisible,
    questions: questions,
    updatedAt: new Date().toISOString()
};

if(key){
    examsRef.child(key).set(exam).then(()=>{
        showNotification("Exam updated successfully!");
        setView("list");
    }).catch(err=>{
        showNotification("Error updating exam: " + err.message, true);
    });
} else {
    examsRef.push(exam).then(()=>{
        showNotification("Exam saved successfully!");
        setView("list");
    }).catch(err=>{
        showNotification("Error saving exam: " + err.message, true);
    });
}
};

/* ================= LIST ================= */
function renderExamList() {
    const list = document.getElementById("examList");
    if(!list) return;
    
    const keys = Object.keys(examsCache);
    if(keys.length === 0) {
        list.innerHTML = `
            <div style="text-align: center; padding: 60px; grid-column: 1/-1;">
                <h3 style="color: var(--text-muted);">No exams found</h3>
                <p style="color: var(--text-muted);">Click '+ Add New Exam' to create your first placement test.</p>
            </div>`;
        return;
    }

    list.innerHTML = "";
    keys.forEach(k => {
        const e = examsCache[k];
        const qCount = e.questions ? e.questions.length : 0;
        const visibilityTag = e.isVisible !== false 
            ? '<span style="color: #059669; background: #ecfdf5; padding: 2px 8px; border-radius: 6px; font-size: 0.75rem;">Visible</span>' 
            : '<span style="color: #dc2626; background: #fef2f2; padding: 2px 8px; border-radius: 6px; font-size: 0.75rem;">Hidden</span>';

        list.innerHTML += `
        <div class="exam-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <h3>${e.title}</h3>
                ${visibilityTag}
            </div>
            <div class="exam-meta">
                <span>📝 ${qCount} Questions</span>
                <span>📅 ${new Date(e.updatedAt || Date.now()).toLocaleDateString()}</span>
            </div>
            <div class="exam-actions">
                <button class="secondary" onclick="editExam('${k}')" style="flex: 1;">Edit</button>
                <button class="danger" onclick="deleteExam('${k}')" style="padding: 10px;">Delete</button>
            </div>
        </div>`;
    });
}

function deleteExam(k){
if(!confirm("Are you sure you want to delete this exam?")){
    return;
}
examsRef.child(k).remove().then(()=>{
    showNotification("Exam deleted successfully!");
}).catch(err=>{
    showNotification("Error deleting exam: " + err.message, true);
});
}

function editExam(k){
const e = examsCache[k];
if(!e){
    showNotification("Exam not found", true);
    return;
}
setView("form");
document.getElementById("examKey").value=k;
document.getElementById("examTitle").value=e.title;
document.getElementById("examOrg").value=e.targetOrg || "all";
document.getElementById("examVisibility").checked = e.isVisible !== false;
document.getElementById("questionsContainer").innerHTML="";
qid=0;
if(e.questions && e.questions.length > 0) {
    e.questions.forEach(q=>addQuestion(q));
} else {
    addQuestion();
}
}

/* ================= ORGANIZATIONS ================= */
function renderOrgList() {
    const list = document.getElementById("orgList");
    if(!list) return;
    list.innerHTML = "";
    
    const keys = Object.keys(orgsCache);
    if(keys.length === 0) {
        list.innerHTML = `
            <div style="text-align: center; padding: 40px; background: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 16px;">
                <p style="color: #64748b;">No organizations added yet.</p>
            </div>`;
        return;
    }

    keys.forEach(k => {
        const org = orgsCache[k];
        list.innerHTML += `
        <div class="exam-item" style="display: flex; justify-content: space-between; align-items: center; padding: 16px; margin-bottom: 12px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; transition: all 0.2s;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 40px; height: 40px; background: #eff6ff; color: #3b82f6; display: flex; align-items: center; justify-content: center; border-radius: 10px; font-weight: 700;">${org.name.charAt(0).toUpperCase()}</div>
                <span style="font-weight: 600; color: #1e293b;">${org.name}</span>
            </div>
            <button class="danger" onclick="deleteOrganization('${k}')" style="padding: 8px 16px; font-size: 0.85rem; background: #fee2e2; color: #dc2626; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Delete</button>
        </div>`;
    });
}

function addOrganization() {
    const nameInput = document.getElementById("newOrgName");
    const name = nameInput.value.trim();
    if(!name) {
        showNotification("Please enter an organization name", true);
        return;
    }
    orgsRef.push({ name: name }).then(() => {
        showNotification("Organization added");
        nameInput.value = "";
    }).catch(err => {
        showNotification("Error: " + err.message, true);
    });
}
window.addOrganization = addOrganization;

function deleteOrganization(k) {
    customConfirm("Delete Organization", "Are you sure you want to delete this organization? Students will no longer be able to select it.", () => {
        orgsRef.child(k).remove().then(() => {
            showNotification("Organization deleted");
        }).catch(err => {
            showNotification("Error: " + err.message, true);
        });
    });
}
window.deleteOrganization = deleteOrganization;

/* INIT */
setView("list");