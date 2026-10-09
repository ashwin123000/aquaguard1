import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import pondHero from '../assets/fish-pond.jpg';

const capabilities = [
  {
    number: '01',
    title: 'Read the water',
    text: 'Bring dissolved oxygen, temperature and fish activity into one clear view of pond conditions.',
  },
  {
    number: '02',
    title: 'Understand the ration',
    text: 'See how biomass, species, growth stage and water conditions shape each feeding recommendation.',
  },
  {
    number: '03',
    title: 'Learn from every meal',
    text: 'Record what was fed and how fish responded, then carry that observation into the next plan.',
  },
];

export function HomePage() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const sectionId = location.hash.slice(1);
    requestAnimationFrame(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [location.pathname, location.hash]);

  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="home-hero-title">
        <img className="home-hero-image" src={pondHero} alt="A freshwater aquaculture pond prepared for fish farming" />
        <div className="home-hero-overlay" />
        <div className="home-hero-content">
          <span className="home-eyebrow"><span /> BETTER DECISIONS, POND BY POND</span>
          <h1 id="home-hero-title">A healthier pond<br />starts with <em>understanding.</em></h1>
          <p>
            AquaFeed AI brings water conditions, fish growth and feeding into one practical picture—so every decision starts with the pond in front of you.
          </p>
          <div className="home-hero-actions">
            <Link to="/ponds" className="home-cta-primary">Open farmer dashboard <span aria-hidden="true">↗</span></Link>
            <a className="home-cta-secondary" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a>
          </div>
          <span className="home-image-credit">
            Pond photograph by <a href="https://commons.wikimedia.org/wiki/File:Fish_pond_with_water.jpg" target="_blank" rel="noreferrer">Abike25 / Wikimedia Commons</a> · CC BY-SA 4.0
          </span>
        </div>
        <div className="home-hero-caption">
          <span>FIELD NOTES · POND MANAGEMENT</span>
          <span>Clear water. Clearer decisions.</span>
        </div>
      </section>

      <section className="home-intro" id="technology" aria-labelledby="technology-heading">
        <div className="home-section-kicker">POND INTELLIGENCE, IN BALANCE</div>
        <div className="home-intro-grid">
          <h2 id="technology-heading">Good feeding is more than a number.</h2>
          <div>
            <p className="home-intro-copy">
              Fish respond to their environment. AquaFeed AI helps farmers bring water readings, feeding plans, stock and observed fish response together before the next meal.
            </p>
            <p className="home-note">Designed to support farmer decisions—not replace experience or water testing.</p>
          </div>
        </div>
        <div className="home-capabilities">
          {capabilities.map(item => (
            <article className="home-capability" key={item.number}>
              <span className="home-capability-number">{item.number}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-how" id="how-it-works" aria-labelledby="how-heading">
        <div className="home-how-copy">
          <span className="home-section-kicker">A SIMPLE DAILY RHYTHM</span>
          <h2 id="how-heading">Observe. Decide. Learn.</h2>
          <p>Start with the water and the fish. Review a clear, biomass-based feeding recommendation, then record the meal and response. Your pond’s history stays connected to the next decision.</p>
          <Link to="/ponds" className="home-text-link">Explore your ponds <span aria-hidden="true">→</span></Link>
        </div>
        <div className="home-how-steps" aria-label="AquaFeed daily workflow">
          <div><span>01</span><div><strong>Check pond conditions</strong><small>Water readings · activity · freshness</small></div></div>
          <div><span>02</span><div><strong>Review the feeding plan</strong><small>Ration · schedule · recommendation</small></div></div>
          <div><span>03</span><div><strong>Record and improve</strong><small>Meal outcome · fish response · history</small></div></div>
        </div>
      </section>

      <section className="home-insights" id="insights" aria-labelledby="insights-heading">
        <div>
          <span className="home-section-kicker">BUILT AROUND YOUR FARM</span>
          <h2 id="insights-heading">Every pond has its own story.</h2>
          <p>Keep pond-specific telemetry and feeding plans close, while inventory, growth records and farm insights remain easy to reach.</p>
        </div>
        <Link to="/ponds" className="home-cta-primary">Choose a pond <span aria-hidden="true">↗</span></Link>
      </section>
      <footer className="home-footer">
        <span>AquaFeed AI</span>
        <span>Precision aquaculture intelligence · Demonstration data is simulated</span>
        <Link to="/ponds">Farmer dashboard →</Link>
      </footer>
    </div>
  );
}
