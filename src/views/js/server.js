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
    window.loadExamList();
    window.generateReport(); // Generate report on load
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
        const questionDiv = questionDivs[qIndex]; // Get the HTML element for this question
        // Find the selected radio button for this question
        const selector = `input[name="question_${qIndex}"]:checked`;
        const selectedAnswerInput = questionDiv.querySelector(selector);
        
        let isCorrect = false;

        if (selectedAnswerInput) {
            const selectedAnswerIndex = parseInt(selectedAnswerInput.value);
            
            // Check if the selected answer is marked as correct in the data
            if (q.answers[selectedAnswerIndex].isCorrect) {
                score++;
                isCorrect = true;
            }

            // Highlight the selected answer (whether correct or wrong)
            const selectedLabel = selectedAnswerInput.closest('label');
            if (selectedLabel) {
                // Add a class to show which answer the user chose
                selectedLabel.classList.add('selected-answer');
            }
        }

        if (!isCorrect) {
            // MARK QUESTION AS INCORRECT (FOR RED STYLING)
            questionDiv.classList.add('incorrect-question');
            
            // Highlight the correct answer(s) for feedback
            q.answers.forEach((answer, aIndex) => {
                if (answer.isCorrect) {
                     // Find the correct answer's input and then its label
                     const correctInput = questionDiv.querySelector(`input[name="question_${qIndex}"][value="${aIndex}"]`);
                     const correctLabel = correctInput ? correctInput.closest('label') : null;
                     if (correctLabel) {
                         correctLabel.classList.add('correct-answer-feedback');
                     }
                }
            });
        }
    });

    const percentage = ((score / totalQuestions) * 100).toFixed(0);
    const resultsDiv = document.getElementById('results');
    
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = `
        <h3>Results:</h3>
        <p>You scored **${score} out of ${totalQuestions}**.</p>
        <p>Percentage: **${percentage}%**</p>
    `;
    
    // Disable the form after submission
    form.querySelectorAll('input').forEach(input => input.disabled = true);

    // Store result in Firebase
    const resultData = {
        examId: currentExamData.id || 'unknown',
        category: currentExamData.category || 'uncategorized',
        score: score,
        totalQuestions: totalQuestions,
        percentage: percentage,
        timestamp: new Date().toISOString()
    };
    resultsRef.push(resultData).then(() => {
        console.log('Result stored successfully');
        window.generateReport(); // Update report after storing result
    }).catch(error => {
        console.error('Error storing result:', error);
        alert('Error storing result: ' + error.message);
    });
};

// Generate report function
window.generateReport = () => {
    Promise.all([
        resultsRef.once('value'),
        examsRef.once('value')
    ]).then(([resultsSnapshot, examsSnapshot]) => {
        const results = resultsSnapshot.val();
        const exams = examsSnapshot.val();
        if (!results) {
            document.getElementById('reportContent').innerHTML = '<p>No results available.</p>';
            return;
        }

        const examStats = {};
        Object.values(results).forEach(result => {
            const examId = result.examId;
            const examTitle = exams && exams[examId] ? exams[examId].title : 'Unknown Exam';
            if (!examStats[examTitle]) {
                examStats[examTitle] = { scores: [], count: 0 };
            }
            examStats[examTitle].scores.push(result.score);
            examStats[examTitle].count++;
        });

        let reportHTML = '<h3>Exam Report by Exam Name</h3><table border="1"><tr><th>Exam Name</th><th>Number of Entrants</th><th>Min Score</th><th>Avg Score</th><th>Max Score</th></tr>';
        Object.keys(examStats).forEach(examTitle => {
            const stats = examStats[examTitle];
            const min = Math.min(...stats.scores);
            const max = Math.max(...stats.scores);
            const avg = (stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length).toFixed(2);
            reportHTML += `<tr><td>${examTitle}</td><td>${stats.count}</td><td>${min}</td><td>${avg}</td><td>${max}</td></tr>`;
        });
        reportHTML += '</table>';

        document.getElementById('reportContent').innerHTML = reportHTML;
    }).catch(error => {
        console.error('Error generating report:', error);
        document.getElementById('reportContent').innerHTML = '<p>Error loading report.</p>';
    });
};

// Reset report function
window.resetReport = () => {
    if (confirm('Are you sure you want to reset the report? This will delete all stored results.')) {
        resultsRef.remove().then(() => {
            console.log('Report reset successfully');
            document.getElementById('reportContent').innerHTML = '<p>Report has been reset. No results available.</p>';
        }).catch(error => {
            console.error('Error resetting report:', error);
            alert('Error resetting report: ' + error.message);
        });
    }
};

// Print report as PDF function
window.printReport = () => {
    const printWindow = window.open('', '_blank');
    const reportContent = document.getElementById('reportContent').innerHTML;
    printWindow.document.write(`
        <html>
        <head>
            <title>Exam Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <h2>Exam Report</h2>
            ${reportContent}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
};
