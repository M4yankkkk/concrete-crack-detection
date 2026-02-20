import { useState, useRef } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';

// ─── Icons (inline SVG, zero extra deps) ────────────────────────────────────

const UploadIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const ScanIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
    <line x1="7" y1="12" x2="17" y2="12" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

// ─── Spinner ─────────────────────────────────────────────────────────────────

const Spinner = () => (
  <svg
    className="animate-spin"
    width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

// ─── Confidence bar ──────────────────────────────────────────────────────────

function ConfidenceBar({ score, isCrack }) {
  const pct = Math.round(score * 100);
  return (
    <div>
      <div className="flex justify-between text-xs text-neutral-400 mb-1.5">
        <span>Confidence</span>
        <span className="font-medium text-white">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${isCrack ? 'bg-rose-500' : 'bg-emerald-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  };

  const handleFileChange = (e) => handleFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      const response = await axios.post(`${apiUrl}/predict`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(response.data);
    } catch (err) {
      console.error(err);
      setError('Could not reach the server. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!result) return;
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const crack = result.raw_score > 0.5;
    const conf = parseFloat(result.confidence);

    // ── Dark header band ─────────────────────────────────────────────────
    doc.setFillColor(15, 15, 15);
    doc.rect(0, 0, pageW, 42, 'F');

    // Left accent stripe (red if crack, green if safe)
    doc.setFillColor(crack ? 220 : 22, crack ? 38 : 163, crack ? 38 : 74);
    doc.rect(0, 0, 5, 42, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('Structural Health Inspection Report', 14, 18);

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(140, 140, 140);
    doc.text('AI-Powered Concrete Crack Detection  |  NITK Project', 14, 28);

    // Date right-aligned in header
    const dateStr = new Date().toLocaleString();
    doc.setFontSize(7.5);
    doc.setTextColor(110, 110, 110);
    doc.text(dateStr, pageW - 14, 36, { align: 'right' });

    // ── Status card ──────────────────────────────────────────────────────
    const cardY = 52;
    // Card background
    doc.setFillColor(crack ? 255 : 245, crack ? 248 : 255, crack ? 248 : 250);
    doc.setDrawColor(crack ? 220 : 22, crack ? 38 : 163, crack ? 38 : 74);
    doc.setLineWidth(0.6);
    doc.roundedRect(14, cardY, pageW - 28, 30, 3, 3, 'FD');

    // Bold verdict
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(crack ? 185 : 16, crack ? 20 : 120, crack ? 20 : 56);
    doc.text(crack ? '[!] CRACK DETECTED' : '[OK] STRUCTURE HEALTHY', 22, cardY + 13);

    // Description
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(crack ? 150 : 55, crack ? 55 : 120, crack ? 55 : 75);
    doc.text(
      crack
        ? 'Damage indicators found. Immediate structural inspection is recommended.'
        : 'No significant crack patterns detected. Surface appears structurally sound.',
      22, cardY + 22, { maxWidth: pageW - 44 }
    );

    // ── Metadata rows ────────────────────────────────────────────────────
    let rowY = cardY + 42;
    const rows = [
      ['File Name', result.filename],
      ['Diagnosis', result.result],
      ['Confidence', result.confidence],
      ['Raw Score', result.raw_score.toFixed(6)],
      ['Threshold', '0.5  (score > 0.5 = crack)'],
      ['Report Date', dateStr],
    ];
    rows.forEach(([label, value], i) => {
      const y = rowY + i * 12;
      doc.setFillColor(i % 2 === 0 ? 250 : 244, i % 2 === 0 ? 250 : 244, i % 2 === 0 ? 250 : 244);
      doc.rect(14, y, pageW - 28, 11, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);
      doc.text(label.toUpperCase(), 18, y + 7.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(25, 25, 25);
      doc.text(String(value), 72, y + 7.5, { maxWidth: pageW - 90 });
    });

    // ── Confidence bar ───────────────────────────────────────────────────
    const barY = rowY + rows.length * 12 + 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(70, 70, 70);
    doc.text('CONFIDENCE LEVEL', 14, barY);
    doc.setTextColor(crack ? 220 : 22, crack ? 38 : 163, crack ? 38 : 74);
    doc.text(`${conf.toFixed(1)}%`, pageW - 14, barY, { align: 'right' });

    // Track
    doc.setFillColor(225, 225, 225);
    doc.roundedRect(14, barY + 4, pageW - 28, 6, 2, 2, 'F');
    // Fill
    const fillW = ((pageW - 28) * conf) / 100;
    doc.setFillColor(crack ? 220 : 22, crack ? 38 : 163, crack ? 38 : 74);
    doc.roundedRect(14, barY + 4, fillW, 6, 2, 2, 'F');

    // ── Risk assessment ──────────────────────────────────────────────────
    const riskY = barY + 24;
    doc.setFillColor(252, 252, 252);
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.3);
    doc.roundedRect(14, riskY, pageW - 28, 32, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text('RISK ASSESSMENT', 20, riskY + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 50);
    doc.text(
      crack
        ? `Risk Level: HIGH  |  Score ${result.raw_score.toFixed(4)} exceeds threshold of 0.50
Recommended Action: Conduct a detailed structural survey and consult a licensed civil engineer immediately.`
        : `Risk Level: LOW  |  Score ${result.raw_score.toFixed(4)} is below threshold of 0.50
Recommended Action: Routine periodic monitoring. No immediate remediation required.`,
      20, riskY + 18, { maxWidth: pageW - 40 }
    );

    // ── Footer ───────────────────────────────────────────────────────────
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFillColor(245, 245, 245);
    doc.rect(0, pageH - 20, pageW, 20, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(0, pageH - 20, pageW, pageH - 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(
      'This report is auto-generated by an AI model for preliminary assessment only. Consult a licensed structural engineer for official inspection.',
      pageW / 2, pageH - 12, { align: 'center' }
    );
    doc.text('NITK Concrete Crack Detection System', pageW / 2, pageH - 6, { align: 'center' });

    doc.save('inspection_report.pdf');
  };

  const isCrack = result && result.raw_score > 0.5;
  // Parse the normalized confidence percentage string sent by backend (e.g. "73.21%")
  const confidenceValue = result ? parseFloat(result.confidence) / 100 : 0;

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-neutral-100 flex flex-col items-center justify-start px-4 pt-16 pb-16">

      {/* ── Header ── */}
      <header className="text-center mb-12">
        <div className="inline-flex items-center gap-2 text-xs font-medium tracking-widest text-neutral-500 uppercase mb-4">
          <span className="w-5 h-px bg-neutral-700 inline-block" />
          AI Inspection Tool
          <span className="w-5 h-px bg-neutral-700 inline-block" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Structural Health Monitor
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Upload a concrete surface image to detect cracks with AI
        </p>
      </header>

      {/* ── Card ── */}
      <div className="w-full max-w-sm space-y-4">

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            relative rounded-2xl border cursor-pointer overflow-hidden
            transition-all duration-200
            ${dragOver
              ? 'border-white/30 bg-white/5'
              : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-600 hover:bg-neutral-900'}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="fileInput"
          />

          {preview ? (
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-full object-cover max-h-64"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span className="absolute bottom-3 left-3 text-xs text-neutral-300 font-medium">
                {selectedFile?.name}
              </span>
              <span className="absolute bottom-3 right-3 text-xs text-neutral-400">
                Click to change
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-14 text-neutral-600 gap-3">
              <UploadIcon />
              <div className="text-center">
                <p className="text-sm text-neutral-400">Drop image here or click to browse</p>
                <p className="text-xs text-neutral-600 mt-1">JPG, PNG, WEBP</p>
              </div>
            </div>
          )}
        </div>

        {/* Analyze button */}
        <button
          id="analyzeBtn"
          onClick={handleAnalyze}
          disabled={!selectedFile || loading}
          className={`
            w-full flex items-center justify-center gap-2
            py-3 rounded-xl text-sm font-medium
            transition-all duration-200
            ${!selectedFile || loading
              ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
              : 'bg-white text-black hover:bg-neutral-100 active:scale-[0.98]'}
          `}
        >
          {loading ? (
            <>
              <Spinner />
              <span>Analyzing…</span>
            </>
          ) : (
            <>
              <ScanIcon />
              <span>Analyze Image</span>
            </>
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-rose-900/60 bg-rose-950/30 px-4 py-3 text-xs text-rose-400 text-center">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div
            className={`
              rounded-2xl border p-5 space-y-4
              transition-all duration-300
              ${isCrack
                ? 'border-rose-900/50 bg-rose-950/20'
                : 'border-emerald-900/50 bg-emerald-950/20'}
            `}
          >
            {/* Status badge */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500 uppercase tracking-wider font-medium">
                Result
              </span>
              <span
                className={`
                  inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full
                  ${isCrack
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'}
                `}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isCrack ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                {result.result}
              </span>
            </div>

            {/* Confidence bar */}
            <ConfidenceBar score={confidenceValue} isCrack={isCrack} />

            {/* Filename */}
            <p className="text-xs text-neutral-600 truncate">
              {result.filename}
            </p>
          </div>
        )}

        {/* Download report */}
        <button
          id="downloadReportBtn"
          onClick={downloadReport}
          disabled={!result}
          className={`
            w-full flex items-center justify-center gap-2
            py-2.5 rounded-xl text-xs font-medium border
            transition-all duration-200
            ${!result
              ? 'border-neutral-800 text-neutral-700 cursor-not-allowed'
              : 'border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-white active:scale-[0.98]'}
          `}
        >
          <DownloadIcon />
          Download PDF Report
        </button>
      </div>

      {/* ── Footer ── */}
      <footer className="mt-16 text-xs text-neutral-700 text-center">
        Built with TensorFlow & React · NITK Project
      </footer>
    </div>
  );
}