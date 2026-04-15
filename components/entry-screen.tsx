'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Example = {
  id: string;
  category: string;
  title: string;
  description: string;
  question: string;
};

const howItWorks = [
  {
    number: '01',
    title: 'Enter your question',
    description: 'Start with one clear question, even if it is messy at first.',
  },
  {
    number: '02',
    title: 'Generate or compare prompts',
    description: 'See how different prompt structures change the result.',
  },
  {
    number: '03',
    title: 'Learn from the output difference',
    description: 'Keep the better version and reuse it next time.',
  },
];

const valueCards = [
  {
    title: 'Structured Thinking',
    description: 'Turn vague ideas into a simple prompt framework that is easier to reason about.',
  },
  {
    title: 'Instant Feedback',
    description: 'See the difference between a raw ask and a well-shaped prompt immediately.',
  },
  {
    title: 'Reusable Prompt System',
    description: 'Save the pattern, reuse it later, and build a stronger prompt habit over time.',
  },
];

const examples: Example[] = [
  {
    id: 'learning',
    category: 'Learning',
    title: 'Study smarter, not longer',
    description: 'A better prompt can turn a vague study goal into a focused learning plan.',
    question: 'How can I learn faster without burning out?',
  },
  {
    id: 'business',
    category: 'Business thinking',
    title: 'Make the decision clearer',
    description: 'Compare a shallow request with a structured business prompt.',
    question: 'Should I build this feature or simplify the workflow first?',
  },
  {
    id: 'self-growth',
    category: 'Self-growth',
    title: 'Stay consistent',
    description: 'Ask in a way that helps you act, not just reflect.',
    question: 'How do I stay consistent when motivation drops?',
  },
];

function truncate(text: string, maxLength = 78) {
  const cleaned = text.trim();
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength - 1).trimEnd()}…`;
}

function buildBattle(question: string) {
  const trimmed = question.trim() || examples[0].question;
  const short = truncate(trimmed, 84);

  return {
    promptA: `Answer the question directly: "${short}"`,
    promptB: `You are a prompt coach. Reframe "${short}" with context, constraints, and a better output format.`,
    outputA:
      'A direct answer is fast, but it often leaves the structure vague and the next step unclear.',
    outputB:
      'A structured prompt makes the model explain the goal, the trade-offs, and the action more clearly.',
  };
}

export function EntryScreen() {
  const [draftQuestion, setDraftQuestion] = useState(examples[0].question);
  const [activeQuestion, setActiveQuestion] = useState(examples[0].question);
  const [activeExampleId, setActiveExampleId] = useState<string>(examples[0].id);
  const arenaRef = useRef<HTMLElement | null>(null);

  const preview = useMemo(() => buildBattle(activeQuestion), [activeQuestion]);

  useEffect(() => {
    document.body.classList.add('battle-home-page');

    return () => {
      document.body.classList.remove('battle-home-page');
    };
  }, []);

  function commitQuestion(value: string) {
    const next = value.trim() || examples[0].question;
    setDraftQuestion(next);
    setActiveQuestion(next);
    setActiveExampleId('custom');
  }

  function selectExample(example: Example) {
    setDraftQuestion(example.question);
    setActiveQuestion(example.question);
    setActiveExampleId(example.id);
    arenaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <main className="battle-home">
      <section className="battle-home__hero" aria-labelledby="battle-home-title">
        <div className="battle-home__shell battle-home__shell--hero">
          <div className="battle-home__copy">
            <p className="battle-home__eyebrow">Richology / Battle</p>
            <h1 id="battle-home-title">Battle Your Prompt</h1>
            <p className="battle-home__subtitle">
              Train your AI thinking through prompt battles.
              Turn every question into a structured, high-quality input.
            </p>

            <div className="battle-home__actions">
              <a className="battle-home__button battle-home__button--primary" href="#battle-arena">
                Start a Battle
              </a>
              <a className="battle-home__button" href="#examples">
                View Examples
              </a>
            </div>

            <div className="battle-home__meta">
              <span>Structured Thinking × AI</span>
              <span>Clear prompts. Better outputs. Reusable patterns.</span>
            </div>
          </div>

          <div className="battle-home__visual" aria-hidden="true">
            <div className="battle-home__visual-glow" />
            <div className="battle-home__visual-card battle-home__visual-card--question">
              <span>Current Question</span>
              <strong>{truncate(activeQuestion, 96)}</strong>
            </div>
            <div className="battle-home__visual-grid">
              <article className="battle-home__visual-panel battle-home__visual-panel--a">
                <span>Prompt A</span>
                <p>{preview.promptA}</p>
              </article>
              <article className="battle-home__visual-panel battle-home__visual-panel--b">
                <span>Prompt B</span>
                <p>{preview.promptB}</p>
              </article>
            </div>
            <div className="battle-home__visual-footer">
              <div>
                <span>Output A</span>
                <p>Direct, readable, but less structured.</p>
              </div>
              <div>
                <span>Output B</span>
                <p>Shaped, clearer, and easier to act on.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="battle-home__section" id="how-it-works">
        <div className="battle-home__shell">
          <div className="battle-home__section-head">
            <p className="battle-home__section-kicker">How it works</p>
            <h2>Three steps to a better prompt.</h2>
          </div>

          <div className="battle-home__step-grid">
            {howItWorks.map((step) => (
              <article key={step.number} className="battle-home__card battle-home__step-card">
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="battle-home__section" id="value">
        <div className="battle-home__shell">
          <div className="battle-home__section-head">
            <p className="battle-home__section-kicker">Core value</p>
            <h2>Make the thinking process visible.</h2>
          </div>

          <div className="battle-home__value-grid">
            {valueCards.map((card) => (
              <article key={card.title} className="battle-home__card battle-home__value-card">
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="battle-home__section battle-home__section--arena" id="battle-arena" ref={arenaRef}>
        <div className="battle-home__shell">
          <div className="battle-home__section-head battle-home__section-head--wide">
            <div>
              <p className="battle-home__section-kicker">Battle arena</p>
              <h2>Your main workspace.</h2>
            </div>
            <p className="battle-home__section-note">
              Start with one question, generate or compare prompts, and inspect how the output changes.
            </p>
          </div>

          <div className="battle-home__arena">
            <form
              className="battle-home__composer battle-home__card"
              onSubmit={(event) => {
                event.preventDefault();
                commitQuestion(draftQuestion);
              }}
            >
              <label className="battle-home__field">
                <span>Your question</span>
                <textarea
                  value={draftQuestion}
                  onChange={(event) => setDraftQuestion(event.target.value)}
                  placeholder="Ask a question you want to think through..."
                  rows={8}
                />
              </label>

              <div className="battle-home__composer-footer">
                <button className="battle-home__button battle-home__button--primary" type="submit">
                  Generate Battle
                </button>
                <p>{draftQuestion.trim().length} characters</p>
              </div>
            </form>

            <div className="battle-home__results battle-home__card">
              <div className="battle-home__results-head">
                <p>Prompt A vs Prompt B</p>
                <h3>{truncate(activeQuestion, 72)}</h3>
              </div>

              <div className="battle-home__results-grid">
                <article className="battle-home__result-card battle-home__result-card--a">
                  <span>Prompt A</span>
                  <p>{preview.promptA}</p>
                </article>
                <article className="battle-home__result-card battle-home__result-card--b">
                  <span>Prompt B</span>
                  <p>{preview.promptB}</p>
                </article>
                <article className="battle-home__result-output">
                  <span>Output A</span>
                  <p>{preview.outputA}</p>
                </article>
                <article className="battle-home__result-output">
                  <span>Output B</span>
                  <p>{preview.outputB}</p>
                </article>
              </div>

              <div className="battle-home__result-footnote">
                Structured prompts reduce noise and make the next step easier to see.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="battle-home__section" id="examples">
        <div className="battle-home__shell">
          <div className="battle-home__section-head">
            <p className="battle-home__section-kicker">Examples</p>
            <h2>Click an example to auto-fill the battle arena.</h2>
          </div>

          <div className="battle-home__example-grid">
            {examples.map((example) => {
              const active = activeExampleId === example.id;

              return (
                <button
                  key={example.id}
                  type="button"
                  className={`battle-home__card battle-home__example-card ${active ? 'battle-home__example-card--active' : ''}`}
                  onClick={() => selectExample(example)}
                  aria-pressed={active}
                >
                  <span>{example.category}</span>
                  <h3>{example.title}</h3>
                  <p>{example.description}</p>
                  <strong>{truncate(example.question, 72)}</strong>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="battle-home__footer">
        <div className="battle-home__shell battle-home__footer-inner">
          <strong>Richology</strong>
          <span>Structured Thinking × AI</span>
        </div>
      </footer>
    </main>
  );
}
