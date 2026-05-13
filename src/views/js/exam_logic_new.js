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

let currentExamData = null; // Store the selected exam data

window.loadExamList = () => {
    const listDiv = document.getElementById('examList');
    listDiv.innerHTML = "Loading exams...";
    
    examsRef.once('value', (snapshot) => {
        const exams = snapshot.val();
        listDiv.innerHTML = '';

        if (!exams) {
            listDiv.innerHTML = '<p>No exams available to take.</p>';
            return;
        }

        Object.keys(exams).forEach(key => {
            const exam = exams[key];
            if (exam.isVisible === false) return; // Skip hidden exams

            const item = document.createElement('div');
            item.className = 'exam-list-item';
            item.textContent = `${exam.title} (${exam.questions ? exam.questions.length : 0} Qs)`;
            item.onclick = () => window.startExam(key);
            listDiv.appendChild(item);
        });
    });
};

window.resetView = () => {
    document.getElementById('examDisplay').style.display = 'none';
    document.getElementById('examSelection').style.display = 'block';
    document.getElementById('results').style.display = 'none';
    document.getElementById('quizForm').innerHTML = '';
    window.loadExamList();
}

window.onload = () => {
    // If student is already registered in this session, skip registration
    if (studentInfo) {
        document.getElementById('registrationView').style.display = 'none';
        document.getElementById('examSelection').style.display = 'block';
        window.loadExamList();
    }

    // Fetch organizations for the dropdown
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
        alert("Please fill in all fields and select an organization.");
        return;
    }

    studentInfo = { name, id, org };
    sessionStorage.setItem('studentInfo', JSON.stringify(studentInfo));
    
    document.getElementById('registrationView').style.display = 'none';
    document.getElementById('examSelection').style.display = 'block';
    window.loadExamList();
};

// B//
window.startExam = (key) => {
    examsRef.child(key).once('value', (snapshot) => {
        currentExamData = snapshot.val();
        currentExamData.id = key; // Store the exam key
        if (!currentExamData || !currentExamData.questions) {
            alert("This exam is empty or invalid.");
            return;
        }

        document.getElementById('examSelection').style.display = 'none';
        document.getElementById('examDisplay').style.display = 'block';
        document.getElementById('examTitle').textContent = currentExamData.title;
        
        const form = document.getElementById('quizForm');
        form.innerHTML = '';
        
        currentExamData.questions.forEach((q, qIndex) => {
            const qDiv = document.createElement('div');
            qDiv.className = 'question';
            
            // 1. Render Media
            let mediaHTML = '';
            if (q.mediaType === 'audio' && q.mediaUrl) {
                // This is the correct way to render the audio element
                mediaHTML = `<div class="media-container"><audio controls src="${q.mediaUrl}">Your browser does not support the audio element.</audio></div>`;
            } 
            // ... rest of the video logic
             else if (q.mediaType === 'video' && q.mediaUrl) {
                // For YouTube, embed it in an iframe
                let videoSrc = q.mediaUrl;
                if (q.mediaUrl.includes('youtube.com/watch?v=')) {
                    const videoId = q.mediaUrl.split('v=')[1].split('&')[0];
                    videoSrc = `https://www.youtube.com/embed/${videoId}`;
                }
                // Handle basic video links or the resulting YouTube embed link
                mediaHTML = `<div class="media-container"><iframe width="100%" height="315" src="${videoSrc}" frameborder="0" allowfullscreen></iframe></div>`;
            }
            
            // 2. Render Question Text
            const questionText = q.text || `Question ${qIndex + 1}`;
            
            let answersHTML = q.answers.map((a, aIndex) => `
                <div class="answer">
                    <label>
                        <input type="radio" name="question_${qIndex}" value="${aIndex}">
                        ${a.text}
                    </label>
                </div>
            `).join('');

            qDiv.innerHTML = `
                <h4>Question ${qIndex + 1}: ${questionText}</h4>
                ${mediaHTML}
                ${answersHTML}
            `;
            form.appendChild(qDiv);
        });
    });
};

// C //
window.submitExam = () => {
    if (!currentExamData || !currentExamData.questions) return;

    let score = 0;
    const totalQuestions = currentExamData.questions.length;
    const form = document.getElementById('quizForm');
    
    // Get all question HTML containers
    const questionDivs = form.querySelectorAll('.question');

    currentExamData.questions.forEach((q, qIndex) => {
        const questionDiv = questionDivs[qIndex];
        const selector = `input[name="question_${qIndex}"]:checked`;
        const selectedAnswerInput = questionDiv ? questionDiv.querySelector(selector) : null;
        
        if (selectedAnswerInput) {
            const selectedAnswerIndex = parseInt(selectedAnswerInput.value);
            if (q.answers[selectedAnswerIndex].isCorrect) {
                score++;
            }
        }
    });

    const percentage = ((score / totalQuestions) * 100).toFixed(0);
    const resultsDiv = document.getElementById('results');
    
    if (resultsDiv) {
        resultsDiv.style.display = 'block';
        resultsDiv.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <h3 style="color: #166534; margin-bottom: 10px;">Exam Submitted Successfully!</h3>
                <p>Thank you for completing the exam. Your results have been recorded and sent to the administrator.</p>
            </div>
        `;
    }
    
    // Disable the form after submission
    form.querySelectorAll('input').forEach(input => input.disabled = true);

    // Store result in Firebase
    const info = JSON.parse(sessionStorage.getItem('studentInfo') || 'null');
    console.log('Submitting exam. Student Info from session:', info);

    const resultData = {
        examId: currentExamData.id || 'unknown',
        examTitle: currentExamData.title || 'Unknown Exam',
        studentName: (info && info.name) ? info.name : "Anonymous",
        nationalId: (info && info.id) ? info.id : "N/A",
        orgName: (info && info.org) ? info.org : "N/A",
        score: score,
        totalQuestions: totalQuestions,
        percentage: percentage,
        timestamp: new Date().toISOString()
    };
    resultsRef.push(resultData).then(() => {
        console.log('Result stored successfully');
    }).catch(error => {
        console.error('Error storing result:', error);
        alert('Error storing result: ' + error.message);
    });
};


