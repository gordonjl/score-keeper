import { useEffect, useState } from 'react'

const WARM_UP_TIME = 300 // 5 minutes in seconds
const BETWEEN_GAME_TIME = 120 // 2 minutes in seconds
const INJURY_TIME = 180 // 3 minutes in seconds

export function Timers() {
  const [timerType, setTimerType] = useState<
    'warm-up' | 'between-game' | 'injury' | null
  >(null)
  const [time, setTime] = useState(0)
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined = undefined

    if (isActive && time > 0) {
      interval = setInterval(() => {
        setTime((prevTime) => {
          if (prevTime <= 1) {
            setIsActive(false)
          }
          return prevTime - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, time])

  const startTimer = (type: 'warm-up' | 'between-game' | 'injury') => {
    setTimerType(type)
    if (type === 'warm-up') {
      setTime(WARM_UP_TIME)
    } else if (type === 'between-game') {
      setTime(BETWEEN_GAME_TIME)
    } else {
      setTime(INJURY_TIME)
    }
    setIsActive(true)
  }

  const pauseTimer = () => {
    setIsActive(false)
  }

  const resumeTimer = () => {
    setIsActive(true)
  }

  const resetTimer = () => {
    setIsActive(false)
    setTimerType(null)
    setTime(0)
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Timers</h2>
      <div className="p-4 bg-base-200 rounded-box">
        {timerType ? (
          <div>
            <div className="text-center">
              <div className="font-mono text-5xl flex justify-center">
                <span className="countdown">
                  <span
                    style={
                      {
                        '--value': Math.floor(time / 60),
                      } as React.CSSProperties
                    }
                  ></span>
                </span>
                :
                <span className="countdown">
                  <span
                    style={{ '--value': time % 60 } as React.CSSProperties}
                  ></span>
                </span>
              </div>
              <div className="text-sm text-base-content/60 capitalize mt-2">
                {timerType} Timer
              </div>
            </div>
            <div className="flex gap-2 justify-center mt-4">
              {isActive ? (
                <button className="btn btn-warning" onClick={pauseTimer}>
                  Pause
                </button>
              ) : (
                <button className="btn btn-success" onClick={resumeTimer}>
                  Resume
                </button>
              )}
              <button className="btn btn-error" onClick={resetTimer}>
                Reset
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              className="btn btn-primary"
              onClick={() => startTimer('warm-up')}
            >
              Start Warm-up
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => startTimer('between-game')}
            >
              Start Inter-Game
            </button>
            <button
              className="btn btn-accent col-span-1 sm:col-span-2"
              onClick={() => startTimer('injury')}
            >
              Start Injury Timeout
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
