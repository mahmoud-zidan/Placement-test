// ** IMPORTANT: Replace with your actual Firebase config **
const firebaseConfig = {
    apiKey: "AIzaSyDsrWLvy8p_qnhimoOfPTvgnj6Ur_R2tW8",
    authDomain: "placement-test-e5aa2.firebaseapp.com",
    databaseURL: "https://placement-test-e5aa2-default-rtdb.firebaseio.com", 
    projectId: "placement-test-e5aa2",
    storageBucket: "placement-test-e5aa2.firebasestorage.app",
    messagingSenderId: "379756680939",
    appId: "1:379756680939:web:593c7e1ff765fc951e10ae",
    measurementId: "G-ZL84L8KYS5"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();
const examsRef = database.ref('exams');
const resultsRef = database.ref('results');
const orgsRef = database.ref('organizations');

// Retrieve student identity from session if available
let studentInfo = JSON.parse(sessionStorage.getItem('studentInfo') || 'null');

let currentExamData = null; 
let currentQuestionIndex = 0;
let studentAnswers = [];
let examTimer = null;
let globalTimer = null;
let timeLeft = 0;
let globalTimeLeft = 0;

window.loadExamList = () => {
    const listDiv = document.getElementById('examList');
    listDiv.innerHTML = "Loading exams...";
    
    // Fetch both exams and results. Filter results in JS to avoid index dependency for now.
    Promise.all([
        examsRef.once('value'),
        resultsRef.once('value')
    ]).then(([examsSnap, resultsSnap]) => {
        const exams = examsSnap.val();
        const allResults = resultsSnap.val() || {};
        listDiv.innerHTML = '';

        if (!exams) {
            listDiv.innerHTML = '<p>No exams available to take.</p>';
            return;
        }

        // Filter results for this specific student manually
        const completedExamIds = new Set();
        Object.values(allResults).forEach(r => {
            if (String(r.nationalId) === String(studentInfo.id) && !r.retryAllowed) {
                completedExamIds.add(r.examId);
            }
        });

        let visibleExamsCount = 0;
        Object.keys(exams).forEach(key => {
            const exam = exams[key];
            if (exam.isVisible === false) return;
            
            // Filter by Organization
            const studentOrg = studentInfo ? studentInfo.org : null;
            if (exam.targetOrg && exam.targetOrg !== "all" && exam.targetOrg !== studentOrg) {
                return; 
            }

            // ONE TIME ONLY: Hide if already completed
            if (completedExamIds.has(key)) {
                return;
            }

            visibleExamsCount++;
            const item = document.createElement('div');
            item.className = 'exam-list-item';
            item.textContent = `${exam.title} (${exam.questions ? exam.questions.length : 0} Qs)`;
            item.onclick = () => window.startExam(key);
            listDiv.appendChild(item);
        });

        if (visibleExamsCount === 0) {
            listDiv.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #64748b; background: #f8fafc; border-radius: 12px; border: 1px dashed #e2e8f0;">
                    <div style="font-size: 2rem; margin-bottom: 10px;">✅</div>
                    <p style="font-weight: 600; color: #1e293b;">Assessment Complete</p>
                    <p style="font-size: 0.9rem;">You have completed all available exams assigned to your profile.</p>
                </div>`;
        }
    }).catch(err => {
        listDiv.innerHTML = "Error loading exams: " + err.message;
        console.error(err);
    });
};

window.resetView = () => {
    if(examTimer) clearInterval(examTimer);
    document.getElementById('examDisplay').style.display = 'none';
    document.getElementById('examSelection').style.display = 'block';
    document.getElementById('quizForm').innerHTML = '';
    window.loadExamList();
}

window.onload = () => {
    if (studentInfo) {
        document.getElementById('registrationView').style.display = 'none';
        document.getElementById('examSelection').style.display = 'block';
        window.loadExamList();
    }

    orgsRef.once('value', (snapshot) => {
        const orgs = snapshot.val();
        const select = document.getElementById('orgSelect');
        if (orgs) {
            Object.values(orgs).forEach(org => {
                const opt = document.createElement('option');
                opt.value = org.name;
                opt.textContent = org.name;
                select.appendChild(opt);
            });
        }
    });
};

window.registerStudent = () => {
    const name = document.getElementById('studentName').value.trim();
    const id = document.getElementById('nationalId').value.trim();
    const org = document.getElementById('orgSelect').value;

    if (!name || !id || !org) {
        alert("Please fill in all fields.");
        return;
    }

    studentInfo = { name, id, org };
    sessionStorage.setItem('studentInfo', JSON.stringify(studentInfo));
    
    document.getElementById('registrationView').style.display = 'none';
    document.getElementById('examSelection').style.display = 'block';
    window.loadExamList();
};

window.startExam = (key) => {
    // Check for existing results first
    resultsRef.orderByChild('nationalId').equalTo(studentInfo.id).once('value', (snap) => {
        const results = snap.val();
        let existingResult = null;
        let resultKey = null;

        if (results) {
            Object.keys(results).forEach(k => {
                if (results[k].examId === key) {
                    existingResult = results[k];
                    resultKey = k;
                }
            });
        }

        if (existingResult && !existingResult.retryAllowed) {
            alert("You have already completed this exam. If you need to retry, please contact the administrator.");
            return;
        }

        // If retry is allowed, clear the flag for the next time (or keep it, but usually we clear it once used)
        if (existingResult && existingResult.retryAllowed) {
            resultsRef.child(resultKey).update({ retryAllowed: false });
        }

        examsRef.child(key).once('value', (snapshot) => {
            currentExamData = snapshot.val();
            currentExamData.id = key;
            if (!currentExamData || !currentExamData.questions) {
                alert("This exam is empty or invalid.");
                return;
            }

            currentQuestionIndex = 0;
            studentAnswers = new Array(currentExamData.questions.length).fill(null);
            
            document.getElementById('examSelection').style.display = 'none';
            document.getElementById('examDisplay').style.display = 'block';
            document.getElementById('examTitle').textContent = currentExamData.title;
            
            // Disable back navigation during exam
            const backBtn = document.getElementById('backBtn');
            if(backBtn) backBtn.style.display = 'none';

            // Global Timer Initialization
            const globalTimerDisplay = document.getElementById('globalTimerDisplay');
            if (currentExamData.totalTime && currentExamData.totalTime > 0) {
                globalTimerDisplay.style.display = 'block';
                globalTimeLeft = currentExamData.totalTime * 60; // Minutes to seconds
                startGlobalTimer();
            } else {
                globalTimerDisplay.style.display = 'none';
            }
            
            window.renderQuestion();
        });
    });
};

function startGlobalTimer() {
    if(globalTimer) clearInterval(globalTimer);
    updateGlobalTimerDisplay();
    
    globalTimer = setInterval(() => {
        globalTimeLeft--;
        updateGlobalTimerDisplay();
        
        if (globalTimeLeft <= 0) {
            clearInterval(globalTimer);
            alert("Time is up! Your exam is being submitted automatically.");
            window.submitExam();
        }
    }, 1000);
}

function updateGlobalTimerDisplay() {
    const minutes = Math.floor(globalTimeLeft / 60);
    const seconds = globalTimeLeft % 60;
    const display = document.getElementById('globalTimer');
    if (display) {
        display.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        
        // Critical time warning
        if (globalTimeLeft <= 60) { // Last minute
            display.parentElement.style.color = '#ef4444';
            display.parentElement.style.borderColor = '#fca5a5';
        }
    }
}

window.renderQuestion = () => {
    if(examTimer) clearInterval(examTimer);
    
    const qIndex = currentQuestionIndex;
    const q = currentExamData.questions[qIndex];
    const form = document.getElementById('quizForm');
    const progress = document.getElementById('examProgress');
    
    // Update Progress
    const progressPercent = ((qIndex + 1) / currentExamData.questions.length) * 100;
    progress.style.width = `${progressPercent}%`;

    form.innerHTML = '';
    
    const qDiv = document.createElement('div');
    qDiv.className = 'question-fade-in';

    // Media
    let mediaHTML = '';
    if (q.mediaType === 'audio' && q.mediaUrl) {
        mediaHTML = `<div class="media-container"><audio controls src="${q.mediaUrl}" autoplay></audio></div>`;
    } else if (q.mediaType === 'video' && q.mediaUrl) {
        let videoSrc = q.mediaUrl;
        if (q.mediaUrl.includes('youtube.com/watch?v=')) {
            const videoId = q.mediaUrl.split('v=')[1].split('&')[0];
            videoSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        }
        mediaHTML = `<div class="media-container"><iframe width="100%" height="315" src="${videoSrc}" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe></div>`;
    }

    const answersHTML = q.answers.map((a, aIndex) => `
        <div class="answer-item" onclick="selectOption(${aIndex})" id="opt_${aIndex}" style="cursor: pointer; padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 10px; transition: all 0.2s;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <div class="radio-circle" style="width: 20px; height: 20px; border: 2px solid #cbd5e1; border-radius: 50%;"></div>
                <span style="font-size: 1rem; color: #334155;">${a.text}</span>
            </div>
        </div>
    `).join('');

    const isLast = qIndex === currentExamData.questions.length - 1;
    const buttonText = isLast ? 'Finish Exam' : 'Next Question →';
    const buttonClass = isLast ? 'btn-finish' : 'btn-primary';

    qDiv.innerHTML = `
        <div style="margin-bottom: 20px;">
            <span style="color: #6366f1; font-weight: 700; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.1em;">Question ${qIndex + 1} of ${currentExamData.questions.length}</span>
            <h3 style="margin-top: 8px; font-size: 1.4rem; color: #1e293b;">${q.text}</h3>
        </div>
        ${mediaHTML}
        <div id="answersList" style="margin-top: 24px;">
            ${answersHTML}
        </div>
        <div style="margin-top: 32px; display: flex; gap: 12px;">
            <button onclick="window.endExamEarly()" class="btn-danger" style="flex: 1; padding: 16px; border-radius: 12px; font-weight: 700; cursor: pointer; border: none;">
                End Exam
            </button>
            <button onclick="window.handleNext()" class="${buttonClass}" style="flex: 2; padding: 16px; border-radius: 12px; font-weight: 700; border: none; cursor: pointer;">
                ${buttonText}
            </button>
        </div>
    `;
    form.appendChild(qDiv);

    // Timer Logic
    const timerDisplay = document.getElementById('timerDisplay');
    if (q.timeLimit && q.timeLimit > 0) {
        timerDisplay.style.display = 'block';
        timeLeft = q.timeLimit;
        document.getElementById('timerSeconds').textContent = timeLeft;
        
        examTimer = setInterval(() => {
            timeLeft--;
            document.getElementById('timerSeconds').textContent = timeLeft;
            
            if (timeLeft <= 5) {
                timerDisplay.style.borderColor = '#ef4444';
                timerDisplay.style.background = '#fef2f2';
            } else {
                timerDisplay.style.borderColor = '#fca5a5';
                timerDisplay.style.background = '#fee2e2';
            }

            if (timeLeft <= 0) {
                clearInterval(examTimer);
                window.handleNext(); // Auto transition
            }
        }, 1000);
    } else {
        timerDisplay.style.display = 'none';
    }
};

window.selectOption = (index) => {
    studentAnswers[currentQuestionIndex] = index;
    // Highlight UI
    document.querySelectorAll('.answer-item').forEach((el, i) => {
        const circle = el.querySelector('.radio-circle');
        if (i === index) {
            el.style.borderColor = '#4f46e5';
            el.style.background = '#eef2ff';
            circle.style.borderColor = '#4f46e5';
            circle.style.background = '#4f46e5';
            circle.style.boxShadow = 'inset 0 0 0 3px white';
        } else {
            el.style.borderColor = '#e2e8f0';
            el.style.background = 'white';
            circle.style.borderColor = '#cbd5e1';
            circle.style.background = 'transparent';
            circle.style.boxShadow = 'none';
        }
    });
};

window.handleNext = () => {
    if(examTimer) clearInterval(examTimer);
    
    if (currentQuestionIndex < currentExamData.questions.length - 1) {
        currentQuestionIndex++;
        window.renderQuestion();
    } else {
        window.submitExam();
    }
};

window.endExamEarly = () => {
    if(confirm("Are you sure you want to end the exam now? All unanswered questions will be marked as incorrect.")) {
        if(examTimer) clearInterval(examTimer);
        window.submitExam();
    }
};

window.submitExam = () => {
    if (!currentExamData) return;
    if(globalTimer) clearInterval(globalTimer);
    if(examTimer) clearInterval(examTimer);

    let score = 0;
    const totalQuestions = currentExamData.questions.length;

    currentExamData.questions.forEach((q, qIndex) => {
        const selectedIndex = studentAnswers[qIndex];
        if (selectedIndex !== null) {
            if (q.answers[selectedIndex].isCorrect) {
                score++;
            }
        }
    });

    const percentage = ((score / totalQuestions) * 100).toFixed(0);
    
    // Save to Firebase
    const resultData = {
        studentName: studentInfo.name,
        nationalId: studentInfo.id,
        orgName: studentInfo.org,
        examId: currentExamData.id,
        examTitle: currentExamData.title,
        score: score,
        totalQuestions: totalQuestions,
        percentage: percentage,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    resultsRef.push(resultData).then(() => {
        document.getElementById('quizForm').innerHTML = '';
        document.getElementById('timerDisplay').style.display = 'none';
        document.getElementById('examProgress').style.width = '100%';
        
        const resultsDiv = document.getElementById('results');
        resultsDiv.style.display = 'block';
        resultsDiv.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 4rem; margin-bottom: 20px;">🎉</div>
                <h2 style="color: #1e293b; margin-bottom: 12px; font-family: 'Outfit';">Congratulations!</h2>
                <p style="color: #64748b; font-size: 1.1rem; line-height: 1.6; margin-bottom: 30px;">
                    You have completed the <b>${currentExamData.title}</b>.<br>
                    Your results have been securely recorded.
                </p>
            </div>
        `;
    }).catch(err => {
        alert("Error saving results: " + err.message);
    });
};
