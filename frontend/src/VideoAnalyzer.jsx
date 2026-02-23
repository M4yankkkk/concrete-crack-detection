import { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format seconds → "m:ss" */
function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Split an array into chunks of `size` */
function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

/** Wrap the `seeked` event in a Promise so we can await it */
function waitForSeek(videoEl) {
    return new Promise((resolve) => {
        const handler = () => {
            videoEl.removeEventListener('seeked', handler);
            resolve();
        };
        videoEl.addEventListener('seeked', handler);
    });
}

// ─── PDF Report Generator ─────────────────────────────────────────────────────────────

function generateVideoReport(videoFile, incidentLog, progress, detectedFps) {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();   // 210 mm
    const pageH = doc.internal.pageSize.getHeight();  // 297 mm
    const M = 14;    // left/right margin
    const cW = pageW - 2 * M;  // content width
    const dateStr = new Date().toLocaleString();
    const hasCracks = incidentLog.length > 0;

    // ── Shared helpers ───────────────────────────────────────────────────────

    /** Standard dark header band with accent stripe */
    const drawHeader = (title, subtitle, accentRGB = [220, 38, 38]) => {
        doc.setFillColor(14, 14, 14);
        doc.rect(0, 0, pageW, 40, 'F');
        doc.setFillColor(...accentRGB);
        doc.rect(0, 0, 5, 40, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.text(title, 13, 17);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(140, 140, 140);
        doc.text(subtitle, 13, 27);
        doc.setFontSize(7);
        doc.text(dateStr, pageW - M, 34, { align: 'right' });
    };

    /** Standard light footer with page number */
    const drawFooter = (current, total) => {
        const y = pageH - 16;
        doc.setFillColor(246, 246, 246);
        doc.rect(0, y, pageW, 16, 'F');
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(0, y, pageW, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.text(
            'AI-Generated Drone Inspection Report · For preliminary assessment only · Not a substitute for professional structural engineering.',
            pageW / 2, y + 8, { align: 'center' }
        );
        doc.text(`Page ${current} of ${total}`, pageW - M, y + 8, { align: 'right' });
    };

    const totalSamples = progress.total;
    const clearFrames = totalSamples - incidentLog.length;
    const detectionRate = totalSamples > 0 ? ((incidentLog.length / totalSamples) * 100).toFixed(1) : '0.0';
    const totalPages = 1 + incidentLog.length + (hasCracks ? 1 : 0);
    const sampleInterval = detectedFps ? (10 / detectedFps * 1000).toFixed(0) : '—';

    const sevOf = (score) => {
        if (score >= 0.85) return { label: 'Critical', rgb: [220, 38, 38] };
        if (score >= 0.65) return { label: 'High', rgb: [249, 115, 22] };
        return { label: 'Moderate', rgb: [180, 140, 0] };
    };

    // ════════════════════════════════════════════════════════════
    // PAGE 1 — Executive Summary
    // ════════════════════════════════════════════════════════════

    drawHeader(
        'Drone Inspection Report',
        'AI-Powered Structural Health Monitoring  |  NITK Project',
        hasCracks ? [220, 38, 38] : [22, 163, 74]
    );

    // Verdict card
    const vY = 48;
    doc.setFillColor(hasCracks ? 255 : 245, hasCracks ? 248 : 255, hasCracks ? 248 : 250);
    doc.setDrawColor(hasCracks ? 220 : 22, hasCracks ? 38 : 163, hasCracks ? 38 : 74);
    doc.setLineWidth(0.6);
    doc.roundedRect(M, vY, cW, 26, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(hasCracks ? 185 : 16, hasCracks ? 20 : 120, hasCracks ? 20 : 56);
    doc.text(hasCracks ? '[!] STRUCTURAL DEFECTS DETECTED' : '[OK] NO CRACKS DETECTED', M + 7, vY + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(hasCracks ? 150 : 55, hasCracks ? 55 : 120, hasCracks ? 55 : 75);
    doc.text(
        hasCracks
            ? `${incidentLog.length} crack location(s) identified across ${totalSamples} analysed samples. Immediate structural review is recommended.`
            : `All ${totalSamples} analysed samples show no crack indicators. Structure appears structurally sound.`,
        M + 7, vY + 19, { maxWidth: cW - 14 }
    );

    // 4-column stats grid
    const sY = vY + 34;
    const bW = (cW - 4.5) / 4;
    [
        { label: 'Frames Analysed', value: String(totalSamples) },
        { label: 'Defects Found', value: String(incidentLog.length), alert: hasCracks },
        { label: 'Clear Frames', value: String(clearFrames) },
        { label: 'Detection Rate', value: `${detectionRate}%`, alert: hasCracks && detectionRate > 0 },
    ].forEach((st, i) => {
        const bx = M + i * (bW + 1.5);
        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.roundedRect(bx, sY, bW, 20, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(st.alert ? 185 : 25, st.alert ? 20 : 25, st.alert ? 20 : 25);
        doc.text(st.value, bx + bW / 2, sY + 10, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(130, 130, 130);
        doc.text(st.label.toUpperCase(), bx + bW / 2, sY + 17, { align: 'center' });
    });

    // Video metadata table
    const mY = sY + 28;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text('VIDEO METADATA', M, mY);
    [
        ['File Name', videoFile?.name || 'Unknown'],
        ['Detected FPS', detectedFps ? `${detectedFps} fps` : 'Unknown'],
        ['Sample Rate', `1 frame per 10 source frames (≈${sampleInterval} ms)`],
        ['Total Samples', String(totalSamples)],
        ['Defects Found', String(incidentLog.length)],
        ['Report Date', dateStr],
    ].forEach(([label, value], i) => {
        const ry = mY + 4 + i * 10;
        doc.setFillColor(i % 2 === 0 ? 250 : 244, i % 2 === 0 ? 250 : 244, i % 2 === 0 ? 250 : 244);
        doc.rect(M, ry, cW, 9, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(110, 110, 110);
        doc.text(label.toUpperCase(), M + 3, ry + 6.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(20, 20, 20);
        doc.text(String(value), M + 56, ry + 6.5, { maxWidth: cW - 60 });
    });

    // Severity breakdown (only when defects exist)
    if (hasCracks) {
        const counts = [
            { label: 'Critical (≥85%)', count: incidentLog.filter(d => d.raw_score >= 0.85).length, rgb: [220, 38, 38] },
            { label: 'High (65–85%)', count: incidentLog.filter(d => d.raw_score >= 0.65 && d.raw_score < 0.85).length, rgb: [249, 115, 22] },
            { label: 'Moderate (<65%)', count: incidentLog.filter(d => d.raw_score < 0.65).length, rgb: [180, 140, 0] },
        ];
        const bkY = mY + 4 + 6 * 10 + 8;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(90, 90, 90);
        doc.text('SEVERITY BREAKDOWN', M, bkY);
        const sw = (cW - 4) / 3;
        counts.forEach((c, i) => {
            const bx = M + i * (sw + 2);
            doc.setFillColor(252, 252, 252);
            doc.setDrawColor(...c.rgb);
            doc.setLineWidth(0.5);
            doc.roundedRect(bx, bkY + 4, sw, 18, 2, 2, 'FD');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(15);
            doc.setTextColor(...c.rgb);
            doc.text(String(c.count), bx + sw / 2, bkY + 15, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(130, 130, 130);
            doc.text(c.label, bx + sw / 2, bkY + 20, { align: 'center' });
        });
    }

    drawFooter(1, totalPages);

    // ════════════════════════════════════════════════════════════
    // PAGES 2…N — One per defect (Grad-CAM + details)
    // ════════════════════════════════════════════════════════════

    incidentLog.forEach((defect, idx) => {
        doc.addPage();
        const sev = sevOf(defect.raw_score);
        const confPct = Math.round(defect.raw_score * 100);

        drawHeader(
            `Defect #${idx + 1}  —  ${defect.timestampLabel}`,
            `Severity: ${sev.label}  ·  Confidence: ${confPct}%  ·  Raw score: ${defect.raw_score.toFixed(4)}`,
            sev.rgb
        );

        // Grad-CAM image (full-width, 16:9 aspect)
        const imgY = 44;
        const imgH = Math.round(cW * (9 / 16)); // ~102 mm
        if (defect.heatmap) {
            doc.addImage(defect.heatmap, 'JPEG', M, imgY, cW, imgH);
        }
        // Caption
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(130, 130, 130);
        doc.text(
            'Fig: Grad-CAM heatmap — warm/red zones show regions where the AI detected structural crack patterns.',
            M, imgY + imgH + 4.5, { maxWidth: cW }
        );

        // Details row: severity box + confidence bar
        const dY = imgY + imgH + 12;
        const lW = 58;
        const rX = M + lW + 5;
        const rW = cW - lW - 5;

        // Severity box
        doc.setFillColor(252, 252, 252);
        doc.setDrawColor(...sev.rgb);
        doc.setLineWidth(0.5);
        doc.roundedRect(M, dY, lW, 30, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text('SEVERITY', M + 4, dY + 8);
        doc.setFontSize(12);
        doc.setTextColor(...sev.rgb);
        doc.text(sev.label.toUpperCase(), M + lW / 2, dY + 19, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(140, 140, 140);
        doc.text(`Score: ${defect.raw_score.toFixed(4)}`, M + lW / 2, dY + 27, { align: 'center' });

        // Confidence bar box
        doc.setFillColor(252, 252, 252);
        doc.setDrawColor(210, 210, 210);
        doc.setLineWidth(0.3);
        doc.roundedRect(rX, dY, rW, 30, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text('CONFIDENCE LEVEL', rX + 4, dY + 8);
        doc.setTextColor(...sev.rgb);
        doc.text(`${confPct}%`, rX + rW - 4, dY + 8, { align: 'right' });
        // Track
        doc.setFillColor(225, 225, 225);
        doc.roundedRect(rX + 4, dY + 12, rW - 8, 5, 1.5, 1.5, 'F');
        // Fill
        doc.setFillColor(...sev.rgb);
        doc.roundedRect(rX + 4, dY + 12, Math.max(1, (rW - 8) * confPct / 100), 5, 1.5, 1.5, 'F');
        // Description
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(60, 60, 60);
        doc.text(
            defect.raw_score >= 0.85
                ? 'Critical confidence. Immediate on-site structural inspection is strongly recommended.'
                : defect.raw_score >= 0.65
                    ? 'High confidence crack detection. Detailed structural survey recommended.'
                    : 'Moderate probability. Schedule a follow-up inspection at this location.',
            rX + 4, dY + 23, { maxWidth: rW - 8 }
        );

        // Metadata table
        const tY = dY + 38;
        [
            ['Timestamp', defect.timestampLabel],
            ['Frame Time', `${defect.timestamp.toFixed(3)} seconds`],
            ['Raw Score', defect.raw_score.toFixed(6)],
            ['Threshold', '0.5  (score > 0.5 = crack detected)'],
        ].forEach(([label, value], i) => {
            const ry = tY + i * 10;
            doc.setFillColor(i % 2 === 0 ? 250 : 244, i % 2 === 0 ? 250 : 244, i % 2 === 0 ? 250 : 244);
            doc.rect(M, ry, cW, 9, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(110, 110, 110);
            doc.text(label.toUpperCase(), M + 3, ry + 6.5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(20, 20, 20);
            doc.text(String(value), M + 50, ry + 6.5, { maxWidth: cW - 54 });
        });

        drawFooter(idx + 2, totalPages);
    });

    // ════════════════════════════════════════════════════════════
    // FINAL PAGE — Summary table + recommendations
    // ════════════════════════════════════════════════════════════

    if (hasCracks) {
        doc.addPage();

        drawHeader('Inspection Summary', `Complete defect log — ${incidentLog.length} defect(s) found`, [99, 102, 241]);

        // Table header
        const thY = 46;
        doc.setFillColor(28, 28, 28);
        doc.rect(M, thY, cW, 9, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(180, 180, 180);
        const cols = [
            { h: '#', x: M + 2 },
            { h: 'TIMESTAMP', x: M + 13 },
            { h: 'SEVERITY', x: M + 42 },
            { h: 'RAW SCORE', x: M + 80 },
            { h: 'CONFIDENCE', x: M + 118 },
            { h: 'STATUS', x: M + 158 },
        ];
        cols.forEach(c => doc.text(c.h, c.x, thY + 6.5));

        incidentLog.forEach((defect, i) => {
            const ry = thY + 10 + i * 9;
            const sev = sevOf(defect.raw_score);
            const pct = Math.round(defect.raw_score * 100);
            doc.setFillColor(i % 2 === 0 ? 250 : 244, i % 2 === 0 ? 250 : 244, i % 2 === 0 ? 250 : 244);
            doc.rect(M, ry, cW, 8, 'F');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(30, 30, 30);
            doc.text(String(i + 1), M + 2, ry + 5.5);
            doc.text(defect.timestampLabel, M + 13, ry + 5.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...sev.rgb);
            doc.text(sev.label, M + 42, ry + 5.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 30, 30);
            doc.text(defect.raw_score.toFixed(4), M + 80, ry + 5.5);
            doc.text(`${pct}%`, M + 118, ry + 5.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(185, 20, 20);
            doc.text('CRACK ⚠️', M + 158, ry + 5.5);
        });

        // Recommendations box
        const recY = thY + 10 + incidentLog.length * 9 + 14;
        doc.setFillColor(255, 248, 248);
        doc.setDrawColor(220, 38, 38);
        doc.setLineWidth(0.5);
        doc.roundedRect(M, recY, cW, 46, 3, 3, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(185, 20, 20);
        doc.text('⚠ RECOMMENDATIONS', M + 6, recY + 9);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.8);
        doc.setTextColor(100, 30, 30);
        [
            `• ${incidentLog.length} defect location(s) detected — a licensed civil/structural engineer must perform on-site verification.`,
            '• Refer to the Grad-CAM pages in this report for exact AI attention zones at each defect location.',
            '• Prioritise “Critical” severity timestamps for immediate structural assessment.',
            '• This AI report is for preliminary screening only and does not replace professional structural inspection.',
        ].forEach((line, i) => {
            doc.text(line, M + 6, recY + 17 + i * 7, { maxWidth: cW - 12 });
        });

        drawFooter(totalPages, totalPages);
    }

    // Save
    const baseName = videoFile?.name?.replace(/\.[^.]+$/, '') || 'drone_inspection';
    doc.save(`${baseName}_report.pdf`);
}

/**
 * Detect the video's true FPS by playing it briefly and measuring
 * inter-frame intervals via requestVideoFrameCallback.
 *
 * WHY NOT SEEK-BASED: `presentedFrames` only ticks +1 per seek on a
 * paused video (browser renders one frame per seek), so comparing
 * presentedFrames across two seeks always returns ~1 fps.
 *
 * This approach plays the video muted for FRAMES_TO_MEASURE frames,
 * calculates the median inter-frame interval, then pauses + rewinds.
 * Falls back to 30 fps on unsupported browsers or timeout.
 */
const SAMPLE_EVERY = 10;  // 1 sample per this many source frames
const FRAMES_TO_MEASURE = 10;  // frames to play during FPS probe

async function detectFPS(videoEl) {
    if (!('requestVideoFrameCallback' in HTMLVideoElement.prototype)) {
        console.info('[VA] requestVideoFrameCallback not supported — defaulting to 30 fps');
        return 30;
    }

    return new Promise((resolve) => {
        const mediaTimes = [];
        const safeResolve = (fps) => {
            videoEl.pause();
            videoEl.currentTime = 0;
            resolve(fps);
        };

        // Safety: if video can't play or stalls, fall back after 5 s
        const timeout = setTimeout(() => {
            console.warn('[VA] FPS detection timed out — defaulting to 30 fps');
            safeResolve(30);
        }, 5000);

        const onFrame = (_now, meta) => {
            mediaTimes.push(meta.mediaTime);

            if (mediaTimes.length < FRAMES_TO_MEASURE) {
                videoEl.requestVideoFrameCallback(onFrame);
            } else {
                clearTimeout(timeout);

                // Median inter-frame interval (robust vs. jitter)
                const intervals = [];
                for (let i = 1; i < mediaTimes.length; i++) {
                    const d = mediaTimes[i] - mediaTimes[i - 1];
                    if (d > 0) intervals.push(d);
                }
                if (intervals.length === 0) { safeResolve(30); return; }

                intervals.sort((a, b) => a - b);
                const median = intervals[Math.floor(intervals.length / 2)];
                const fps = Math.round(1 / median);
                const result = fps > 0 && fps <= 120 ? fps : 30;
                console.info(`[VA] ${result} fps detected (median interval ${(median * 1000).toFixed(1)} ms)`);
                safeResolve(result);
            }
        };

        videoEl.muted = true;
        videoEl.currentTime = 0;
        videoEl.requestVideoFrameCallback(onFrame);
        videoEl.play().catch(() => {
            clearTimeout(timeout);
            console.warn('[VA] play() failed during FPS detection — defaulting to 30 fps');
            resolve(30);
        });
    });
}

// ─── Icons ───────────────────────────────────────────────────────────────────

const VideoIcon = () => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="15" height="14" rx="2" />
        <path d="m17 9 5-3v12l-5-3" />
    </svg>
);

const PlayIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
);

const AlertIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const SeekIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);

// ─── Severity helper ─────────────────────────────────────────────────────────

function getSeverity(rawScore) {
    const pct = rawScore * 100;
    if (pct >= 85) return { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' };
    if (pct >= 65) return { label: 'High', color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)' };
    return { label: 'Moderate', color: '#eab308', bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.3)' };
}

// ─── Heatmap Zoom Modal ───────────────────────────────────────────────────────

function HeatmapModal({ defect, onClose, onSeek }) {
    if (!defect) return null;
    const sev = getSeverity(defect.raw_score);
    const pct = Math.round(defect.raw_score * 100);

    return (
        /* Backdrop */
        <div className="hm-backdrop" onClick={onClose}>
            {/* Panel — stop propagation so clicking inside doesn't close */}
            <div className="hm-panel" onClick={(e) => e.stopPropagation()}>

                {/* Close button */}
                <button className="hm-close" onClick={onClose} aria-label="Close">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                {/* Heatmap image */}
                <div className="hm-img-wrap">
                    <img src={defect.heatmap} alt="Grad-CAM heatmap" className="hm-img" />
                    {/* Gradient overlay at bottom */}
                    <div className="hm-img-gradient" />
                    {/* Heatmap badge */}
                    <div className="hm-img-badge">
                        <span>🔍 AI Attention Heatmap (Grad-CAM)</span>
                    </div>
                </div>

                {/* Details */}
                <div className="hm-details">

                    {/* Status row */}
                    <div className="hm-status-row">
                        <span className="hm-label">Result</span>
                        <span className="hm-badge" style={{ color: sev.color, borderColor: sev.border, background: sev.bg }}>
                            <span className="hm-badge-dot" style={{ background: sev.color }} />
                            CRACK DETECTED ⚠️
                        </span>
                    </div>

                    {/* Confidence bar */}
                    <div className="hm-conf-wrap">
                        <div className="hm-conf-header">
                            <span className="hm-conf-label">Confidence</span>
                            <span className="hm-conf-pct" style={{ color: sev.color }}>{pct}%</span>
                        </div>
                        <div className="hm-conf-track">
                            <div className="hm-conf-fill" style={{ width: `${pct}%`, background: sev.color }} />
                        </div>
                    </div>

                    {/* Meta rows */}
                    <div className="hm-meta">
                        <div className="hm-meta-row">
                            <span className="hm-meta-key">Timestamp</span>
                            <span className="hm-meta-val">⏱ {defect.timestampLabel}</span>
                        </div>
                        <div className="hm-meta-row">
                            <span className="hm-meta-key">Severity</span>
                            <span className="hm-meta-val" style={{ color: sev.color }}>{sev.label}</span>
                        </div>
                        <div className="hm-meta-row">
                            <span className="hm-meta-key">Raw Score</span>
                            <span className="hm-meta-val">{defect.raw_score.toFixed(4)}</span>
                        </div>
                        <div className="hm-meta-row">
                            <span className="hm-meta-key">Threshold</span>
                            <span className="hm-meta-val">0.5 (score &gt; 0.5 = crack)</span>
                        </div>
                    </div>

                    {/* Hint */}
                    <p className="hm-hint">Red/warm zones show where the AI focused to detect the crack.</p>

                    {/* Seek button */}
                    <button
                        className="hm-seek-btn"
                        onClick={() => { onSeek(defect.timestamp); onClose(); }}
                    >
                        <SeekIcon />
                        Jump to {defect.timestampLabel} in video
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Defect Card ─────────────────────────────────────────────────────────────

function DefectCard({ defect, index, onSeek, onZoom }) {
    const sev = getSeverity(defect.raw_score);
    const pct = Math.round(defect.raw_score * 100);

    return (
        <div
            className="defect-card"
            style={{ borderColor: sev.border, backgroundColor: sev.bg }}
            onClick={() => onSeek(defect.timestamp)}
            title={`Click to jump to ${defect.timestampLabel} in video`}
        >
            {/* Heatmap thumbnail — click opens zoom modal */}
            {defect.heatmap && (
                <div
                    className="defect-thumb-wrap"
                    onClick={(e) => { e.stopPropagation(); onZoom(defect); }}
                    title="Click to zoom heatmap"
                >
                    <img src={defect.heatmap} alt={`Heatmap at ${defect.timestampLabel}`} className="defect-thumb" />
                    <div className="defect-thumb-overlay">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
                        </svg>
                        <span>View heatmap</span>
                    </div>
                </div>
            )}

            {/* Info */}
            <div className="defect-info">
                <div className="defect-top-row">
                    <span className="defect-index">#{index + 1}</span>
                    <span className="defect-timestamp">⏱ {defect.timestampLabel}</span>
                    <span className="defect-severity-badge" style={{ color: sev.color, borderColor: sev.border }}>
                        <AlertIcon /> {sev.label}
                    </span>
                </div>

                {/* Confidence bar */}
                <div className="defect-conf-wrap">
                    <div className="defect-conf-label">
                        <span>AI Confidence</span>
                        <span style={{ color: sev.color }}>{pct}%</span>
                    </div>
                    <div className="defect-conf-track">
                        <div className="defect-conf-fill" style={{ width: `${pct}%`, background: sev.color }} />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main VideoAnalyzer ───────────────────────────────────────────────────────

export default function VideoAnalyzer() {
    // File / video state
    const [videoFile, setVideoFile] = useState(null);
    const [videoUrl, setVideoUrl] = useState(null);
    const [dragOver, setDragOver] = useState(false);

    // Analysis state
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [progress, setProgress] = useState({ processed: 0, total: 0 });
    const [incidentLog, setIncidentLog] = useState([]);
    const [analysisComplete, setAnalysisComplete] = useState(false);
    const [error, setError] = useState(null);
    const [detectedFps, setDetectedFps] = useState(null);
    const [zoomedDefect, setZoomedDefect] = useState(null); // defect shown in the heatmap modal

    // Refs
    const fileInputRef = useRef(null);
    const videoRef = useRef(null);          // the VISIBLE video player
    const hiddenVideoRef = useRef(null);    // used ONLY for frame extraction
    const canvasRef = useRef(null);         // hidden canvas for painting frames

    // ── File Handling ──────────────────────────────────────────────────────────

    const handleFile = useCallback((file) => {
        if (!file) return;
        const isVideo = file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.mov') || file.name.endsWith('.webm');
        if (!isVideo) {
            setError('Please upload a video file (.mp4, .mov, .webm)');
            return;
        }
        const url = URL.createObjectURL(file);
        setVideoFile(file);
        setVideoUrl(url);
        setIncidentLog([]);
        setAnalysisComplete(false);
        setError(null);
        setProgress({ processed: 0, total: 0 });
    }, []);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files[0]);
    };

    // ── Frame Extraction ───────────────────────────────────────────────────────

    /**
     * Scrubs through the hidden video at FPS-aware intervals,
     * paints each sampled frame onto the canvas, and returns
     * an array of { blob, timestamp } objects.
     *
     * @param {HTMLVideoElement} videoEl
     * @param {HTMLCanvasElement} canvasEl
     * @param {number} fps  - detected frame rate of the video
     */
    async function extractFrames(videoEl, canvasEl, fps) {
        const duration = videoEl.duration;
        if (!isFinite(duration) || duration <= 0) throw new Error('Unable to read video duration.');

        // Step interval: 1 sample every SAMPLE_EVERY source frames
        // Clamp so we always get at least 1 sample even on very short clips
        const rawInterval = SAMPLE_EVERY / fps;
        const frameInterval = Math.min(rawInterval, duration); // never longer than the video
        const frames = [];

        const ctx = canvasEl.getContext('2d');
        canvasEl.width = 224;
        canvasEl.height = 224;

        for (let t = 0; t < duration; t += frameInterval) {
            videoEl.currentTime = t;
            await waitForSeek(videoEl);

            ctx.drawImage(videoEl, 0, 0, 224, 224);

            const blob = await new Promise((resolve) =>
                canvasEl.toBlob(resolve, 'image/jpeg', 0.85)
            );

            frames.push({ blob, timestamp: parseFloat(t.toFixed(3)) });
        }

        // Use actual extracted count — Math.floor can give 0 for short videos
        return { frames, totalSamples: frames.length };
    }

    // ── API Caller ─────────────────────────────────────────────────────────────

    async function sendFrame({ blob, timestamp }) {
        const apiUrl = import.meta.env.VITE_API_URL;
        const formData = new FormData();
        formData.append('file', blob, `frame_${timestamp}.jpg`);

        try {
            const res = await axios.post(`${apiUrl}/predict`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const data = res.data;

            // Only crack results get added to the incident log
            if (data.result && data.result.includes('CRACK')) {
                return {
                    timestamp,
                    timestampLabel: formatTime(timestamp),
                    confidence: data.confidence,
                    raw_score: data.raw_score,
                    heatmap: data.heatmap,
                    label: data.result,
                };
            }
        } catch (err) {
            console.warn(`Frame at t=${timestamp}s failed:`, err.message);
        }
        return null;
    }

    // ── Main Analysis Orchestrator ─────────────────────────────────────────────

    const handleStartAnalysis = async () => {
        if (!videoFile || isAnalyzing) return;

        setIsAnalyzing(true);
        setIncidentLog([]);
        setAnalysisComplete(false);
        setError(null);
        setDetectedFps(null);

        try {
            const hiddenVideo = hiddenVideoRef.current;
            const canvas = canvasRef.current;

            // Load video into hidden element
            hiddenVideo.src = videoUrl;
            await new Promise((resolve, reject) => {
                hiddenVideo.onloadedmetadata = resolve;
                hiddenVideo.onerror = reject;
            });

            // Step 0: detect FPS
            const fps = await detectFPS(hiddenVideo);
            setDetectedFps(fps);
            console.info(`[VideoAnalyzer] Detected ${fps} fps — sampling 1 frame every ${SAMPLE_EVERY} frames (every ${(SAMPLE_EVERY / fps).toFixed(3)} s)`);

            // Step 1: Extract sampled frames
            const { frames, totalSamples } = await extractFrames(hiddenVideo, canvas, fps);
            setProgress({ processed: 0, total: totalSamples });

            // Step 2: Process in batches of 3
            const batches = chunk(frames, 3);
            let processed = 0;

            for (const batch of batches) {
                const results = await Promise.all(batch.map(sendFrame));

                const cracks = results.filter(Boolean);
                if (cracks.length > 0) {
                    setIncidentLog((prev) => [...prev, ...cracks]);
                }

                processed += batch.length;
                setProgress({ processed: Math.min(processed, totalSamples), total: totalSamples });
            }

            setAnalysisComplete(true);
        } catch (err) {
            console.error(err);
            setError(`Analysis failed: ${err.message}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // ── Interactive Seek ───────────────────────────────────────────────────────

    const seekTo = (timestamp) => {
        if (videoRef.current) {
            videoRef.current.currentTime = timestamp;
            videoRef.current.pause();
        }
    };

    // ── Progress % ────────────────────────────────────────────────────────────

    const progressPct = progress.total > 0 ? (progress.processed / progress.total) * 100 : 0;

    // ─── Render ──────────────────────────────────────────────────────────────

    // State: no file selected yet
    if (!videoFile) {
        return (
            <div className="va-upload-zone-wrap">
                <div
                    className={`va-upload-zone ${dragOver ? 'va-upload-zone--over' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*,.mp4,.mov,.webm"
                        onChange={(e) => handleFile(e.target.files[0])}
                        className="hidden"
                        id="videoFileInput"
                    />
                    <div className="va-upload-icon"><VideoIcon /></div>
                    <p className="va-upload-title">Drop drone footage here</p>
                    <p className="va-upload-hint">MP4, MOV or WEBM · Auto-analyzed frame by frame</p>
                    {error && <p className="va-upload-error">{error}</p>}
                </div>

                {/* Architecture callout */}
                <div className="va-arch-note">
                    <div className="va-arch-step"><span className="va-arch-icon">🎬</span><span>Frames extracted client-side</span></div>
                    <div className="va-arch-arrow">→</div>
                    <div className="va-arch-step"><span className="va-arch-icon">📡</span><span>Batched to AI backend</span></div>
                    <div className="va-arch-arrow">→</div>
                    <div className="va-arch-step"><span className="va-arch-icon">🔥</span><span>Live incident timeline</span></div>
                </div>
            </div>
        );
    }

    // State: file loaded — show dashboard
    return (
        <div className="va-dashboard">

            {/* Heatmap zoom modal */}
            <HeatmapModal
                defect={zoomedDefect}
                onClose={() => setZoomedDefect(null)}
                onSeek={seekTo}
            />

            {/* Hidden elements for frame extraction */}
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video ref={hiddenVideoRef} style={{ display: 'none' }} preload="auto" crossOrigin="anonymous" />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* ── Left Column: Video Player ── */}
            <div className="va-left">
                <div className="va-player-wrap">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        controls
                        className="va-video-player"
                    />
                </div>

                <div className="va-file-meta">
                    <span className="va-file-name">📁 {videoFile.name}</span>
                    <button
                        className="va-change-btn"
                        onClick={() => { setVideoFile(null); setVideoUrl(null); setIncidentLog([]); setAnalysisComplete(false); setProgress({ processed: 0, total: 0 }); }}
                    >
                        Change file
                    </button>
                </div>

                {/* Progress bar */}
                {(isAnalyzing || analysisComplete) && (
                    <div className="va-progress-wrap">
                        <div className="va-progress-header">
                            <span className="va-progress-label">
                                {analysisComplete ? '✅ Analysis Complete' : '⚙️ Analyzing drone footage…'}
                            </span>
                            <span className="va-progress-count">
                                {progress.processed} / {progress.total} samples
                            </span>
                        </div>
                        <div className="va-progress-track">
                            <div
                                className="va-progress-fill"
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                        {detectedFps && (
                            <div className="va-fps-badge">
                                <span>🎞 {detectedFps} fps detected</span>
                                <span className="va-fps-sep">·</span>
                                <span>1 sample / {SAMPLE_EVERY} frames ({(SAMPLE_EVERY / detectedFps * 1000).toFixed(0)} ms)</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Start button */}
                {!isAnalyzing && !analysisComplete && (
                    <button id="startAnalysisBtn" className="va-start-btn" onClick={handleStartAnalysis}>
                        <PlayIcon />
                        Start Analysis
                    </button>
                )}

                {/* Summary after completion */}
                {analysisComplete && (
                    <div className={`va-summary ${incidentLog.length > 0 ? 'va-summary--crack' : 'va-summary--safe'}`}>
                        {incidentLog.length > 0 ? (
                            <>
                                <AlertIcon />
                                <span><strong>{incidentLog.length} defect{incidentLog.length !== 1 ? 's' : ''}</strong> detected in {progress.total} samples</span>
                            </>
                        ) : (
                            <>
                                <CheckIcon />
                                <span><strong>No cracks detected</strong> across {progress.total} frames</span>
                            </>
                        )}
                    </div>
                )}

                {error && <div className="va-error">{error}</div>}

                {/* Download PDF report */}
                {analysisComplete && (
                    <button
                        id="downloadVideoReportBtn"
                        className="va-download-btn"
                        onClick={() => generateVideoReport(videoFile, incidentLog, progress, detectedFps)}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download PDF Report
                    </button>
                )}
            </div>

            {/* ── Right Column: Incident Timeline ── */}
            <div className="va-right">
                <div className="va-timeline-header">
                    <span className="va-timeline-title">Incident Log</span>
                    {incidentLog.length > 0 && (
                        <span className="va-timeline-count">{incidentLog.length} defect{incidentLog.length !== 1 ? 's' : ''}</span>
                    )}
                </div>

                {/* Live updating log */}
                <div className="va-incident-log">
                    {incidentLog.length === 0 ? (
                        <div className="va-log-empty">
                            {isAnalyzing ? (
                                <>
                                    <div className="va-log-scanning-dot" />
                                    <p>Scanning frames for structural defects…</p>
                                </>
                            ) : (
                                <p className="va-log-placeholder">
                                    {analysisComplete ? '✅ All clear — no defects found.' : 'Defects will appear here in real-time once analysis starts.'}
                                </p>
                            )}
                        </div>
                    ) : (
                        incidentLog.map((defect, i) => (
                            <DefectCard
                                key={`${defect.timestamp}-${i}`}
                                defect={defect}
                                index={i}
                                onSeek={seekTo}
                                onZoom={setZoomedDefect}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
