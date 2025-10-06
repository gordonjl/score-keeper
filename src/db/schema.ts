import Dexie from 'dexie'
import type {EntityTable} from 'dexie';
import type { Match, MatchEvent, MatchSnapshot } from './types'

export class SquashDatabase extends Dexie {
  matches!: EntityTable<Match, 'id'>
  events!: EntityTable<MatchEvent, 'id'>
  snapshots!: EntityTable<MatchSnapshot, 'id'>

  constructor() {
    super('SquashScoreKeeper')

    this.version(1).stores({
      matches: 'id, status, createdAt, updatedAt, *playerNames',
      events: 'id, [matchId+seq], matchId, ts, type',
      snapshots: 'id, matchId, seq, ts',
    })
  }
}

export const db = new SquashDatabase()
