import { useState } from 'react'

type WarningType = 'Conduct Warning' | 'Conduct Stroke'
type Player = 'Player A1' | 'Player A2' | 'Player B1' | 'Player B2'

interface WarningRecord {
  player: Player
  type: WarningType
  timestamp: Date
}

const players: Array<Player> = [
  'Player A1',
  'Player A2',
  'Player B1',
  'Player B2',
]

export function ConductWarnings() {
  const [warnings, setWarnings] = useState<Array<WarningRecord>>([])
  const [selectedPlayer, setSelectedPlayer] = useState<Player>(players[0])
  const [selectedWarning, setSelectedWarning] =
    useState<WarningType>('Conduct Warning')

  const handleAddWarning = () => {
    const newWarning: WarningRecord = {
      player: selectedPlayer,
      type: selectedWarning,
      timestamp: new Date(),
    }
    setWarnings([...warnings, newWarning])
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">
        Conduct Warnings & Strokes
      </h2>
      <div className="p-4 bg-base-200 rounded-box">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Select Player</span>
            </label>
            <select
              className="select select-bordered"
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value as Player)}
            >
              {players.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Select Action</span>
            </label>
            <select
              className="select select-bordered"
              value={selectedWarning}
              onChange={(e) =>
                setSelectedWarning(e.target.value as WarningType)
              }
            >
              <option>Conduct Warning</option>
              <option>Conduct Stroke</option>
            </select>
          </div>
        </div>
        <button
          className="btn btn-primary w-full mb-4"
          onClick={handleAddWarning}
        >
          Record Action
        </button>

        {warnings.length > 0 && (
          <div>
            <div className="divider">History</div>
            <div className="overflow-x-auto">
              <table className="table table-zebra table-sm">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Action</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {warnings.map((w, i) => (
                    <tr key={i}>
                      <td>{w.player}</td>
                      <td>{w.type}</td>
                      <td>{w.timestamp.toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
