type Props = {
  open: boolean
  onClose: () => void
}

export function RulesModal({ open, onClose }: Props) {
  return (
    <section
      className={`modal rules-modal detailed-rules-modal${open ? ' show' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rulesTitle"
      aria-hidden={!open}
    >
      <button className="close-modal" type="button" aria-label="Close How to Play" onClick={onClose}>
        ×
      </button>
      <div className="step-label">HOW TO PLAY</div>
      <h2 id="rulesTitle">ONE CARROT. TWO BOXES. ONE FINAL CHOICE.</h2>
      <p className="rules-intro">
        Carrot Midnight is a two-player game of reading your opponent. One carrot is sealed privately
        in one of two boxes via a Compact commitment. Player A may privately peek; Player B must
        choose without peeking. Selective disclosure opens the carrot at settle.
      </p>
      <div className="rules-callouts">
        <div>
          <b>2</b>
          <span>PLAYERS</span>
        </div>
        <div>
          <b>1</b>
          <span>SECRET CARROT</span>
        </div>
        <div>
          <b>60+</b>
          <span>MINUTES TO CHOOSE</span>
        </div>
        <div>
          <b>100%</b>
          <span>POT TO WINNER</span>
        </div>
      </div>
      <h3 className="rules-section-title">THE ROUND, STEP BY STEP</h3>
      <div className="rules-grid">
        <div className="rule">
          <b>01</b>
          <div>
            <strong>CREATE OR ACCEPT A GAME</strong>
            <p>Create an open game, accept one from the floor, or challenge a player directly.</p>
          </div>
        </div>
        <div className="rule">
          <b>02</b>
          <div>
            <strong>LOCK THE WAGERS</strong>
            <p>Both wagers lock when Player B accepts, starting a one-hour decision window.</p>
          </div>
        </div>
        <div className="rule">
          <b>03</b>
          <div>
            <strong>PRIVATE COMMITMENT</strong>
            <p>
              Compact seals one carrot in one of two boxes as private state with a public hash
              commitment.
            </p>
          </div>
        </div>
        <div className="rule">
          <b>04</b>
          <div>
            <strong>PLAYER A MAY PEEK</strong>
            <p>
              Player A may peek before or after acceptance. Peeking is optional and Player B never
              sees the result.
            </p>
          </div>
        </div>
        <div className="rule">
          <b>05</b>
          <div>
            <strong>BLUFF IN CHAT</strong>
            <p>Tell the truth or bluff in encrypted chat—your claim is part of the mind game.</p>
          </div>
        </div>
        <div className="rule">
          <b>06</b>
          <div>
            <strong>PLAYER B KEEPS OR SWAPS</strong>
            <p>
              Player B cannot peek and must choose Keep Mine or Swap Boxes before the deadline.
            </p>
          </div>
        </div>
        <div className="rule">
          <b>07</b>
          <div>
            <strong>REVEAL AND SETTLE</strong>
            <p>
              After Player B chooses, settle verifies the commitment and selectively discloses the
              carrot and winner.
            </p>
          </div>
        </div>
        <div className="rule">
          <b>08</b>
          <div>
            <strong>PLAYER B TIMEOUT</strong>
            <p>If Player B misses the decision deadline, Player A can claim the full pot.</p>
          </div>
        </div>
      </div>
      <div className="rules-tip">
        <b>BLUFFER&apos;S TIP</b>
        <p>
          Sometimes the strongest bluff sounds honest. Read the wording, reactions, and confidence
          of your opponent.
        </p>
      </div>
      <button className="primary full close-rules" type="button" onClick={onClose}>
        GOT IT — TAKE ME TO THE FLOOR
      </button>
    </section>
  )
}
