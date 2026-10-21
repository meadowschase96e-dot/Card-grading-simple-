import { createFileRoute } from "@tanstack/react-router";

const stack = [
  "TypeScript",
  "React",
  "Tailwind CSS",
  "Vite",
  "Android Studio",
  "Supabase",
  "Firebase",
  "Wasabi Hot Cloud Storage",
  "Cloudflare",
  "Google AI Studio",
  "Groq",
  "OpenRouter",
  "Mapbox GL JS",
  "Manus",
  "Replit",
  "GitHub Workflows",
];

const featuredApps = [
  {
    name: "Card Grade Vault",
    subtitle: "AI-powered card evaluation and valuation engine",
    bullets: [
      "Single & batch (9-card) scanning",
      "Automated condition grading",
      "Real-time market value graphs",
      "Downloadable certificates",
      "Secure vault filing",
    ],
  },
  {
    name: "Gold Recovery AI",
    subtitle: "Precious metal identification and scrap valuation coach",
    bullets: [
      "E-waste depopulation guidance",
      "Real-time spot pricing calculations",
      "Base-metal stripping coaching",
      "Refinery routing",
    ],
  },
  {
    name: "AI Trading Simulator",
    subtitle: "Interactive financial markets trading environment",
    bullets: [
      "Live ticker feeds",
      "Custom algorithmic trading bots",
      "Adjustable leverage controls",
      "Interactive dashboards",
    ],
  },
  {
    name: "Dragon Matrix Global Warning System",
    subtitle: "Interactive planetary grid node and geological anomaly monitor",
    bullets: [
      "Real-time seismic monitoring",
      "Mapbox GL JS visualization",
      "USGS GeoJSON feed integration",
      "Operational alerts",
    ],
  },
];

const monetization = [
  "Google AdMob & Google AdSense integration",
  "Interstitial, Rewarded Video, and Banner placements",
  "eBay Partner Network (EPN) deep-linking",
  "IONOS, SSL routing, and custom webspace infrastructure",
];

const highlights = [
  { value: "12+", label: "Product systems built" },
  { value: "AI", label: "Data + workflow design" },
  { value: "24/7", label: "Ops + platform thinking" },
];

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main className="portfolio-shell">
      <section className="hero-panel">
        <div className="hero-glow" aria-hidden="true" />

        <header className="topbar">
          <div className="brand-mark" aria-label="Don Nico brand mark">
            DN
          </div>
          <div className="brand-copy">
            <span className="brand-kicker">Don Nico</span>
            <span className="brand-tag">Building systems that perform</span>
          </div>
          <nav className="nav" aria-label="Main navigation">
            <a href="#stack">Stack</a>
            <a href="#featured">Featured apps</a>
            <a href="#monetization">Monetization</a>
          </nav>
        </header>

        <div className="hero-layout">
          <div className="hero-copy">
            <p className="eyebrow">Developer &amp; Tech Innovator</p>
            <h1>Building intelligent, high-performance digital products.</h1>
            <p className="lede">
              I design and ship product experiences with custom AI integrations, real-time data feeds,
              and optimized digital asset management across web and mobile platforms.
            </p>

            <div className="cta-row">
              <a className="primary-btn" href="#featured">
                View projects
              </a>
              <a className="secondary-btn" href="#stack">
                Explore stack
              </a>
            </div>

            <div className="mini-stats" aria-label="Key strengths">
              {highlights.map((item) => (
                <div key={item.label} className="stat-item">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-card" aria-label="Overview panel">
            <div className="card-topline">Product stack</div>
            <div className="code-window">
              <span className="dot red" />
              <span className="dot amber" />
              <span className="dot green" />
            </div>
            <div className="terminal-block">
              <p className="terminal-line">
                <span className="terminal-prompt">&gt;</span> product_strategy
              </p>
              <p className="terminal-line">
                <span className="terminal-prompt">&gt;</span> ai_integration
              </p>
              <p className="terminal-line">
                <span className="terminal-prompt">&gt;</span> market_launch
              </p>
            </div>
            <div className="feature-list">
              <span>Custom AI systems</span>
              <span>Real-time analytics</span>
              <span>Growth-ready product ops</span>
            </div>
          </div>
        </div>
      </section>

      <section id="stack" className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">Tech &amp; Stack Ecosystem</p>
          <h2>Full-stack systems for product, data, and scale.</h2>
        </div>

        <div className="chip-grid">
          {stack.map((item) => (
            <span key={item} className="chip">
              {item}
            </span>
          ))}
        </div>
      </section>

      <section id="featured" className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">Featured Applications &amp; Ecosystem</p>
          <h2>High-impact product experiences with clear business strategy.</h2>
        </div>

        <div className="card-grid">
          {featuredApps.map((app, index) => (
            <article key={app.name} className="project-card" style={{ animationDelay: `${index * 80}ms` }}>
              <div className="project-header">
                <span className="project-badge">{index + 1}</span>
                <span className="project-name">{app.name}</span>
              </div>
              <p className="project-subtitle">{app.subtitle}</p>
              <ul>
                {app.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section id="monetization" className="section-panel monetization-panel">
        <div className="section-heading narrow">
          <p className="eyebrow">Commercial &amp; Monetization Architecture</p>
          <h2>Built for conversion, acquisition, and product revenue.</h2>
        </div>

        <div className="monetization-layout">
          <div className="monetization-copy">
            <ul className="bullet-list">
              {monetization.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="monetization-card">
            <span className="mono-label">Revenue model</span>
            <strong>Ad networks + affiliate ecosystems</strong>
            <p>
              Strategic acquisition, productized installs, and conversion-rich experiences aligned with
              modern user behaviour and marketplace demand.
            </p>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <span>Powered by Don Nico</span>
      </footer>
    </main>
  );
}
