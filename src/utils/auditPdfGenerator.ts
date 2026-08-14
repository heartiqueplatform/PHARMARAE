// utils/auditPdfGenerator.ts - FIXED SUMMARY BOX
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AuditLog {
    id: string;
    action: string;
    details?: string;
    user_name?: string;
    user_id?: string;
    created_at: string;
    entity_type?: string;
    entity_id?: string;
}

interface Profile {
    id: string;
    full_name?: string;
    pharmacy_name?: string;
    email?: string;
    phone?: string;
    role?: string;
}

interface Pharmacy {
    name: string;
    address?: string;
    phone: string;
    currency?: string;
}

// Branding footer
const addBrandingFooter = (doc: jsPDF, y?: number) => {
    const pageHeight = doc.internal.pageSize.height;
    const startY = y || pageHeight - 12;

    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');

    const footerTexts = [
        'Powered by MEDRAE NURSING KENYA',
        'For more info: medraenursing@gmail.com | 0704473503'
    ];

    footerTexts.forEach((line, index) => {
        doc.text(line, doc.internal.pageSize.width / 2, startY + (index * 3), { align: 'center' });
    });

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
};

/**
 * Generate a comprehensive Audit Log Report PDF
 */
export function generateAuditReportPdf(
    pharmacy: Pharmacy,
    auditLogs: AuditLog[],
    profile: Profile | null,
    dateRange?: { from: string; to: string }
) {
    const doc = new jsPDF();
    const currency = pharmacy.currency || 'KSh';

    // --- HEADER: Pharmienta Branding ---
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');

    const pTitle = 'PHARM';
    const rTitle = 'IENTA';
    const pTitleWidth = doc.getTextWidth(pTitle);
    const rTitleWidth = doc.getTextWidth(rTitle);
    const startXTitle = 105 - ((pTitleWidth + rTitleWidth) / 2);

    doc.setTextColor(0, 51, 102);
    doc.text(pTitle, startXTitle, 15);
    doc.setTextColor(180, 0, 0);
    doc.text(rTitle, startXTitle + pTitleWidth, 15);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text('KENYA', 105, 22, { align: 'center' });

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text('Oriented To Care', 105, 28, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(pharmacy.name, 105, 35, { align: 'center' });

    // --- REPORT TITLE ---
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('AUDIT LOG REPORT', 105, 42, { align: 'center' });

    const dateStr = dateRange
        ? `${new Date(dateRange.from).toLocaleDateString()} to ${new Date(dateRange.to).toLocaleDateString()}`
        : 'All Time';
    doc.text(`Period: ${dateStr}`, 105, 47, { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 52, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(14, 56, 196, 56);

    // --- ANALYZE AUDIT DATA ---
    const sortedLogs = [...auditLogs].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const totalLogs = sortedLogs.length;
    const uniqueUsers = new Set(sortedLogs.map(log => log.user_name || 'System')).size;

    const actionCounts: Record<string, number> = {};
    const userActivity: Record<string, number> = {};
    const entityTypeCounts: Record<string, number> = {};

    sortedLogs.forEach(log => {
        const action = log.action || 'unknown';
        actionCounts[action] = (actionCounts[action] || 0) + 1;

        const userName = log.user_name || 'System';
        userActivity[userName] = (userActivity[userName] || 0) + 1;

        const entity = log.entity_type || 'other';
        entityTypeCounts[entity] = (entityTypeCounts[entity] || 0) + 1;
    });

    let mostActiveUser = 'N/A';
    let maxActivity = 0;
    Object.entries(userActivity).forEach(([name, count]) => {
        if (count > maxActivity) {
            maxActivity = count;
            mostActiveUser = name;
        }
    });

    let mostCommonAction = 'N/A';
    let maxActionCount = 0;
    Object.entries(actionCounts).forEach(([action, count]) => {
        if (count > maxActionCount) {
            maxActionCount = count;
            mostCommonAction = action;
        }
    });

    // --- DISPLAY KPIs ---
    let yPos = 64;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Audit Statistics & KPIs', 14, yPos);
    yPos += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    doc.text(`Total Audit Events: ${totalLogs}`, 14, yPos);
    doc.text(`Unique Users: ${uniqueUsers}`, 110, yPos);
    yPos += 5;

    doc.text(`Most Active User: ${mostActiveUser} (${maxActivity} actions)`, 14, yPos);
    doc.text(`Most Common Action: ${mostCommonAction} (${maxActionCount} times)`, 110, yPos);
    yPos += 5;

    const topActions = Object.entries(actionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([action, count]) => `${action}: ${count}`)
        .join(' | ');

    doc.text(`Top Actions: ${topActions}`, 14, yPos);
    yPos += 5;

    const topEntities = Object.entries(entityTypeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([entity, count]) => `${entity}: ${count}`)
        .join(' | ');

    doc.text(`Top Entities: ${topEntities}`, 14, yPos);
    yPos += 8;

    // --- ACTION BREAKDOWN TABLE ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Action Breakdown', 14, yPos);
    yPos += 4;

    const actionRows = Object.entries(actionCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([action, count]) => [
            action,
            count.toString(),
            `${((count / totalLogs) * 100).toFixed(1)}%`
        ]);

    if (actionRows.length > 0) {
        autoTable(doc, {
            startY: yPos,
            head: [['Action Type', 'Count', 'Percentage']],
            body: actionRows,
            theme: 'striped',
            styles: { fontSize: 7.5 },
            headStyles: {
                fillColor: [0, 51, 102],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8
            },
            columnStyles: {
                0: { cellWidth: 70 },
                1: { cellWidth: 30, halign: 'center' },
                2: { cellWidth: 30, halign: 'center' }
            },
            margin: { left: 14, right: 14 }
        });
    }

    yPos = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : yPos + 20;

    // --- USER ACTIVITY TABLE ---
    if (yPos > 230) { doc.addPage(); yPos = 20; }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('User Activity Breakdown', 14, yPos);
    yPos += 4;

    const userRows = Object.entries(userActivity)
        .sort((a, b) => b[1] - a[1])
        .map(([user, count]) => [
            user,
            count.toString(),
            `${((count / totalLogs) * 100).toFixed(1)}%`
        ]);

    if (userRows.length > 0) {
        autoTable(doc, {
            startY: yPos,
            head: [['User', 'Actions', 'Percentage']],
            body: userRows,
            theme: 'striped',
            styles: { fontSize: 7.5 },
            headStyles: {
                fillColor: [14, 116, 144],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8
            },
            columnStyles: {
                0: { cellWidth: 80 },
                1: { cellWidth: 30, halign: 'center' },
                2: { cellWidth: 30, halign: 'center' }
            },
            margin: { left: 14, right: 14 }
        });
    }

    yPos = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : yPos + 20;

    // --- DETAILED AUDIT LOG TABLE ---
    if (yPos > 230) { doc.addPage(); yPos = 20; }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Detailed Audit Log (Most Recent First)', 14, yPos);
    yPos += 4;

    const displayLogs = sortedLogs.slice(0, 100);

    const logRows = displayLogs.map(log => [
        new Date(log.created_at).toLocaleString(),
        log.user_name || 'System',
        log.action || 'Unknown',
        log.details || '-',
        log.entity_type || '-'
    ]);

    if (logRows.length > 0) {
        autoTable(doc, {
            startY: yPos,
            head: [['Time', 'User', 'Action', 'Details', 'Entity']],
            body: logRows,
            theme: 'striped',
            styles: { fontSize: 6.5 },
            headStyles: {
                fillColor: [30, 41, 59],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 7
            },
            columnStyles: {
                0: { cellWidth: 35 },
                1: { cellWidth: 25 },
                2: { cellWidth: 25 },
                3: { cellWidth: 50 },
                4: { cellWidth: 20 }
            },
            margin: { left: 14, right: 14 }
        });
    }

    yPos = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : yPos + 20;

    // --- SMART INSIGHTS & RECOMMENDATIONS ---
    if (yPos > 230) { doc.addPage(); yPos = 20; }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 51, 102);
    doc.text('Smart Insights & Security Recommendations', 14, yPos);
    doc.setTextColor(0, 0, 0);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    let insightY = yPos + 7;

    if (totalLogs > 100) {
        doc.text(`HIGH ACTIVITY: ${totalLogs} audit events recorded. Your pharmacy has high operational activity.`, 14, insightY);
        insightY += 5;
    } else if (totalLogs > 50) {
        doc.text(`MODERATE ACTIVITY: ${totalLogs} audit events recorded. Regular operational activity detected.`, 14, insightY);
        insightY += 5;
    } else if (totalLogs > 0) {
        doc.text(`LOW ACTIVITY: ${totalLogs} audit events recorded. Consider reviewing if all activities are being logged.`, 14, insightY);
        insightY += 5;
    }

    if (mostCommonAction !== 'N/A') {
        doc.text(`COMMON ACTION: "${mostCommonAction}" is the most frequent activity (${maxActionCount} times). This is normal pharmacy operation.`, 14, insightY);
        insightY += 5;
    }

    if (mostActiveUser !== 'N/A') {
        doc.text(`USER ACTIVITY: "${mostActiveUser}" is the most active user with ${maxActivity} actions.`, 14, insightY);
        insightY += 5;
    }

    const suspiciousActions = ['login_failed', 'failed_login', 'unauthorized_access'];
    const suspiciousLogs = sortedLogs.filter(log =>
        suspiciousActions.some(action => log.action?.toLowerCase().includes(action))
    );

    if (suspiciousLogs.length > 0) {
        doc.setTextColor(220, 38, 38);
        doc.text(`SECURITY ALERT: ${suspiciousLogs.length} suspicious activities detected (failed logins, unauthorized access). Review these immediately.`, 14, insightY);
        doc.setTextColor(0, 0, 0);
        insightY += 5;
    } else {
        doc.text(`SECURITY STATUS: No suspicious activities detected. Good security posture.`, 14, insightY);
        insightY += 5;
    }

    const modifications = sortedLogs.filter(log =>
        log.action?.toLowerCase().includes('update') ||
        log.action?.toLowerCase().includes('edit') ||
        log.action?.toLowerCase().includes('delete')
    );

    if (modifications.length > 0) {
        const modPercentage = ((modifications.length / totalLogs) * 100).toFixed(1);
        doc.text(`DATA MODIFICATIONS: ${modifications.length} modifications (${modPercentage}% of all actions). Normal data maintenance.`, 14, insightY);
        insightY += 5;
    }

    // --- EXECUTIVE SUMMARY BOX - FIXED WITH PROPER TEXT WRAPPING ---
    if (insightY > 230) {
        doc.addPage();
        insightY = 20;
    }

    insightY += 8;

    // Make the box taller to accommodate wrapped text
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(0.5);
    doc.rect(14, insightY, 182, 50); // Increased height from 40 to 50

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 51, 102);
    doc.text('EXECUTIVE AUDIT SUMMARY', 20, insightY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);

    // Build summary text with proper wrapping
    const summaryLines = [
        `This audit report covers ${totalLogs} events across ${uniqueUsers} users.`,
        `The most active user was "${mostActiveUser}" with ${maxActivity} actions.`,
        `The most common action was "${mostCommonAction}" occurring ${maxActionCount} times.`,
        `${suspiciousLogs.length > 0 ? `⚠️ ${suspiciousLogs.length} suspicious activities detected.` : '✅ No suspicious activities detected.'}`,
        `Review this report regularly for security compliance.`
    ];

    let lineY = insightY + 14;
    summaryLines.forEach((line) => {
        // Split long lines if needed
        const splitLines = doc.splitTextToSize(line, 165);
        splitLines.forEach((splitLine: string) => {
            doc.text(splitLine, 20, lineY);
            lineY += 4.5;
        });
    });

    // --- FOOTER ---
    const footerY = insightY + 60; // Adjusted for taller box
    if (footerY > 270) {
        doc.addPage();
        addBrandingFooter(doc, 20);
    } else {
        addBrandingFooter(doc, Math.min(footerY, 280));
    }

    // --- SAVE THE PDF ---
    const todayStr = new Date().toISOString().split('T')[0];
    doc.save(`Audit_Report_${todayStr}.pdf`);
}