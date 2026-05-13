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
    document.getElementById("logoutBtn").style.display = currentUser ? "block" : "none";
    
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

/* ================= CACHE EXAMS ================= */
let examsCache = {};
examsRef.on("value", s => {
    examsCache = s.val() || {};
    renderExamList();
});

/* ================= UTIL ================= */
let qid = 0;

function showNotification(msg, err=false){
const n=document.getElementById("notificationArea");
n.textContent=msg;
n.className="notification "+(err?"error":"success");
n.style.display="block";
setTimeout(()=>n.style.display="none",3000);
}

function setView(view,newForm=false){
    if((view === 'form' || view === 'report') && !isAdmin()) {
        showNotification("Admin access required", true);
        return;
    }

    ["listView","formView","report"].forEach(v=>document.getElementById(v).style.display="none");
    const viewMap = {
        "list": "listView",
        "form": "formView",
        "report": "report"
    };
    const elementId = viewMap[view] || view;
    document.getElementById(elementId).style.display="block";
    
    if(view==="form" && newForm){
        document.getElementById("examForm").reset();
        document.getElementById("questionsContainer").innerHTML="";
        qid=0; addQuestion();
    }
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
<textarea style="width:100%;" placeholder="Enter question text here..."></textarea>
<div class="answers" style="margin-top:15px; display: flex; flex-direction: column; gap: 8px;"></div>
<button type="button" class="secondary" onclick="addAnswer(this)" style="margin-top:15px; font-size: 0.9rem;">+ Add Answer</button>`;
document.getElementById("questionsContainer").appendChild(d);
const answersDiv = d.querySelector(".answers");
d.querySelector("textarea").value = q.text;
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
if(confirm("Delete this question?")){
    btn.parentNode.parentNode.remove();
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

if(!title){
    showNotification("Exam title is required", true);
    return;
}

const questions = [...document.querySelectorAll(".question-block")].map(q=>{
const text = q.querySelector("textarea").value.trim();
if(!text){
    showNotification("All questions must have text", true);
    throw new Error("Question text is empty");
}
return {
    text: text,
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
    const list=document.getElementById("examList");
    if(!list) return;
    list.innerHTML="<h2 style='margin-bottom: 20px;'>Saved Exams</h2>";
    
    const admin = isAdmin();
    
    if(Object.keys(examsCache).length === 0){
        list.innerHTML+="<p style='color: var(--text-muted);'>No exams yet.</p>";
        return;
    }

    Object.keys(examsCache).forEach(k=>{
        const exam = examsCache[k];
        const questionCount = exam.questions ? exam.questions.length : 0;
        list.innerHTML+=`
        <div class="exam-item">
            <div style="flex-grow:1;">
                <span style="font-weight:600; font-size: 1.1rem;">${exam.title}</span>
                <div style="color: var(--text-muted); font-size:0.85rem; margin-top: 4px;">${questionCount} questions • Updated ${new Date(exam.updatedAt).toLocaleDateString()}</div>
            </div>
            ${admin ? `
            <div style="display:flex;gap:8px;">
                <button class="secondary" onclick="editExam('${k}')" style="padding:6px 16px;">Edit</button>
                <button class="danger" onclick="deleteExam('${k}')" style="padding:6px 16px;">Delete</button>
            </div>` : ''}
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
document.getElementById("questionsContainer").innerHTML="";
qid=0;
if(e.questions && e.questions.length > 0) {
    e.questions.forEach(q=>addQuestion(q));
} else {
    addQuestion();
}
}

/* INIT */
setView("list");