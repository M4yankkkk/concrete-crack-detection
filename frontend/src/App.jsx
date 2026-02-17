import { useState } from 'react';
import axios from 'axios';
import { jsPDF } from "jspdf";

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setResult(null); // Clear previous results
      setError(null);
    }
  };
  // Generate PDF Report
  const downloadReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Structural Health Inspection Report", 10, 20);

    doc.setFontSize(12);
    doc.text(`Filename: ${result.filename}`, 10, 40);
    doc.text(`Date: ${new Date().toLocaleString()}`, 10, 50);
    doc.text(`Status: ${result.result}`, 10, 60);
    doc.text(`Confidence Score: ${result.confidence}`, 10, 70);

    if (result.raw_score > 0.5) {
      doc.setTextColor(255, 0, 0);
      doc.text("ACTION REQUIRED: Structural Crack Detected", 10, 90);
    } else {
      doc.setTextColor(0, 128, 0);
      doc.text("Structure appears healthy.", 10, 90);
    }

    doc.save("inspection_report.pdf");
  };

  // Send to Backend
  const handleUpload = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      // Note: Ensure your backend is running on port 8000
      const apiUrl = import.meta.env.VITE_API_URL; // Load from .env
      const response = await axios.post(`${apiUrl}/predict`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(response.data);
    } catch (err) {
      console.error(err);
      setError("Failed to connect to the server. Is the Backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-10">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-slate-800">🏢 Structural Health Monitor</h1>
        <p className="text-slate-600 mt-2">AI-Powered Concrete Crack Detection System</p>
      </header>

      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">

        {/* Upload Area */}
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="fileInput"
          />
          <label htmlFor="fileInput" className="cursor-pointer flex flex-col items-center">
            {preview ? (
              <img src={preview} alt="Preview" className="max-h-64 rounded-md shadow-sm" />
            ) : (
              <div className="py-10">
                <p className="text-slate-500">Click to upload an image</p>
                <span className="text-xs text-slate-400">(JPG, PNG supported)</span>
              </div>
            )}
          </label>
        </div>

        {/* Analyze Button */}
        <button
          onClick={handleUpload}
          disabled={!selectedFile || loading}
          className={`w-full mt-6 py-3 rounded-lg font-semibold text-white transition-all
            ${!selectedFile || loading
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'}`}
        >
          {loading ? "Analyzing Structure..." : "Analyze Image"}
        </button>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className={`mt-6 p-4 rounded-lg border-l-4 ${result.raw_score > 0.5 ? "bg-red-50 border-red-500" : "bg-green-50 border-green-500"
            }`}>
            <h3 className="text-lg font-bold text-slate-800">Analysis Report</h3>

            <div className="mt-2 flex justify-between items-center">
              <span className="text-slate-600">Status:</span>
              <span className={`font-bold ${result.raw_score > 0.5 ? "text-red-600" : "text-green-600"
                }`}>
                {result.result}
              </span>
            </div>

            <div className="mt-1 flex justify-between items-center">
              <span className="text-slate-600">Confidence:</span>
              <span className="font-mono text-slate-800">{result.confidence}</span>
            </div>

            <div className="mt-3 text-xs text-slate-400 text-center">
              Filename: {result.filename}
            </div>
          </div>
        )}

        <button onClick={downloadReport} className="mt-4 w-full bg-slate-700 text-white py-2 rounded">
          Download PDF Report
        </button>
      </div>

      <footer className="mt-10 text-slate-400 text-sm">
        Built with TensorFlow & React • NITK Project
      </footer>
    </div>
  );
}

export default App;