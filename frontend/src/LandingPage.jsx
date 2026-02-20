import { useEffect, useRef, useState } from 'react';

/* ─── Tiny hook: fade-in on scroll ──────────────────────────────────────── */
function useFadeIn() {
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); obs.disconnect(); } },
            { threshold: 0.15 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    return ref;
}

/* ─── Animated counter ───────────────────────────────────────────────────── */
function Counter({ to, suffix = '', duration = 1800 }) {
    const [val, setVal] = useState(0);
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) return;
            obs.disconnect();
            let start = null;
            const step = (ts) => {
                if (!start) start = ts;
                const progress = Math.min((ts - start) / duration, 1);
                setVal(Math.floor(progress * to));
                if (progress < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        }, { threshold: 0.5 });
        obs.observe(el);
        return () => obs.disconnect();
    }, [to, duration]);
    return <span ref={ref}>{val}{suffix}</span>;
}

/* ─── Section wrapper with fade-in ─────────────────────────────────────── */
function Section({ children, className = '' }) {
    const ref = useFadeIn();
    return (
        <section ref={ref} className={`fade-section ${className}`}>
            {children}
        </section>
    );
}

/* ─── Feature card ──────────────────────────────────────────────────────── */
function FeatureCard({ icon, title, desc, delay = 0 }) {
    return (
        <div className="feature-card" style={{ animationDelay: `${delay}ms` }}>
            <div className="feature-icon">{icon}</div>
            <h3 className="feature-title">{title}</h3>
            <p className="feature-desc">{desc}</p>
        </div>
    );
}

/* ─── Tech badge ────────────────────────────────────────────────────────── */
function TechBadge({ label, color }) {
    return (
        <span className="tech-badge" style={{ '--badge-color': color }}>
            {label}
        </span>
    );
}

/* ─── Step card ─────────────────────────────────────────────────────────── */
function StepCard({ num, title, desc }) {
    return (
        <div className="step-card">
            <div className="step-num">{num}</div>
            <div>
                <div className="step-title">{title}</div>
                <div className="step-desc">{desc}</div>
            </div>
        </div>
    );
}

/* ─── Roadmap item ──────────────────────────────────────────────────────── */
function RoadmapItem({ icon, text }) {
    return (
        <div className="roadmap-item">
            <span className="roadmap-icon">{icon}</span>
            <span>{text}</span>
        </div>
    );
}

/* ─── Main Landing Page ─────────────────────────────────────────────────── */
export default function LandingPage({ onLaunch }) {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className="lp-root">
            {/* ── Navbar ── */}
            <nav className={`lp-nav ${scrolled ? 'lp-nav--scrolled' : ''}`}>
                <div className="lp-nav-inner">
                    <div className="lp-logo">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                        <span>CrackSense</span>
                    </div>
                    <div className="lp-nav-links">
                        <a href="#features">Features</a>
                        <a href="#tech">Tech Stack</a>
                        <a href="#how">How It Works</a>
                    </div>
                    <button className="lp-nav-cta" onClick={onLaunch}>Launch App</button>
                </div>
            </nav>

            {/* ── Hero ── */}
            <div className="lp-hero">
                {/* Animated grid background */}
                <div className="lp-grid-bg" aria-hidden="true" />
                {/* Glow orbs */}
                <div className="lp-orb lp-orb--1" aria-hidden="true" />
                <div className="lp-orb lp-orb--2" aria-hidden="true" />

                <div className="lp-hero-inner">
                    <div className="lp-hero-badge">
                        <span className="lp-badge-dot" />
                        AI · Deep Learning · Structural Safety
                    </div>
                    <h1 className="lp-hero-title">
                        Detect Concrete Cracks<br />
                        <span className="lp-hero-accent">with AI in Seconds</span>
                    </h1>
                    <p className="lp-hero-sub">
                        Automated structural health monitoring powered by MobileNetV2
                        transfer learning. 96.2% validation accuracy, real-time inference,
                        and instant PDF reports for civil engineers.
                    </p>
                    <div className="lp-hero-actions">
                        <button className="lp-btn-primary" onClick={onLaunch}>
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" />
                                <path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                                <line x1="7" y1="12" x2="17" y2="12" />
                            </svg>
                            Analyze an Image
                        </button>
                        <a className="lp-btn-ghost" href="#how">See How It Works</a>
                    </div>

                    {/* Floating accuracy badge */}
                    <div className="lp-hero-float">
                        <div className="lp-float-card">
                            <div className="lp-float-val">96.2%</div>
                            <div className="lp-float-label">Validation Accuracy</div>
                        </div>
                        <div className="lp-float-card">
                            <div className="lp-float-val">40K+</div>
                            <div className="lp-float-label">Training Images</div>
                        </div>
                        <div className="lp-float-card">
                            <div className="lp-float-val">&lt;1s</div>
                            <div className="lp-float-label">Inference Time</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Stats ── */}
            <Section className="lp-stats-section">
                <div className="lp-stats-grid">
                    {[
                        { label: 'Training Accuracy', val: 99, suffix: '%' },
                        { label: 'Validation Accuracy', val: 96, suffix: '%' },
                        { label: 'Training Images', val: 40000, suffix: '+' },
                        { label: 'False Negatives', val: 0, suffix: ' minimized' },
                    ].map((s) => (
                        <div key={s.label} className="lp-stat">
                            <div className="lp-stat-val">
                                <Counter to={s.val} suffix={s.suffix} />
                            </div>
                            <div className="lp-stat-label">{s.label}</div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* ── Features ── */}
            <Section id="features" className="lp-section">
                <div className="lp-section-label">What It Does</div>
                <h2 className="lp-section-title">Key Features</h2>
                <p className="lp-section-sub">Everything a civil engineer needs for rapid on-site structural assessment.</p>
                <div className="lp-features-grid">
                    <FeatureCard delay={0}
                        icon={
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                            </svg>
                        }
                        title="Real-Time Analysis"
                        desc="Upload any concrete surface image and get an instant Crack / Safe classification with live confidence score."
                    />
                    <FeatureCard delay={80}
                        icon={
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                            </svg>
                        }
                        title="Confidence Scoring"
                        desc="Each prediction comes with a normalized confidence percentage — know exactly how certain the model is."
                    />
                    <FeatureCard delay={160}
                        icon={
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
                            </svg>
                        }
                        title="PDF Reporting"
                        desc="Auto-generate a professional inspection report with status, confidence bar, risk level, and recommended actions."
                    />
                    <FeatureCard delay={240}
                        icon={
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                <line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                            </svg>
                        }
                        title="Full-Stack Web App"
                        desc="React (Vite) frontend with a FastAPI + Uvicorn backend. Drag-and-drop image upload with instant preview."
                    />
                    <FeatureCard delay={320}
                        icon={
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                <path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                            </svg>
                        }
                        title="Transfer Learning"
                        desc="Fine-tuned MobileNetV2 trained on 40,000+ labelled concrete images. Optimized for recall to minimize missed cracks."
                    />
                    <FeatureCard delay={400}
                        icon={
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
                            </svg>
                        }
                        title="GPU-Accelerated"
                        desc="Trained on an NVIDIA RTX 4060 Laptop GPU. Inference runs on CPU for lightweight deployment anywhere."
                    />
                </div>
            </Section>

            {/* ── Tech Stack ── */}
            <Section id="tech" className="lp-section lp-section--alt">
                <div className="lp-section-label">Under the Hood</div>
                <h2 className="lp-section-title">Tech Stack</h2>
                <p className="lp-section-sub">Modern, production-grade tools across the full pipeline.</p>
                <div className="lp-tech-grid">
                    {[
                        {
                            group: 'AI / ML', items: [
                                { label: 'TensorFlow 2.x', color: '#ff6f00' },
                                { label: 'Keras', color: '#d00000' },
                                { label: 'MobileNetV2', color: '#e65100' },
                                { label: 'NumPy', color: '#4dabf7' },
                                { label: 'PIL / Pillow', color: '#74c0fc' },
                            ]
                        },
                        {
                            group: 'Backend', items: [
                                { label: 'FastAPI', color: '#00b4a0' },
                                { label: 'Uvicorn', color: '#29b6f6' },
                                { label: 'Python 3.11', color: '#3776ab' },
                            ]
                        },
                        {
                            group: 'Frontend', items: [
                                { label: 'React 18', color: '#61dafb' },
                                { label: 'Vite', color: '#a78bfa' },
                                { label: 'Tailwind CSS', color: '#38bdf8' },
                                { label: 'Axios', color: '#5a67d8' },
                                { label: 'jsPDF', color: '#f59e0b' },
                            ]
                        },
                        {
                            group: 'Hardware', items: [
                                { label: 'NVIDIA RTX 4060', color: '#76b900' },
                                { label: 'CUDA 12', color: '#76b900' },
                            ]
                        },
                    ].map(({ group, items }) => (
                        <div key={group} className="lp-tech-group">
                            <div className="lp-tech-group-label">{group}</div>
                            <div className="lp-tech-badges">
                                {items.map((it) => (
                                    <TechBadge key={it.label} label={it.label} color={it.color} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* ── How It Works ── */}
            <Section id="how" className="lp-section">
                <div className="lp-section-label">The Process</div>
                <h2 className="lp-section-title">How It Works</h2>
                <p className="lp-section-sub">From raw image to actionable inspection report in four steps.</p>
                <div className="lp-steps">
                    <StepCard num="01" title="Upload Image" desc="Drag and drop or browse to select a concrete surface photo (JPG, PNG, WEBP)." />
                    <div className="lp-step-arrow" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                        </svg>
                    </div>
                    <StepCard num="02" title="Preprocess" desc="Image is resized to 224×224 and normalized with MobileNetV2 preprocessing (−1 to +1)." />
                    <div className="lp-step-arrow" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                        </svg>
                    </div>
                    <StepCard num="03" title="AI Inference" desc="The fine-tuned MobileNetV2 model classifies the image and returns a raw probability score." />
                    <div className="lp-step-arrow" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                        </svg>
                    </div>
                    <StepCard num="04" title="Report & Action" desc="Result, confidence score, and risk level are displayed instantly. Download a PDF inspection report." />
                </div>
            </Section>

            {/* ── Model Performance ── */}
            <Section className="lp-section lp-section--alt">
                <div className="lp-section-label">Benchmarks</div>
                <h2 className="lp-section-title">Model Performance</h2>
                <div className="lp-perf-bars">
                    {[
                        { label: 'Training Accuracy', value: 99 },
                        { label: 'Validation Accuracy', value: 96 },
                        { label: 'Recall (Safety-Optimized)', value: 97 },
                    ].map(({ label, value }) => (
                        <div key={label} className="lp-perf-row">
                            <div className="lp-perf-label">
                                <span>{label}</span>
                                <span className="lp-perf-pct">{value}%</span>
                            </div>
                            <div className="lp-perf-track">
                                <div className="lp-perf-fill" style={{ '--perf-w': `${value}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
                <p className="lp-perf-note">
                    Recall is optimized to minimize False Negatives — critical for structural safety applications where missing a crack is far costlier than a false alarm.
                </p>
            </Section>

            {/* ── Roadmap ── */}
            <Section className="lp-section">
                <div className="lp-section-label">What's Next</div>
                <h2 className="lp-section-title">Future Roadmap</h2>
                <div className="lp-roadmap-grid">
                    <RoadmapItem icon="🚁" text="Drone video feed integration for bridge and building inspection" />
                    <RoadmapItem icon="🔍" text="Crack severity classification — Hairline vs Deep cracks" />
                    <RoadmapItem icon="📟" text="Deployment on edge devices (Raspberry Pi / NVIDIA Jetson)" />
                    <RoadmapItem icon="☁️" text="Cloud-based inspection dashboard with team collaboration" />
                </div>
            </Section>

            {/* ── CTA ── */}
            <Section className="lp-cta-section">
                <div className="lp-cta-glow" aria-hidden="true" />
                <h2 className="lp-cta-title">Ready to inspect a structure?</h2>
                <p className="lp-cta-sub">Upload a concrete image and get an AI-powered diagnosis in under a second.</p>
                <button className="lp-btn-primary lp-btn-large" onClick={onLaunch}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" />
                        <path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                        <line x1="7" y1="12" x2="17" y2="12" />
                    </svg>
                    Open the Tool
                </button>
            </Section>

            {/* ── Footer ── */}
            <footer className="lp-footer">
                <div className="lp-footer-inner">
                    <div className="lp-logo" style={{ marginBottom: 0 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                        <span>CrackSense</span>
                    </div>
                    <p className="lp-footer-copy">Built with ❤️ by Mayank · NITK Project · TensorFlow + React</p>
                    <a
                        href="https://github.com/m4yankkkk/concrete-crack-detection"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="lp-footer-gh"
                    >
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
                        </svg>
                        GitHub
                    </a>
                </div>
            </footer>
        </div>
    );
}
