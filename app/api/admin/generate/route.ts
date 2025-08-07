import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import pool, { OPENROUTER_API_KEY } from '@/lib/db'

const P5JS_SCAFFOLDING_PROMPT = `
Do not add any comments or text.
Create animation that are not interactive.
Generate p5.js code for the following animation description. 
The code must start with:
function setup() {
  createCanvas(400, 400);
}

And include a draw() function. The code should be complete and runnable.
Make sure to use proper p5.js syntax and functions.

Animation description: `;

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    
    if (!user || !user.is_admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { modelId, promptId, generateForAllPrompts } = await request.json()
    
    if (!modelId) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      )
    }
    
    if (!generateForAllPrompts && !promptId) {
      return NextResponse.json(
        { error: 'Prompt ID is required when not generating for all prompts' },
        { status: 400 }
      )
    }
    
    const client = await pool.connect()
    try {
      // Get model and prompt details
      const modelResult = await client.query(
        'SELECT * FROM models WHERE id = $1 AND enabled = true',
        [modelId]
      )
      
      if (modelResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Model not found or disabled' },
          { status: 404 }
        )
      }
      
      const model = modelResult.rows[0]
      
      if (generateForAllPrompts) {
        // Get all prompts that don't have animations for this model
        const promptsToGenerate = await client.query(
          `SELECT p.id, p.text 
           FROM prompts p 
           WHERE NOT EXISTS (
             SELECT 1 FROM animations a 
             WHERE a.model_id = $1 AND a.prompt_id = p.id
           )`,
          [modelId]
        )
        
        if (promptsToGenerate.rows.length === 0) {
          return NextResponse.json({
            message: 'All prompts already have animations for this model',
            generatedCount: 0
          })
        }
        
                const results = []
        let successCount = 0
        let errorCount = 0
        
        // Process prompts in batches of 10 for concurrency
        const batchSize = 10
        const prompts = promptsToGenerate.rows
        
        for (let i = 0; i < prompts.length; i += batchSize) {
          const batch = prompts.slice(i, i + batchSize)
          
          // Process batch concurrently
          const batchPromises = batch.map(async (prompt) => {
            try {
              // Generate code using the LLM
              const generatedCode = await generateCodeWithLLM(model, prompt.text)
              
              // Insert new animation
              const animationResult = await client.query(
                'INSERT INTO animations (model_id, prompt_id, code) VALUES ($1, $2, $3) RETURNING id',
                [modelId, prompt.id, generatedCode]
              )
              
              console.log(`Created animation for model ${modelId} and prompt ${prompt.id}`)
              
              return {
                promptId: prompt.id,
                animationId: animationResult.rows[0].id,
                success: true
              }
            } catch (error) {
              console.error(`Error generating animation for prompt ${prompt.id}:`, error)
              return {
                promptId: prompt.id,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            }
          })
          
          // Wait for batch to complete
          const batchResults = await Promise.all(batchPromises)
          
          // Count successes and failures
          for (const result of batchResults) {
            results.push(result)
            if (result.success) {
              successCount++
            } else {
              errorCount++
            }
          }
        }
        
        return NextResponse.json({
          message: `Generated ${successCount} animations, ${errorCount} failed`,
          generatedCount: successCount,
          errorCount,
          results
        })
      } else {
        // Single prompt generation
        const promptResult = await client.query(
          'SELECT * FROM prompts WHERE id = $1',
          [promptId]
        )
        
        if (promptResult.rows.length === 0) {
          return NextResponse.json(
            { error: 'Prompt not found' },
            { status: 404 }
          )
        }
        
        const prompt = promptResult.rows[0]
        
        // Generate code using the LLM
        const generatedCode = await generateCodeWithLLM(model, prompt.text)
        
        // Check if animation already exists for this model_id and prompt_id combination
        const existingAnimation = await client.query(
          'SELECT id FROM animations WHERE model_id = $1 AND prompt_id = $2',
          [modelId, promptId]
        )

        let animationResult
        if (existingAnimation.rows.length > 0) {
          // Update existing animation
          animationResult = await client.query(
            'UPDATE animations SET code = $1, created_at = NOW() WHERE model_id = $2 AND prompt_id = $3 RETURNING id',
            [generatedCode, modelId, promptId]
          )
          console.log(`Updated existing animation for model ${modelId} and prompt ${promptId}`)
        } else {
          // Insert new animation
          animationResult = await client.query(
            'INSERT INTO animations (model_id, prompt_id, code) VALUES ($1, $2, $3) RETURNING id',
            [modelId, promptId, generatedCode]
          )
          console.log(`Created new animation for model ${modelId} and prompt ${promptId}`)
        }
        
        return NextResponse.json({
          code: generatedCode,
          animationId: animationResult.rows[0].id
        })
      }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error generating animation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generateCodeWithLLM(model: any, promptText: string): Promise<string> {
  const fullPrompt = P5JS_SCAFFOLDING_PROMPT + promptText
  
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured')
  }
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
      'X-Title': 'GGBench'
    }
    
    const requestBody: any = {
      model: model.api_endpoint || model.name,
      messages: [
        {
          role: 'user',
          content: fullPrompt
        }
      ],
      temperature: 1.0,
      max_tokens: null
    }
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Extract the generated code from the response
    let generatedCode = data.choices?.[0]?.message?.content || ''
    
    // Clean up the code - remove markdown formatting if present
    if (generatedCode.includes('```javascript')) {
      generatedCode = generatedCode.split('```javascript')[1]?.split('```')[0] || generatedCode
    } else if (generatedCode.includes('```js')) {
      generatedCode = generatedCode.split('```js')[1]?.split('```')[0] || generatedCode
    } else if (generatedCode.includes('```')) {
      generatedCode = generatedCode.split('```')[1] || generatedCode
    }
    
    // Ensure the code starts with the required setup function
    if (!generatedCode.includes('function setup()')) {
      generatedCode = `function setup() {
  createCanvas(400, 400);
}

${generatedCode}`
    }
    
    return generatedCode.trim()
  } catch (error) {
    console.error('Error calling LLM API:', error)
    // Return a fallback code if the API call fails
    return `function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(220);
  textAlign(CENTER, CENTER);
  textSize(16);
  fill(0);
  text("Animation generation failed", width/2, height/2);
}`
  }
} 
