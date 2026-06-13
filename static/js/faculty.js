function discoverStudentsByAttributes() {
    const fieldValue = (id) => {
        const field = document.getElementById(id);
        return field ? field.value.trim() : "";
    };

    const stream = fieldValue('filter_stream');
    const className = fieldValue('filter_class');
    const batch = fieldValue('filter_batch');
    const semester = fieldValue('filter_semester');
    const year = fieldValue('filter_year');
    const department = fieldValue('filter_department');
    const section = fieldValue('filter_section');

    let queryParams = new URLSearchParams({
        stream: stream,
        class_name: className,
        batch: batch,
        semester: semester,
        academic_year: year,
        department: department,
        section: section
    });

    fetch(`/api/reports/discover-students?${queryParams.toString()}`)
    .then(res => res.json())
    .then(students => {
        const tableBody = document.getElementById('discovered-students-rows');
        tableBody.innerHTML = "";
        
        if(students.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--slate-600);">No isolated records matched these filter criteria.</td></tr>`;
            return;
        }

        students.forEach(s => {
            tableBody.innerHTML += `
                <tr>
                    <td><strong>${s.name}</strong></td>
                    <td><code>${s.roll_no}</code></td>
                    <td>${s.age || '-'}</td>
                    <td>${s.enrollment_year || '-'}</td>
                    <td>${s.stream}</td>
                    <td>${s.class} [Class ${s.batch}]</td>
                    <td>${s.year}</td>
                </tr>
            `;
        });
    });
}

function approveFacultyAccess(userId) {
    fetch(`/api/admin/approve-faculty/${userId}`, { method: 'POST' })
    .then(res => res.json())
    .then(data => {
        alert(data.message || 'Faculty access updated.');
        if (data.success) {
            const row = document.getElementById(`pending-faculty-${userId}`);
            if (row) row.remove();

            const pendingBody = document.getElementById('pending-faculty-rows');
            if (pendingBody && pendingBody.children.length === 0) {
                pendingBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--slate-600);">No faculty accounts are waiting for approval.</td></tr>`;
            }
            filterTeacherDirectory();
        }
    });
}

function filterTeacherDirectory() {
    const departmentField = document.getElementById('teacher_filter_department');
    const department = departmentField ? departmentField.value.trim() : "";
    const queryParams = new URLSearchParams({ department });

    fetch(`/api/admin/teacher-directory?${queryParams.toString()}`)
    .then(res => res.json())
    .then(teachers => {
        const tableBody = document.getElementById('teacher-directory-rows');
        if (!tableBody) return;

        tableBody.innerHTML = "";
        if (teachers.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--slate-600);">No teachers matched this department filter.</td></tr>`;
            return;
        }

        teachers.forEach(t => {
            const statusColor = t.status === 'Approved' ? 'var(--emerald-600)' : 'var(--rose-700)';
            tableBody.innerHTML += `
                <tr>
                    <td><strong>${t.name}</strong></td>
                    <td><code>${t.faculty_id || '-'}</code></td>
                    <td>${t.department || '-'}</td>
                    <td>${t.subject || '-'}</td>
                    <td><strong style="color:${statusColor};">${t.status}</strong></td>
                </tr>
            `;
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('teacher-directory-rows')) {
        filterTeacherDirectory();
    }
});

function fetchComplianceTimelineLog(projectId) {
    const listArea = document.getElementById(`compliance-outstanding-log-${projectId}`);
    fetch(`/api/faculty/compliance-report/${projectId}`)
    .then(res => res.json())
    .then(students => {
        listArea.innerHTML = "";
        if (students.length === 0) {
            listArea.innerHTML = `<span style="color:var(--emerald-600); font-weight:700;">✓ All students inside this cohort are compliant.</span>`;
            return;
        }
        let markup = `<p style="color:var(--rose-700); font-weight:700; margin-bottom:0.5rem;">⚠️ Non-Participation Compliance Timeline Alert - Missing Forms:</p><ul style="padding-left:1.25rem; margin:0;">`;
        students.forEach(s => {
            markup += `<li>${s.name} (Roll: <code>${s.roll_no}</code>) - Class: ${s.class}</li>`;
        });
        markup += `</ul>`;
        listArea.innerHTML = markup;
    });
}

function loadRosterPrintData(projectId) {
    const outputContainer = document.getElementById(`teams-allocation-view-${projectId}`);
    fetch(`/api/project/${projectId}/roster-report`)
    .then(res => res.json())
    .then(teams => {
        outputContainer.innerHTML = "";
        if (Object.keys(teams).length === 0) {
            outputContainer.innerHTML = "<p>No cluster unit maps compiled yet for this workspace.</p>";
            return;
        }
        for (const [teamNum, members] of Object.entries(teams)) {
            let memberRowsMarkup = "";
            members.forEach(m => {
                memberRowsMarkup += `<li><span><strong>${m.name}</strong> [${m.username}]</span></li>`;
            });
            outputContainer.innerHTML += `
                <div class="allocated-team-block">
                    <h5>Cluster Group Unit #${teamNum}</h5>
                    <ul>${memberRowsMarkup}</ul>
                </div>`;
        }
    });
}

function runTeamMatchmakingOptimization(projectId) {
    fetch(`/api/project/${projectId}/generate-teams`, { method: 'POST' })
    .then(res => res.json()).then(data => { alert(data.message); if (data.success) loadRosterPrintData(projectId); });
}

function triggerSystemPrintOperation(projectId) { window.print(); }
function injectCustomSkillToForm() {
    const input = document.getElementById('custom_skill_entry');
    const name = input.value.trim();
    if(!name) return;
    document.querySelector('.checkbox-matrix').innerHTML += `<label class="matrix-cb-label"><input type="checkbox" class="skill-checkbox" value="${name}" checked> ${name}</label>`;
    input.value = "";
}
function compileAndPublishProject() {
    const skills = [];
    document.querySelectorAll('.skill-checkbox:checked').forEach(cb => skills.push(cb.value));
    fetch('/api/project/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: document.getElementById('p_name').value,
            description: document.getElementById('p_desc').value,
            batch: document.getElementById('p_batch').value,
            team_size: document.getElementById('p_team_size').value,
            deadline: document.getElementById('p_deadline').value,
            skills: skills
        })
    }).then(res => res.json()).then(data => { alert(data.message); if(data.success) window.location.href='/faculty/dashboard'; });
}

// 5. INJECT UNTRACKED SKILL TAG INTO ACTIVE INTERFACE MATRIX
function injectCustomSkillToForm() {
    const input = document.getElementById('custom_skill_entry');
    const skillName = input.value.trim();
    
    if (!skillName) {
        alert("Please specify a valid skill tag label.");
        return;
    }
    
    const container = document.querySelector('.checkbox-matrix');
    const label = document.createElement('label');
    label.className = 'matrix-cb-label';
    label.innerHTML = `<input type="checkbox" class="skill-checkbox" value="${skillName}" checked> ${skillName}`;
    
    container.appendChild(label);
    input.value = ""; // Empty out field
}

// 6. COMPILE CONSTRAINTS MATRIX AND DISPATCH PROJECT CAMPAIGN
function compileAndPublishProject() {
    const name = document.getElementById('p_name').value.trim();
    const description = document.getElementById('p_desc').value.trim();
    const batch = document.getElementById('p_batch').value.trim();
    const teamSize = document.getElementById('p_team_size').value;
    const deadline = document.getElementById('p_deadline').value.trim();
    
    const selectedSkills = [];
    document.querySelectorAll('.skill-checkbox:checked').forEach(cb => {
        selectedSkills.push(cb.value);
    });

    if (!name || !description || !batch || !deadline) {
        alert("Operation Aborted: All configuration perimeter bars must be filled.");
        return;
    }

    fetch('/api/project/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: name,
            description: description,
            batch: batch,
            team_size: teamSize,
            deadline: deadline,
            skills: selectedSkills
        })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        if (data.success) {
            window.location.href = '/faculty/dashboard';
        }
    });
}
