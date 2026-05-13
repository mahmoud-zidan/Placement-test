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

    const filterOrg = document.getElementById("filterOrg").value;
    const filterName = document.getElementById("filterName").value.trim().toLowerCase();
    const filterId = document.getElementById("filterId").value.trim();

    resultsRef.once("value", snap => {
        const data = snap.val() || {};
        const resultsList = [];

        Object.values(data).forEach(x => {
            if (!x.timestamp || x.score == null) return;

            const d = new Date(x.timestamp);
            if (d < fromDate || d > toDate) return;
            
            if (filterOrg !== "all" && x.orgName !== filterOrg) return;
            if (filterName && (!x.studentName || !x.studentName.toLowerCase().includes(filterName))) return;
            if (filterId && x.nationalId !== filterId) return;

            resultsList.push(x);
        });

        if (resultsList.length === 0) {
            reportContent.innerHTML =
                `<div style="text-align:center; padding: 40px; background: #fff; border-radius: 12px; border: 1px solid var(--border);">
                    <p style="color:var(--danger); font-weight: 500;">No results found for selected period</p>
                 </div>`;
            return;
        }

        // Sort by timestamp descending (newest first)
        resultsList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Calculate Stats
        const total = resultsList.length;
        const avgPercentage = total > 0 
            ? (resultsList.reduce((sum, r) => sum + parseFloat(r.percentage || 0), 0) / total).toFixed(1)
            : 0;
        const passCount = resultsList.filter(r => parseFloat(r.percentage || 0) >= 50).length;
        const passRate = total > 0 ? ((passCount / total) * 100).toFixed(1) : 0;

        let html = `
        <!-- QUICK FILTERS -->
        <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
            <button onclick="setQuickDate('today')" class="secondary" style="padding: 6px 14px; font-size: 0.8rem; border-radius: 20px;">📅 Today</button>
            <button onclick="setQuickDate('month')" class="secondary" style="padding: 6px 14px; font-size: 0.8rem; border-radius: 20px;">🗓️ This Month</button>
            <button onclick="setQuickDate('all')" class="secondary" style="padding: 6px 14px; font-size: 0.8rem; border-radius: 20px;">🌐 All Time</button>
        </div>

        <!-- STATS GRID -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
            <div class="card-view" style="padding: 24px; display: flex; align-items: center; gap: 20px; border-left: 5px solid var(--primary);">
                <div style="width: 48px; height: 48px; background: #e0e7ff; color: var(--primary); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">👥</div>
                <div>
                    <p style="color: var(--text-muted); font-size: 0.85rem; font-weight: 600; margin: 0;">Total Students</p>
                    <h3 style="font-size: 1.5rem; margin: 0; color: var(--text-main); font-family: 'Outfit';">${total}</h3>
                </div>
            </div>
            <div class="card-view" style="padding: 24px; display: flex; align-items: center; gap: 20px; border-left: 5px solid #10b981;">
                <div style="width: 48px; height: 48px; background: #d1fae5; color: #059669; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">📊</div>
                <div>
                    <p style="color: var(--text-muted); font-size: 0.85rem; font-weight: 600; margin: 0;">Avg. Score</p>
                    <h3 style="font-size: 1.5rem; margin: 0; color: var(--text-main); font-family: 'Outfit';">${avgPercentage}%</h3>
                </div>
            </div>
            <div class="card-view" style="padding: 24px; display: flex; align-items: center; gap: 20px; border-left: 5px solid #f59e0b;">
                <div style="width: 48px; height: 48px; background: #fef3c7; color: #d97706; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">🏆</div>
                <div>
                    <p style="color: var(--text-muted); font-size: 0.85rem; font-weight: 600; margin: 0;">Pass Rate</p>
                    <h3 style="font-size: 1.5rem; margin: 0; color: var(--text-main); font-family: 'Outfit';">${passRate}%</h3>
                </div>
            </div>
        </div>

        <div class="card-view" style="overflow: hidden; padding: 0; border: 1px solid var(--border); box-shadow: var(--shadow-sm);">
            <div style="padding: 20px 24px; background: #f8fafc; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                <h3 style="font-size: 1rem; color: var(--text-main); font-weight: 700; display: flex; align-items: center; gap: 8px;">
                    <svg style="width: 18px; height: 18px; color: var(--primary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
                    Student Performance Records
                </h3>
                <span style="font-size: 0.85rem; color: var(--text-muted); background: white; padding: 4px 12px; border-radius: 20px; border: 1px solid var(--border);">
                    Records Found: <b>${total}</b>
                </span>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin: 0;">
                <thead style="background: #f8fafc;">
                    <tr>
                        <th style="padding: 16px 24px; text-transform: uppercase; font-size: 0.75rem; color: #64748b; letter-spacing: 0.05em;">Student Identity</th>
                        <th style="text-transform: uppercase; font-size: 0.75rem; color: #64748b; letter-spacing: 0.05em;">National ID</th>
                        <th style="text-transform: uppercase; font-size: 0.75rem; color: #64748b; letter-spacing: 0.05em;">Exam Info</th>
                        <th style="text-transform: uppercase; font-size: 0.75rem; color: #64748b; letter-spacing: 0.05em;">Score Status</th>
                        <th style="text-transform: uppercase; font-size: 0.75rem; color: #64748b; letter-spacing: 0.05em;">Submission Date</th>
                        <th style="text-transform: uppercase; font-size: 0.75rem; color: #64748b; letter-spacing: 0.05em;">Actions</th>
                    </tr>
                </thead>
                <tbody>`;

        // We need keys to update records. Let's get them from the snapshot.
        const snapData = snap.val();
        const keys = Object.keys(snapData);
        
        resultsList.forEach(r => {
            // Find key for this result
            const rKey = keys.find(k => snapData[k].timestamp === r.timestamp && snapData[k].nationalId === r.nationalId);
            
            const scorePercent = parseFloat(r.percentage || 0);
            const isPass = scorePercent >= 50;
            const scoreBg = isPass ? '#ecfdf5' : '#fef2f2';
            const scoreText = isPass ? '#059669' : '#dc2626';
            const scoreBorder = isPass ? '#bbf7d0' : '#fecaca';

            html += `
            <tr style="border-bottom: 1px solid #f1f5f9; transition: all 0.2s; cursor: pointer;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                <td style="padding: 20px 24px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 36px; height: 36px; background: #f1f5f9; color: #4f46e5; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                            ${(r.studentName || "A").charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div style="font-weight: 700; color: #1e293b; font-size: 0.95rem;">${r.studentName || "Anonymous Student"}</div>
                            <div style="font-size: 0.8rem; color: #64748b;">${r.orgName || "General Organization"}</div>
                        </div>
                    </div>
                </td>
                <td style="color: #475569; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem;">${r.nationalId || "No ID Recorded"}</td>
                <td>
                    <div style="font-weight: 600; color: #334155; font-size: 0.9rem;">${r.examTitle || "General Exam"}</div>
                    <div style="font-size: 0.75rem; color: #94a3b8;">ID: ${r.examId ? r.examId.substring(0,8) : '---'}</div>
                </td>
                <td>
                    <div style="background: ${scoreBg}; color: ${scoreText}; border: 1.5px solid ${scoreBorder}; padding: 6px 14px; border-radius: 99px; display: inline-flex; align-items: center; gap: 6px; font-weight: 800; font-size: 0.85rem; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                        <span style="width: 8px; height: 8px; background: currentColor; border-radius: 50%;"></span>
                        ${r.score}/${r.totalQuestions} (${r.percentage}%)
                    </div>
                </td>
                <td style="color: #94a3b8; font-size: 0.8rem; font-weight: 500;">
                    ${new Date(r.timestamp).toLocaleDateString()}
                    <div style="font-size: 0.7rem; opacity: 0.7;">${new Date(r.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </td>
                <td style="padding: 12px 24px;">
                    ${r.retryAllowed ? 
                        '<span style="color: #10b981; font-size: 0.75rem; font-weight: 700;">✅ Retry Enabled</span>' : 
                        `<button onclick="window.allowRetry('${rKey}')" class="secondary" style="padding: 6px 12px; font-size: 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; cursor: pointer;">Allow Retry</button>`
                    }
                </td>
            </tr>`;
        });

        html += `</tbody></table></div>`;
        reportContent.innerHTML = html;
    });
}

function setQuickDate(type) {
    const from = document.getElementById('dateFrom');
    const to = document.getElementById('dateTo');
    const now = new Date();
    
    if (type === 'today') {
        const dateStr = now.toISOString().split('T')[0];
        from.value = dateStr;
        to.value = dateStr;
    } else if (type === 'month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        from.value = firstDay.toISOString().split('T')[0];
        to.value = now.toISOString().split('T')[0];
    } else if (type === 'all') {
        from.value = '';
        to.value = '';
    }
    showReport();
}
window.setQuickDate = setQuickDate;



/* ================= REPORT ACTIONS ================= */



function allowRetry(key) {
    if(!key) return;
    resultsRef.child(key).update({ retryAllowed: true }).then(() => {
        showNotification("Student allowed to retry this exam");
        showReport();
    }).catch(err => {
        showNotification("Error: " + err.message, true);
    });
}
window.allowRetry = allowRetry;

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

function printReport() {
    const reportContent = document.getElementById("reportContent");
    if (!reportContent) return;

    // High-quality Base64 Logo
    const MODLI_LOGO = "data:image/png;base64,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";

    const w = window.open('', '_blank');
    
    const printableHtml = reportContent.cloneNode(true);
    
    // Remove ALL UI elements and the Stats Grid as requested
    const unwanted = printableHtml.querySelectorAll('button, .button-group, div[style*="flex-wrap: wrap"], div[style*="grid-template-columns"]');
    unwanted.forEach(el => el.remove());

    w.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Placement Report - Modli</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Outfit:wght@700&display=swap');
            body { font-family: 'Inter', sans-serif; color: #0f172a; padding: 40px; background: white; }
            .print-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 30px; }
            .print-logo { height: 50px; }
            .report-title h1 { font-family: 'Outfit', sans-serif; margin: 0; font-size: 1.5rem; color: #4f46e5; }
            .card-view { border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 20px; page-break-inside: avoid; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #f8fafc; text-align: left; padding: 12px; font-size: 0.75rem; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
            td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 0.85rem; }
            @media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
        </style>
    </head>
    <body>
        <div class="print-header">
            <img src="${MODLI_LOGO}" class="print-logo">
            <div class="report-title"><h1>Placement Report</h1><p style="margin:4px 0 0; font-size:0.8rem; color:#64748b;">Generated: ${new Date().toLocaleString()}</p></div>
        </div>
        ${printableHtml.innerHTML}
        <div style="margin-top:40px; text-align:center; font-size:0.7rem; color:#94a3b8;">&copy; 2026 Modli Exam System — Assessment Document</div>
        <script>window.onload=function(){setTimeout(()=>{window.print();},500);};</script>
    </body>
    </html>
    `);
    w.document.close();
}


// window.addEventListener("load", () => {
//     const today = new Date().toISOString().split("T")[0];
//     const dateInput = document.getElementById("reportDate");
//     if (dateInput) dateInput.value = today;
// });
window.addEventListener("load", () => {
    const today = new Date().toISOString().split("T")[0];
    const dateFrom = document.getElementById("dateFrom");
    const dateTo = document.getElementById("dateTo");
    if(dateFrom) dateFrom.value = today;
    if(dateTo) dateTo.value = today;
});

function populateReportFilters() {
    const select = document.getElementById("filterOrg");
    if(!select) return;
    
    // Clear existing except "All"
    select.innerHTML = '<option value="all">All Organizations</option>';
    
    if(typeof orgsCache !== 'undefined') {
        Object.values(orgsCache).forEach(org => {
            const opt = document.createElement("option");
            opt.value = org.name;
            opt.textContent = org.name;
            select.appendChild(opt);
        });
    }
}

function clearAllResults() {
    if(!confirm("Are you sure you want to permanently delete ALL student results? This cannot be undone.")) return;
    resultsRef.remove().then(() => {
        showNotification("All results cleared");
        showReport();
    }).catch(err => {
        showNotification("Error: " + err.message, true);
    });
}

window.showReport = showReport;
window.populateReportFilters = populateReportFilters;
window.clearAllResults = clearAllResults;
