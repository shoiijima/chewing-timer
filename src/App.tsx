import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'

type Phase = 'idle' | 'lift' | 'chew'

const TICK_INTERVAL = 50 // ms for smooth animation

function App() {
  const [liftTime, setLiftTime] = useState(5)
  const [chewTime, setChewTime] = useState(30)
  const [isRunning, setIsRunning] = useState(false)
  const [currentPhase, setCurrentPhase] = useState<Phase>('idle')
  const [timeLeft, setTimeLeft] = useState(0)
  const [cycleCount, setCycleCount] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const lastTickRef = useRef<number>(0)

  const totalTime = currentPhase === 'lift' ? liftTime : chewTime
  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0

  const startTimer = useCallback(() => {
    setIsRunning(true)
    setCurrentPhase('lift')
    setTimeLeft(liftTime)
    setCycleCount(1)
    setElapsedTime(0)
    lastTickRef.current = performance.now()
  }, [liftTime])

  const stopTimer = useCallback(() => {
    setIsRunning(false)
    setCurrentPhase('idle')
    setTimeLeft(0)
    setCycleCount(0)
  }, [])

  const toggleTimer = () => {
    if (isRunning) {
      stopTimer()
    } else {
      startTimer()
    }
  }

  useEffect(() => {
    if (!isRunning) return

    const tick = () => {
      const now = performance.now()
      const delta = (now - lastTickRef.current) / 1000
      lastTickRef.current = now

      setElapsedTime((prev) => prev + delta)
      setTimeLeft((prev) => {
        const newTime = prev - delta
        if (newTime <= 0) {
          // Phase transition
          if (currentPhase === 'lift') {
            setCurrentPhase('chew')
            return chewTime + newTime // carry over the negative for accuracy
          } else {
            setCurrentPhase('lift')
            setCycleCount((c) => c + 1)
            return liftTime + newTime
          }
        }
        return newTime
      })
    }

    const interval = setInterval(tick, TICK_INTERVAL)
    return () => clearInterval(interval)
  }, [isRunning, currentPhase, liftTime, chewTime])

  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const circumference = 2 * Math.PI * 120
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const getPhaseLabel = () => {
    switch (currentPhase) {
      case 'lift':
        return '口に運ぶ'
      case 'chew':
        return '咀嚼'
      default:
        return 'スタンバイ'
    }
  }

  return (
    <div className="app">
      <div className={`timer-container ${currentPhase}`}>
        {/* Circular Progress */}
        <div className="progress-ring-container">
          <svg className="progress-ring" viewBox="0 0 260 260">
            <circle
              className="progress-ring-bg"
              cx="130"
              cy="130"
              r="120"
            />
            <circle
              className="progress-ring-fill"
              cx="130"
              cy="130"
              r="120"
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: isRunning ? strokeDashoffset : circumference,
              }}
            />
          </svg>
          <div className="timer-display">
            <span className="phase-label">{getPhaseLabel()}</span>
            <span className="time-left">{isRunning ? Math.ceil(timeLeft) : '—'}</span>
            {isRunning && <span className="cycle-count">cycle {cycleCount}</span>}
          </div>
        </div>

        {/* Elapsed Time */}
        {isRunning && (
          <div className="elapsed-time">
            <span className="elapsed-label">経過時間</span>
            <span className="elapsed-value">{formatElapsedTime(elapsedTime)}</span>
          </div>
        )}

        {/* Controls */}
        <div className="controls">
          {!isRunning && (
            <div className="time-inputs">
              <div className="input-group">
                <label>口に運ぶ</label>
                <div className="input-control">
                  <button onClick={() => setLiftTime(Math.max(1, liftTime - 1))}>−</button>
                  <span className="input-value">{liftTime}s</span>
                  <button onClick={() => setLiftTime(liftTime + 1)}>+</button>
                </div>
              </div>
              <div className="input-group">
                <label>咀嚼</label>
                <div className="input-control">
                  <button onClick={() => setChewTime(Math.max(1, chewTime - 1))}>−</button>
                  <span className="input-value">{chewTime}s</span>
                  <button onClick={() => setChewTime(chewTime + 1)}>+</button>
                </div>
              </div>
            </div>
          )}

          <button className="play-button" onClick={toggleTimer}>
            {isRunning ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
