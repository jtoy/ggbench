import pool from './db'

const K_FACTOR = 32 // Standard K-factor for ELO calculations

export interface EloResult {
  newRatingA: number
  newRatingB: number
  expectedScoreA: number
  expectedScoreB: number
}

export function calculateElo(ratingA: number, ratingB: number, scoreA: number): EloResult {
  // scoreA should be 1 for A wins, 0 for B wins, 0.5 for tie
  const scoreB = 1 - scoreA
  
  // Calculate expected scores
  const expectedScoreA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
  const expectedScoreB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400))
  
  // Calculate new ratings
  const newRatingA = ratingA + K_FACTOR * (scoreA - expectedScoreA)
  const newRatingB = ratingB + K_FACTOR * (scoreB - expectedScoreB)
  
  return {
    newRatingA: Math.round(newRatingA),
    newRatingB: Math.round(newRatingB),
    expectedScoreA,
    expectedScoreB
  }
}

export async function updateModelRatings(animationAId: number, animationBId: number, winner: 'A' | 'B' | 'TIE') {
  const client = await pool.connect()
  try {
    // Get the animations with their model ratings - fetch them separately to ensure correct mapping
    const animationAResult = await client.query(`
      SELECT 
        a.id as animation_id,
        m.id as model_id,
        m.name as model_name,
        m.elo_score,
        m.wins,
        m.losses,
        m.ties
      FROM animations a
      JOIN models m ON a.model_id = m.id
      WHERE a.id = $1
    `, [animationAId])
    
    const animationBResult = await client.query(`
      SELECT 
        a.id as animation_id,
        m.id as model_id,
        m.name as model_name,
        m.elo_score,
        m.wins,
        m.losses,
        m.ties
      FROM animations a
      JOIN models m ON a.model_id = m.id
      WHERE a.id = $2
    `, [animationBId])
    
    if (animationAResult.rows.length === 0 || animationBResult.rows.length === 0) {
      throw new Error('Could not find both animations')
    }
    
    const modelA = animationAResult.rows[0]
    const modelB = animationBResult.rows[0]
    
    console.log(`ELO Update: Animation A (${animationAId}) -> Model ${modelA.model_name} (${modelA.elo_score})`)
    console.log(`ELO Update: Animation B (${animationBId}) -> Model ${modelB.model_name} (${modelB.elo_score})`)
    console.log(`Winner: ${winner}`)
    
    // Determine the score based on winner
    let scoreA: number
    if (winner === 'A') {
      scoreA = 1
    } else if (winner === 'B') {
      scoreA = 0
    } else {
      scoreA = 0.5 // Tie
    }
    
    // Calculate new ELO ratings
    const eloResult = calculateElo(modelA.elo_score, modelB.elo_score, scoreA)
    
    console.log(`ELO Calculation: ${modelA.elo_score} vs ${modelB.elo_score}, scoreA: ${scoreA}`)
    console.log(`New ratings: ${modelA.model_name}: ${modelA.elo_score} -> ${eloResult.newRatingA}`)
    console.log(`New ratings: ${modelB.model_name}: ${modelB.elo_score} -> ${eloResult.newRatingB}`)
    
    // Update model A
    const newWinsA = modelA.wins + (winner === 'A' ? 1 : 0)
    const newLossesA = modelA.losses + (winner === 'B' ? 1 : 0)
    const newTiesA = modelA.ties + (winner === 'TIE' ? 1 : 0)
    
    await client.query(`
      UPDATE models 
      SET elo_score = $1, wins = $2, losses = $3, ties = $4
      WHERE id = $5
    `, [eloResult.newRatingA, newWinsA, newLossesA, newTiesA, modelA.model_id])
    
    // Update model B
    const newWinsB = modelB.wins + (winner === 'B' ? 1 : 0)
    const newLossesB = modelB.losses + (winner === 'A' ? 1 : 0)
    const newTiesB = modelB.ties + (winner === 'TIE' ? 1 : 0)
    
    await client.query(`
      UPDATE models 
      SET elo_score = $1, wins = $2, losses = $3, ties = $4
      WHERE id = $5
    `, [eloResult.newRatingB, newWinsB, newLossesB, newTiesB, modelB.model_id])
    
    console.log(`Updated ${modelA.model_name}: ELO ${eloResult.newRatingA}, W:${newWinsA} L:${newLossesA} T:${newTiesA}`)
    console.log(`Updated ${modelB.model_name}: ELO ${eloResult.newRatingB}, W:${newWinsB} L:${newLossesB} T:${newTiesB}`)
    
    return {
      modelA: {
        id: modelA.model_id,
        oldRating: modelA.elo_score,
        newRating: eloResult.newRatingA,
        wins: newWinsA,
        losses: newLossesA,
        ties: newTiesA
      },
      modelB: {
        id: modelB.model_id,
        oldRating: modelB.elo_score,
        newRating: eloResult.newRatingB,
        wins: newWinsB,
        losses: newLossesB,
        ties: newTiesB
      }
    }
  } finally {
    client.release()
  }
} 