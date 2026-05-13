/* ================= REPORT (FIXED) ================= */
// function showReport(){
// setView("report");
// resultsRef.once("value",r=>{
// let html=`
// <table border="1" width="100%" style="text-align:center;">
// <tr>
// <th>Exam</th>
// <th>Attempts</th>
// <th>Score</th>
// </tr>`;
// const v=r.val()||{};
// Object.values(v).forEach(x=>{
// html+=`
// <tr>
// <td>${examsCache[x.examId]?.title || "Unknown Exam"}</td>
// <td>${x.attempts || 1}</td>
// <td>${x.score}</td>
// </tr>`;
// });
// html+="</table>";
// reportContent.innerHTML=html;
// });
// }
function getDayRange(date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

function showReport() {
    const isAdmin = currentUser && (currentUser.email === 'admin@modli.com' || currentUser.email.includes('admin'));
    if(!isAdmin) {
        showNotification("Admin access required", true);
        return;
    }

    setView("report");

    const fromInput = document.getElementById("dateFrom")?.value;
    const toInput   = document.getElementById("dateTo")?.value;

    const fromDate = fromInput ? new Date(fromInput) : new Date();
    const toDate   = toInput   ? new Date(toInput)   : new Date();

    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);

    resultsRef.once("value", snap => {
        const data = snap.val() || {};
        const reportMap = {};

        Object.values(data).forEach(x => {
            if (!x.timestamp || x.score == null || !x.examId) return;

            const d = new Date(x.timestamp);
            if (d < fromDate || d > toDate) return;

            if (!reportMap[x.examId]) {
                reportMap[x.examId] = {
                    count: 0,
                    total: 0,
                    min: x.score,
                    max: x.score
                };
            }

            const rep = reportMap[x.examId];
            rep.count++;
            rep.total += x.score;
            rep.min = Math.min(rep.min, x.score);
            rep.max = Math.max(rep.max, x.score);
        });

        if (Object.keys(reportMap).length === 0) {
            reportContent.innerHTML =
                `<div style="text-align:center; padding: 40px; background: #fff; border-radius: 12px; border: 1px solid var(--border);">
                    <p style="color:var(--danger); font-weight: 500;">No results found for selected period</p>
                 </div>`;
            return;
        }

        let html = `
        <div style="background: #fff; border-radius: 12px; border: 1px solid var(--border); overflow: hidden;">
            <div style="padding: 20px; border-bottom: 1px solid var(--border); background: #f8fafc;">
                <h3 style="font-size: 1rem; color: var(--text-muted);">Period: ${fromDate.toLocaleDateString()} - ${toDate.toLocaleDateString()}</h3>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Exam Title</th>
                        <th>Attempts</th>
                        <th>Min Score</th>
                        <th>Avg Score</th>
                        <th>Max Score</th>
                    </tr>
                </thead>
                <tbody>`;

        Object.keys(reportMap).forEach(examId => {
            const r = reportMap[examId];
            html += `
            <tr>
                <td style="font-weight: 600;">${examsCache[examId]?.title || "Unknown Exam"}</td>
                <td>${r.count}</td>
                <td><span style="color: var(--danger);">${r.min}</span></td>
                <td style="font-weight: 600; color: var(--primary);">${(r.total / r.count).toFixed(2)}</td>
                <td><span style="color: var(--secondary);">${r.max}</span></td>
            </tr>`;
        });

        html += `</tbody></table></div>`;
        reportContent.innerHTML = html;
    });
}



/* ================= REPORT ACTIONS ================= */



function resetReport(){
    if(!confirm("Are you sure you want to permanently delete all results? This cannot be undone.")){
        return;
    }
    resultsRef.remove().then(() => {
        showNotification("All report data cleared");
        showReport();
    }).catch(err => {
        showNotification("Error: " + err.message, true);
    });
}

// function printReport(){
// const w=window.open();
// w.document.write(reportContent.innerHTML);
// w.print();
// }

function printReport() {
    const MODLI_LOGO_BASE64="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";

    const w = window.open('', '_blank');

    w.document.write(`
    <html>
    <head>
        <title>Exam Report</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                padding: 30px;
            }

            .header {
                text-align: center;
                margin-bottom: 25px;
            }

            .header img {
                width: 90px;
                margin-bottom: 10px;
            }

            h2 {
                margin: 5px 0 15px;
            }

            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
            }

            th, td {
                border: 1px solid #000;
                padding: 8px;
                text-align: center; /* CENTER values */
            }

            th {
                background-color: #f2f2f2;
            }

            footer {
                margin-top: 30px;
                text-align: center;
                font-size: 12px;
            }
        </style>
    </head>
    <body>

        <div class="header">
            <img src="data:image/png;base64,${MODLI_LOGO_BASE64}">
            <h2>Exam Report</h2>
        </div>

        ${document.getElementById("reportContent").innerHTML}

        <footer>
           © 2026 Modli Exam System
        </footer>

    </body>
    </html>
    `);

    w.document.close();
    w.focus();
    w.print();
}


// window.addEventListener("load", () => {
//     const today = new Date().toISOString().split("T")[0];
//     const dateInput = document.getElementById("reportDate");
//     if (dateInput) dateInput.value = today;
// });
window.addEventListener("load", () => {
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("dateFrom").value = today;
    document.getElementById("dateTo").value = today;
});
