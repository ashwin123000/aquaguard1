import { ArrowRight, Play, Quote, Star } from 'lucide-react';

const avatars = [
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
];

const stats = [
  { value: '8k+', label: 'Members' },
  { value: '98%', label: 'Satisfaction' },
  { value: '24/7', label: 'Support' },
];

const wellnessTips = [
  'Meditation',
  'Stretching',
  'Breathing',
  'Balance',
  'Recovery',
];

export function App() {
  return (
    <div className="yoga-shell">
      <div className="yoga-page">
        <div className="organic-wave top-wave" />

        <header className="avatar-strip" aria-label="User photos">
          {avatars.map((src, index) => (
            <div key={src} className={`avatar-shell avatar-${index + 1}`}>
              <img src={src} alt="Happy member" />
            </div>
          ))}
        </header>

        <main className="content-stack">
          <section className="feedback-section">
            <div className="section-label">Read our users feedback</div>

            <div className="review-card">
              <div className="quote-icon">
                <Quote size={16} />
              </div>

              <div className="review-headline">
                <span className="rating-row" aria-label="5 out of 5 stars">
                  {[...Array(5)].map((_, index) => (
                    <Star key={index} size={12} fill="currentColor" strokeWidth={1.5} />
                  ))}
                </span>
                <p>
                  “The classes are beautifully paced and the instructors make every breath feel
                  intentional. I finally feel centered and strong.”
                </p>
              </div>

              <div className="review-profile">
                <img
                  src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=300&q=80"
                  alt="Reviewer portrait"
                />
                <div className="review-meta">
                  <strong>Sarah Brown</strong>
                  <span>Yoga student</span>
                </div>
              </div>

              <button className="round-button" aria-label="Next review">
                <ArrowRight size={18} />
              </button>
            </div>
          </section>

          <section className="customer-section">
            <div className="customer-topline">
              <h3>Satisfied Customers</h3>
            </div>

            <div className="customer-badges">
              {stats.map((stat) => (
                <div key={stat.label} className="stat-pill">
                  <span>{stat.value}</span>
                  <small>{stat.label}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="power-section">
            <div className="power-copy">
              <span className="eyebrow">The power of yoga</span>
              <h2>Take time to make your soul happy.</h2>
              <button className="primary-button">
                Join class
                <ArrowRight size={16} />
              </button>
            </div>

            <div className="power-visual">
              <div className="photo-card">
                <img
                  src="https://images.unsplash.com/photo-1544367567-0f2fcbec4b98?auto=format&fit=crop&w=900&q=80"
                  alt="Woman practicing yoga outdoors"
                />
              </div>
            </div>
          </section>

          <section className="ways-section">
            <div className="ways-header">
              <h3>5 ways to make your body strong</h3>
            </div>

            <div className="ways-grid">
              {wellnessTips.map((tip, index) => (
                <div key={tip} className="way-item">
                  <span className="way-number">0{index + 1}</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>

            <div className="video-banner">
              <div className="play-circle">
                <Play size={18} fill="currentColor" />
              </div>
              <div>
                <strong>Morning flow</strong>
                <small>15 minute sequence</small>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
