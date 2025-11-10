import pool from './db'

const K_FACTOR = 32 // Standard K-factor for ELO calculations

export type Framework = 'threejs' | 'p5js' | 'svg'

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
    // Get the animations with their model ratings and framework
    const animationAResult = await client.query(`
      SELECT 
        a.id as animation_id,
        a.framework,
        m.id as model_id,
        m.name as model_name,
        m.elo_score_threejs,
        m.elo_score_p5js,
        m.elo_score_svg,
        m.wins_threejs,
        m.losses_threejs,
        m.ties_threejs,
        m.wins_p5js,
        m.losses_p5js,
        m.ties_p5js,
        m.wins_svg,
        m.losses_svg,
        m.ties_svg
      FROM animations a
      JOIN models m ON a.model_id = m.id
      WHERE a.id = $1
    `, [animationAId])
    
    const animationBResult = await client.query(`
      SELECT 
        a.id as animation_id,
        a.framework,
        m.id as model_id,
        m.name as model_name,
        m.elo_score_threejs,
        m.elo_score_p5js,
        m.elo_score_svg,
        m.wins_threejs,
        m.losses_threejs,
        m.ties_threejs,
        m.wins_p5js,
        m.losses_p5js,
        m.ties_p5js,
        m.wins_svg,
        m.losses_svg,
        m.ties_svg
      FROM animations a
      JOIN models m ON a.model_id = m.id
      WHERE a.id = $1
    `, [animationBId])
    
    if (animationAResult.rows.length === 0 || animationBResult.rows.length === 0) {
      throw new Error('Could not find both animations')
    }
    
    const modelA = animationAResult.rows[0]
    const modelB = animationBResult.rows[0]
    
    // Ensure both animations have the same framework
    if (modelA.framework !== modelB.framework) {
      throw new Error(`Frameworks do not match: ${modelA.framework} vs ${modelB.framework}`)
    }
    
    const framework = modelA.framework as Framework
    
    // Get framework-specific ELO scores
    const eloColumnA = `elo_score_${framework}` as 'elo_score_threejs' | 'elo_score_p5js' | 'elo_score_svg'
    const eloColumnB = `elo_score_${framework}` as 'elo_score_threejs' | 'elo_score_p5js' | 'elo_score_svg'
    const winsColumnA = `wins_${framework}` as 'wins_threejs' | 'wins_p5js' | 'wins_svg'
    const lossesColumnA = `losses_${framework}` as 'losses_threejs' | 'losses_p5js' | 'losses_svg'
    const tiesColumnA = `ties_${framework}` as 'ties_threejs' | 'ties_p5js' | 'ties_svg'
    const winsColumnB = `wins_${framework}` as 'wins_threejs' | 'wins_p5js' | 'wins_svg'
    const lossesColumnB = `losses_${framework}` as 'losses_threejs' | 'losses_p5js' | 'losses_svg'
    const tiesColumnB = `ties_${framework}` as 'ties_threejs' | 'ties_p5js' | 'ties_svg'
    
    const ratingA = modelA[eloColumnA]
    const ratingB = modelB[eloColumnB]
    
    console.log(`ELO Update [${framework}]: Animation A (${animationAId}) -> Model ${modelA.model_name} (${ratingA})`)
    console.log(`ELO Update [${framework}]: Animation B (${animationBId}) -> Model ${modelB.model_name} (${ratingB})`)
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
    const eloResult = calculateElo(ratingA, ratingB, scoreA)
    
    console.log(`ELO Calculation [${framework}]: ${ratingA} vs ${ratingB}, scoreA: ${scoreA}`)
    console.log(`New ratings: ${modelA.model_name}: ${ratingA} -> ${eloResult.newRatingA}`)
    console.log(`New ratings: ${modelB.model_name}: ${ratingB} -> ${eloResult.newRatingB}`)
    
    // Update model A with framework-specific stats
    const newWinsA = modelA[winsColumnA] + (winner === 'A' ? 1 : 0)
    const newLossesA = modelA[lossesColumnA] + (winner === 'B' ? 1 : 0)
    const newTiesA = modelA[tiesColumnA] + (winner === 'TIE' ? 1 : 0)
    
    await client.query(`
      UPDATE models 
      SET ${eloColumnA} = $1, ${winsColumnA} = $2, ${lossesColumnA} = $3, ${tiesColumnA} = $4
      WHERE id = $5
    `, [eloResult.newRatingA, newWinsA, newLossesA, newTiesA, modelA.model_id])
    
    // Update model B with framework-specific stats
    const newWinsB = modelB[winsColumnB] + (winner === 'B' ? 1 : 0)
    const newLossesB = modelB[lossesColumnB] + (winner === 'A' ? 1 : 0)
    const newTiesB = modelB[tiesColumnB] + (winner === 'TIE' ? 1 : 0)
    
    await client.query(`
      UPDATE models 
      SET ${eloColumnB} = $1, ${winsColumnB} = $2, ${lossesColumnB} = $3, ${tiesColumnB} = $4
      WHERE id = $5
    `, [eloResult.newRatingB, newWinsB, newLossesB, newTiesB, modelB.model_id])
    
    console.log(`Updated ${modelA.model_name} [${framework}]: ELO ${eloResult.newRatingA}, W:${newWinsA} L:${newLossesA} T:${newTiesA}`)
    console.log(`Updated ${modelB.model_name} [${framework}]: ELO ${eloResult.newRatingB}, W:${newWinsB} L:${newLossesB} T:${newTiesB}`)
    
    return {
      framework,
      modelA: {
        id: modelA.model_id,
        oldRating: ratingA,
        newRating: eloResult.newRatingA,
        wins: newWinsA,
        losses: newLossesA,
        ties: newTiesA
      },
      modelB: {
        id: modelB.model_id,
        oldRating: ratingB,
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