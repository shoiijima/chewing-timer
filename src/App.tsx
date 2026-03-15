import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'

type Phase = 'idle' | 'lift' | 'chew'

const TICK_INTERVAL = 50 // ms for smooth animation
const STORAGE_KEY = 'chewing-timer-settings'
const STREAK_KEY = 'chewing-timer-streak'

function getInitialSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const { liftTime, chewTime } = JSON.parse(saved)
      return {
        liftTime: typeof liftTime === 'number' ? liftTime : 20,
        chewTime: typeof chewTime === 'number' ? chewTime : 30,
      }
    }
  } catch {
    // ignore
  }
  return { liftTime: 20, chewTime: 30 }
}

function getDateString(date: Date = new Date()) {
  return date.toISOString().split('T')[0]
}

function getStreakData() {
  try {
    const saved = localStorage.getItem(STREAK_KEY)
    if (saved) {
      const { lastDate, streak } = JSON.parse(saved)
      const today = getDateString()
      const yesterday = getDateString(new Date(Date.now() - 86400000))

      if (lastDate === today) {
        return { streak, isNewDay: false }
      } else if (lastDate === yesterday) {
        return { streak: streak + 1, isNewDay: true }
      }
    }
  } catch {
    // ignore
  }
  return { streak: 1, isNewDay: true }
}

function saveStreakData(streak: number) {
  localStorage.setItem(STREAK_KEY, JSON.stringify({
    lastDate: getDateString(),
    streak
  }))
}

function App() {
  const initialSettings = getInitialSettings()
  const initialStreak = getStreakData()
  const [liftTime, setLiftTime] = useState(initialSettings.liftTime)
  const [chewTime, setChewTime] = useState(initialSettings.chewTime)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentPhase, setCurrentPhase] = useState<Phase>('idle')
  const [timeLeft, setTimeLeft] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [streakCount] = useState(initialStreak.streak)
  const [showResult, setShowResult] = useState(false)
  const [finalElapsedTime, setFinalElapsedTime] = useState(0)
  const lastTickRef = useRef<number>(0)

  // 設定値をlocalStorageに保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ liftTime, chewTime }))
  }, [liftTime, chewTime])

  const totalTime = currentPhase === 'lift' ? liftTime : chewTime
  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0

  const startTimer = useCallback(() => {
    // 連続日数を更新して保存
    saveStreakData(streakCount)

    setIsRunning(true)
    setIsPaused(false)
    setCurrentPhase('lift')
    setTimeLeft(liftTime)
    setElapsedTime(0)
    setShowResult(false)
    lastTickRef.current = performance.now()
  }, [liftTime, streakCount])

  const stopTimer = useCallback(() => {
    setFinalElapsedTime(elapsedTime)
    setShowResult(true)
    setIsRunning(false)
    setIsPaused(false)
    setCurrentPhase('idle')
    setTimeLeft(0)
  }, [elapsedTime])

  const closeResult = useCallback(() => {
    setShowResult(false)
  }, [])

  const pauseTimer = useCallback(() => {
    setIsPaused(true)
  }, [])

  const resumeTimer = useCallback(() => {
    setIsPaused(false)
    lastTickRef.current = performance.now()
  }, [])

  const skipToNextPhase = useCallback(() => {
    if (currentPhase === 'lift') {
      setCurrentPhase('chew')
      setTimeLeft(chewTime)
    } else {
      setCurrentPhase('lift')
      setTimeLeft(liftTime)
    }
    lastTickRef.current = performance.now()
  }, [currentPhase, liftTime, chewTime])

  const adjustTime = useCallback((target: 'lift' | 'chew', delta: number) => {
    if (target === 'lift') {
      const newValue = Math.max(1, liftTime + delta)
      setLiftTime(newValue)
      if (currentPhase === 'lift') {
        setTimeLeft((prev) => Math.max(1, prev + delta))
      }
    } else {
      const newValue = Math.max(1, chewTime + delta)
      setChewTime(newValue)
      if (currentPhase === 'chew') {
        setTimeLeft((prev) => Math.max(1, prev + delta))
      }
    }
  }, [currentPhase, liftTime, chewTime])

  const togglePlayPause = () => {
    if (!isRunning) {
      startTimer()
    } else if (isPaused) {
      resumeTimer()
    } else {
      pauseTimer()
    }
  }

  useEffect(() => {
    if (!isRunning || isPaused) return

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
            return liftTime + newTime
          }
        }
        return newTime
      })
    }

    const interval = setInterval(tick, TICK_INTERVAL)
    return () => clearInterval(interval)
  }, [isRunning, isPaused, currentPhase, liftTime, chewTime])

  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatElapsedTimeJapanese = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    if (mins > 0) {
      return `${mins}分${secs}秒`
    }
    return `${secs}秒`
  }

  const circumference = 2 * Math.PI * 120
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const getPhaseLabel = () => {
    switch (currentPhase) {
      case 'lift':
        return '口に運ぶ'
      case 'chew':
        return (<>噛んで<br />ゆっくり飲み込む</>)
      default:
        return 'スタンバイ'
    }
  }

  const isFinishing = currentPhase === 'chew' && timeLeft <= 5 && timeLeft > 0

  return (
    <div className="app">
      <div className={`timer-container ${currentPhase}${isFinishing ? ' finishing' : ''}`}>
        {isRunning && (
          <div className="elapsed-row elapsed-row-top">
            <span className="elapsed-time">{formatElapsedTime(elapsedTime)}</span>
          </div>
        )}

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
            <div className="time-left">
              {isRunning ? (
                <>
                  <span className="time-prefix">残り</span>
                  <span className="time-value">{Math.ceil(timeLeft)}</span>
                  <span className="time-suffix">秒</span>
                </>
              ) : '—'}
            </div>
            {/* {isRunning && <span className="cycle-count">cycle {cycleCount}</span>} */}
            {isFinishing && <span className="finishing-message">もうすぐで食べ終わりです</span>}
          </div>
        </div>

        {/* Current Settings & Elapsed Time */}
        {isRunning && (
          <div className="status-bar">
            <div className={`setting-row ${currentPhase === 'lift' ? 'active' : ''}`}>
              <button className="adjust-btn" onClick={() => adjustTime('lift', -1)}>−</button>
              <span className="setting-label">運ぶ {liftTime}秒</span>
              <button className="adjust-btn" onClick={() => adjustTime('lift', 1)}>+</button>
            </div>
            <div className={`setting-row ${currentPhase === 'chew' ? 'active' : ''}`}>
              <button className="adjust-btn" onClick={() => adjustTime('chew', -1)}>−</button>
              <span className="setting-label">噛む {chewTime}秒</span>
              <button className="adjust-btn" onClick={() => adjustTime('chew', 1)}>+</button>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="controls">
          {!isRunning && (
            <>
              {streakCount >= 2 && (
                <div className="streak-message">
                  🔥 本日連続{streakCount}日目です！
                </div>
              )}
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
                  <label>噛んで飲み込む</label>
                  <div className="input-control">
                    <button onClick={() => setChewTime(Math.max(1, chewTime - 1))}>−</button>
                    <span className="input-value">{chewTime}s</span>
                    <button onClick={() => setChewTime(chewTime + 1)}>+</button>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="button-row">
            <button className="play-button" onClick={togglePlayPause}>
              {isRunning && !isPaused ? (
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

            {isPaused && (
              <button className="stop-button" onClick={stopTimer}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
              </button>
            )}
          </div>

          {isRunning && !isPaused && (
            <button className="skip-button" onClick={skipToNextPhase}>
              <span>{currentPhase === 'lift' ? '噛むへスキップ' : '口に運ぶへスキップ'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Result Modal */}
      {showResult && (
        <div className="result-overlay">
          <div className="result-modal">
            <div className="result-time">
              <span className="result-label">今回かかった時間</span>
              <span className="result-value">{formatElapsedTimeJapanese(finalElapsedTime)}</span>
            </div>
            {streakCount >= 2 && (
              <div className="result-streak">
                🔥 連続{streakCount}日目！
              </div>
            )}
            <button className="close-btn" onClick={closeResult}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
