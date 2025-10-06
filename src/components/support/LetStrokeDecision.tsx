import { useState } from 'react'

type Decision = 'NO_LET' | 'WARNING_OR_POINT' | 'LET' | 'POINT'
type State = 'START' | 'COULD_REACH' | 'DID_CLEAR' | 'WINNING_SHOT' | Decision

const decisionContent: Record<Decision, { title: string; text: string }> = {
  NO_LET: {
    title: 'No Let',
    text: 'If, in the opinion of the Referee, there has been NO interference then he should refuse the appeal. Where a player does not make an effort but is looking for the easy way out of a poor situation he should have his appeal turned down with a “No Let”.',
  },
  WARNING_OR_POINT: {
    title: 'Warning or Point to Obstructed Player',
    text: 'If the obstructing player was just standing on the shot, that is a case of avoidable obstruction. The decision is a “Warning” for a first instance, and a “Point” to the obstructed player for subsequent similar situations. If the obstructing player is actually moving into the striker’s swing, this is deliberate obstruction and a “Point” should be awarded.',
  },
  LET: {
    title: 'Let',
    text: 'If the obstructed player could only just have reached the ball and therefore could not hit a winning shot, then the Referee would allow a “Let”. Exception: If the opponent hits the ball back to themselves when there is no requirement to hit a winner, a “Point” is awarded to the obstructed player.',
  },
  POINT: {
    title: 'Point to Obstructed Player',
    text: 'If the obstructed player was prevented from playing a winning shot, they are awarded a “Point”. The Referee assesses if a winning shot could have been hit in that situation, not based on the player’s ability.',
  },
}

const questions: Record<
  Exclude<State, Decision | 'START'>,
  { question: string; help: string }
> = {
  COULD_REACH: {
    question:
      'Could the obstructed player have reached the ball, made a good return, and were they making every effort to do so?',
    help: 'The Referee must be satisfied that the player could have reached the ball, considering their direction, speed, and ability at that moment in the match. The player must make every effort to get to the ball.',
  },
  DID_CLEAR: {
    question: 'Did the obstructing player make every effort to move clear?',
    help: 'The Referee now asks “what was the obstructing player doing?” If they were just standing on the shot, it is avoidable obstruction. This includes giving a fair view and freedom of stroke.',
  },
  WINNING_SHOT: {
    question: 'Was the obstructed player in a position to hit a winner?',
    help: 'The Referee assesses if a winning shot could have been hit in that situation, not based on the player’s ability. This usually occurs in the front 1/3rd of the court.',
  },
}

export function LetStrokeDecision() {
  const [currentState, setCurrentState] = useState<State>('START')

  const handleDecision = (nextState: State) => {
    setCurrentState(nextState)
  }

  const renderCurrentState = () => {
    if (currentState === 'START') {
      return (
        <div>
          <h3 className="text-xl font-semibold mb-2">
            Let/Stroke Decision Tool
          </h3>
          <p className="mb-4 text-base-content/80">
            Follow the questions to reach the correct decision based on the
            official rules.
          </p>
          <div className="divider"></div>
          <p className="font-bold text-lg">Did interference occur?</p>
          <p className="text-sm text-base-content/60 mb-4">
            Normally it is obvious whether interference has occurred. In a
            doubtful case, proceed with YES.
          </p>
          <div className="flex gap-4">
            <button
              className="btn btn-success flex-1"
              onClick={() => handleDecision('COULD_REACH')}
            >
              Yes
            </button>
            <button
              className="btn btn-error flex-1"
              onClick={() => handleDecision('NO_LET')}
            >
              No
            </button>
          </div>
        </div>
      )
    }

    if (Object.keys(decisionContent).includes(currentState)) {
      const decision = decisionContent[currentState as Decision]
      return (
        <div>
          <h3 className="text-xl font-semibold mb-2">
            Decision: <span className="text-primary">{decision.title}</span>
          </h3>
          <p className="mb-4 text-base-content/80">{decision.text}</p>
          <button
            className="btn btn-primary w-full"
            onClick={() => setCurrentState('START')}
          >
            Start Over
          </button>
        </div>
      )
    }

    const questionData = questions[currentState as keyof typeof questions]

    return (
      <div>
        <h3 className="text-xl font-semibold mb-2">Let/Stroke Decision Tool</h3>
        <div className="divider"></div>
        <p className="font-bold text-lg">{questionData.question}</p>
        <p className="text-sm text-base-content/60 mb-4">{questionData.help}</p>
        <div className="flex gap-4">
          <button
            className="btn btn-success flex-1"
            onClick={() => handleDecision(getNextState(currentState, true))}
          >
            Yes
          </button>
          <button
            className="btn btn-error flex-1"
            onClick={() => handleDecision(getNextState(currentState, false))}
          >
            No
          </button>
        </div>
        <button
          className="btn btn-ghost btn-sm mt-4"
          onClick={() => setCurrentState('START')}
        >
          Start Over
        </button>
      </div>
    )
  }

  const getNextState = (state: State, answer: boolean): State => {
    switch (state) {
      case 'COULD_REACH':
        return answer ? 'DID_CLEAR' : 'NO_LET'
      case 'DID_CLEAR':
        return answer ? 'WINNING_SHOT' : 'WARNING_OR_POINT'
      case 'WINNING_SHOT':
        return answer ? 'POINT' : 'LET'
      default:
        return 'START'
    }
  }

  return (
    <div className="p-4 bg-base-200 rounded-box">{renderCurrentState()}</div>
  )
}
