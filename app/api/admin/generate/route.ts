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
    
    const { modelId, promptId, generateForAllPrompts, overwriteAllPrompts } = await request.json()
    
    if (!modelId) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      )
    }
    
    if (!generateForAllPrompts && !overwriteAllPrompts && !promptId) {
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
      
      if (overwriteAllPrompts) {
        // Generate for all prompts for this model and overwrite or insert animations
        const allPrompts = await client.query(
          `SELECT p.id, p.text FROM prompts p ORDER BY p.id`
        )

        if (allPrompts.rows.length === 0) {
          return NextResponse.json({
            message: 'No prompts found',
            generatedCount: 0
          })
        }

        const results: any[] = []
        let successCount = 0
        let errorCount = 0

        const batchSize = 5
        const prompts = allPrompts.rows

        for (let i = 0; i < prompts.length; i += batchSize) {
          const batch = prompts.slice(i, i + batchSize)
          const batchPromises = batch.map(async (prompt) => {
            try {
              const generatedCode = await generateCodeWithLLM(model, prompt.text)
              // Upsert: update if exists else insert
              const existing = await client.query(
                'SELECT id FROM animations WHERE model_id = $1 AND prompt_id = $2',
                [modelId, prompt.id]
              )
              let animationId
              if (existing.rows.length > 0) {
                const update = await client.query(
                  'UPDATE animations SET code = $1, created_at = NOW() WHERE id = $2 RETURNING id',
                  [generatedCode, existing.rows[0].id]
                )
                animationId = update.rows[0].id
                console.log(`Overwrote animation ${animationId} for model ${modelId} prompt ${prompt.id}`)
              } else {
                const insert = await client.query(
                  'INSERT INTO animations (model_id, prompt_id, code) VALUES ($1, $2, $3) RETURNING id',
                  [modelId, prompt.id, generatedCode]
                )
                animationId = insert.rows[0].id
                console.log(`Created animation ${animationId} for model ${modelId} prompt ${prompt.id}`)
              }
              return { promptId: prompt.id, animationId, success: true }
            } catch (error) {
              console.error(`Error generating animation for prompt ${prompt.id}:`, error)
              return { promptId: prompt.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' }
            }
          })
          const batchResults = await Promise.all(batchPromises)
          for (const result of batchResults) {
            results.push(result)
            if (result.success) successCount++
            else errorCount++
          }
        }

        return NextResponse.json({
          message: `Generated ${successCount} animations (overwrite mode), ${errorCount} failed`,
          generatedCount: successCount,
          errorCount,
          results
        })
      } else if (generateForAllPrompts) {
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
        
        // Process prompts in small batches to avoid rate limits
        const batchSize = 5
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
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured')
  }

  // Attempt up to 2 times: initial + 1 retry if syntax invalid
  for (let attempt = 0; attempt < 2; attempt++) {
    const retrySuffix = attempt === 0 ? '' : `\n\nRegenerate. Previous output had a JavaScript syntax error when parsed.\nStrictly output ONLY plain p5.js code with no markdown fences, no imports/exports, and no comments.`
    const fullPrompt = P5JS_SCAFFOLDING_PROMPT + promptText + retrySuffix

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
        'X-Title': 'GGBench'
      }

      // Resolve model id; expect OpenRouter slug like "openai/gpt-4o-mini"
      const modelId: string = String(model.api_endpoint || '').trim()
      if (!modelId) {
        throw new Error('Model api_endpoint is empty. Set it to an OpenRouter model id like "openai/gpt-4o-mini"')
      }
      if (modelId.startsWith('http')) {
        throw new Error('Model api_endpoint should be an OpenRouter model id (e.g., "openai/gpt-4o-mini"), not a URL')
      }

      // Build request body per OpenRouter docs
      const requestBody: any = {
        model: modelId,
        messages: [
          {
            role: 'user',
            content: fullPrompt
          }
        ]
      }
      if (model.temperature !== null && model.temperature !== undefined) {
        const t = typeof model.temperature === 'string' ? parseFloat(model.temperature) : model.temperature
        if (!Number.isNaN(t)) requestBody.temperature = t
      }
      if (model.max_tokens !== null && model.max_tokens !== undefined) {
        const mt = typeof model.max_tokens === 'string' ? parseInt(model.max_tokens, 10) : model.max_tokens
        if (!Number.isNaN(mt)) requestBody.max_tokens = mt
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        let details = ''
        try {
          const errJson = await response.json()
          details = errJson?.error?.message || errJson?.error || JSON.stringify(errJson)
        } catch {
          try { details = await response.text() } catch { /* ignore */ }
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}${details ? ` - ${details}` : ''}`)
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

      generatedCode = ensureSetupAndDraw(generatedCode)

      if (isValidJavaScript(generatedCode)) {
        return generatedCode.trim()
      }
      // Otherwise loop and try once more
    } catch (error) {
      console.error('Error calling LLM API:', error)
      // Only break out to fallback if this was an API failure on both attempts
      if (attempt === 1) {
        return FALLBACK_P5_CODE
      }
    }
  }

  // If both attempts resulted in invalid JS, return a simple valid sketch
  return FALLBACK_P5_CODE
} 

function ensureSetupAndDraw(code: string): string {
  let result = code || ''
  // Ensure setup() exists and begins the file, as required by the app
  if (!result.includes('function setup()')) {
    result = `function setup() {\n  createCanvas(400, 400);\n}\n\n${result}`
  }
  // Ensure draw() exists
  if (!/function\s+draw\s*\(/.test(result)) {
    result += `\n\nfunction draw() {\n  background(220);\n}`
  }
  return result
}

function isValidJavaScript(code: string): boolean {
  try {
    // Parse-only validation (no execution)
    // Wrapping in Function parses the code as a function body which accepts function declarations
    // typical to p5.js sketches (setup/draw)
    // eslint-disable-next-line no-new, @typescript-eslint/no-implied-eval
    new Function(code)
    return true
  } catch (error) {
    console.warn('Generated code failed JS syntax validation:', error)
    return false
  }
}

const FALLBACK_P5_CODE = `function setup() {\n  createCanvas(400, 400);\n}\n\nfunction draw() {\n  background(220);\n  textAlign(CENTER, CENTER);\n  textSize(16);\n  fill(0);\n  text(\"Animation generation failed\", width/2, height/2);\n}`
