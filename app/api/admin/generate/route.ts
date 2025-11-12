import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import pool, { OPENROUTER_API_KEY } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Framework = 'threejs' | 'p5js' | 'svg'

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

const THREEJS_SCAFFOLDING_PROMPT = `
Do not add any comments or text.
Create animation that are not interactive.
Generate ONLY JavaScript code for Three.js that can be embedded in a page that already has THREE loaded globally.
Do NOT include <script> tags, HTML, or THREE.js library imports.
The code should create a scene, camera, renderer, and animate objects.
Use the global THREE object that's already available.
The code should append the renderer to document.body and start animating immediately.
Make sure to use proper Three.js syntax and functions.
Output ONLY plain JavaScript code, no markdown formatting.

Animation description: `;

const SVG_SCAFFOLDING_PROMPT = `
Do not add any comments or text.
Create animation that are not interactive.
Generate ONLY pure SVG markup with CSS animations.
Do NOT include any JavaScript, <script> tags, requestAnimationFrame, or any JavaScript-based animation.
Do NOT include <html>, <head>, <body> tags.
Use ONLY SVG elements with CSS animations (using <animate>, <animateTransform>, <animateMotion>, or CSS @keyframes in <style> tags).
The SVG should be a complete, self-contained element that can be embedded directly.
Make sure the SVG is properly structured with width and height attributes.
Output ONLY the SVG code with CSS animations, no markdown formatting, no JavaScript.

Animation description: `;

function getScaffoldingPrompt(framework: Framework): string {
  switch (framework) {
    case 'p5js':
      return P5JS_SCAFFOLDING_PROMPT
    case 'threejs':
      return THREEJS_SCAFFOLDING_PROMPT
    case 'svg':
      return SVG_SCAFFOLDING_PROMPT
    default:
      return P5JS_SCAFFOLDING_PROMPT
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    
    if (!user || !user.is_admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { modelId, modelIds, promptId, generateForAllPrompts, overwriteAllPrompts, framework = 'p5js' } = await request.json()
    
    // Support both single modelId (backward compatibility) and multiple modelIds
    const modelsToProcess = modelIds || (modelId ? [modelId] : [])
    
    if (modelsToProcess.length === 0) {
      return NextResponse.json(
        { error: 'At least one Model ID is required' },
        { status: 400 }
      )
    }
    
    if (!['threejs', 'p5js', 'svg'].includes(framework)) {
      return NextResponse.json(
        { error: 'Framework must be one of: threejs, p5js, svg' },
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
      // Get all models and validate they exist and are enabled
      const modelsResult = await client.query(
        'SELECT * FROM models WHERE id = ANY($1) AND enabled = true',
        [modelsToProcess]
      )
      
      if (modelsResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'No enabled models found' },
          { status: 404 }
        )
      }
      
      if (modelsResult.rows.length !== modelsToProcess.length) {
        const foundIds = modelsResult.rows.map((m: any) => m.id)
        const missingIds = modelsToProcess.filter((id: number) => !foundIds.includes(id))
        return NextResponse.json(
          { error: `Models not found or disabled: ${missingIds.join(', ')}` },
          { status: 404 }
        )
      }
      
      const models = modelsResult.rows
      
      if (overwriteAllPrompts) {
        // Generate for all prompts for all selected models and overwrite or insert animations
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

        const batchSize = 3 // Reduced batch size for multiple models
        const prompts = allPrompts.rows

        for (let i = 0; i < prompts.length; i += batchSize) {
          const batch = prompts.slice(i, i + batchSize)
          const batchPromises = batch.map(async (prompt) => {
            const modelPromises = models.map(async (model) => {
              try {
                const generatedCode = await generateCodeWithLLM(model, prompt.text, framework as Framework)
                // Upsert: update if exists else insert (checking framework too)
                const existing = await client.query(
                  'SELECT id FROM animations WHERE model_id = $1 AND prompt_id = $2 AND framework = $3',
                  [model.id, prompt.id, framework]
                )
                let animationId
                if (existing.rows.length > 0) {
                  const update = await client.query(
                    'UPDATE animations SET code = $1, created_at = NOW() WHERE id = $2 RETURNING id',
                    [generatedCode, existing.rows[0].id]
                  )
                  animationId = update.rows[0].id
                  console.log(`Overwrote animation ${animationId} for model ${model.id} prompt ${prompt.id} framework ${framework}`)
                } else {
                  const insert = await client.query(
                    'INSERT INTO animations (model_id, prompt_id, code, framework) VALUES ($1, $2, $3, $4) RETURNING id',
                    [model.id, prompt.id, generatedCode, framework]
                  )
                  animationId = insert.rows[0].id
                  console.log(`Created animation ${animationId} for model ${model.id} prompt ${prompt.id} framework ${framework}`)
                }
                return { modelId: model.id, promptId: prompt.id, animationId, success: true }
              } catch (error) {
                console.error(`Error generating animation for model ${model.id} prompt ${prompt.id}:`, error)
                return { modelId: model.id, promptId: prompt.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' }
              }
            })
            return Promise.all(modelPromises)
          })
          const batchResults = await Promise.all(batchPromises)
          for (const modelResults of batchResults) {
            for (const result of modelResults) {
              results.push(result)
              if (result.success) successCount++
              else errorCount++
            }
          }
        }

        return NextResponse.json({
          message: `Generated ${successCount} animations (overwrite mode) for ${models.length} model(s), ${errorCount} failed`,
          generatedCount: successCount,
          errorCount,
          results
        })
      } else if (generateForAllPrompts) {
        // Get all prompts that don't have animations for any of the selected models and framework
        const placeholders = models.map((_, index) => `$${index + 2}`).join(',')
        const promptsToGenerate = await client.query(
          `SELECT p.id, p.text 
           FROM prompts p 
           WHERE NOT EXISTS (
             SELECT 1 FROM animations a 
             WHERE a.model_id = ANY($1) AND a.prompt_id = p.id AND a.framework = $2
           )`,
          [modelsToProcess, framework]
        )
        
        if (promptsToGenerate.rows.length === 0) {
          return NextResponse.json({
            message: 'All prompts already have animations for the selected models',
            generatedCount: 0
          })
        }
        
        const results = []
        let successCount = 0
        let errorCount = 0
        
        // Process prompts in small batches to avoid rate limits
        const batchSize = 3 // Reduced batch size for multiple models
        const prompts = promptsToGenerate.rows
        
        for (let i = 0; i < prompts.length; i += batchSize) {
          const batch = prompts.slice(i, i + batchSize)
          
          // Process batch concurrently
          const batchPromises = batch.map(async (prompt) => {
            const modelPromises = models.map(async (model) => {
              try {
                // Generate code using the LLM
                const generatedCode = await generateCodeWithLLM(model, prompt.text, framework as Framework)
                
                // Insert new animation
                const animationResult = await client.query(
                  'INSERT INTO animations (model_id, prompt_id, code, framework) VALUES ($1, $2, $3, $4) RETURNING id',
                  [model.id, prompt.id, generatedCode, framework]
                )
                
                console.log(`Created animation for model ${model.id} and prompt ${prompt.id} framework ${framework}`)
                
                return {
                  modelId: model.id,
                  promptId: prompt.id,
                  animationId: animationResult.rows[0].id,
                  success: true
                }
              } catch (error) {
                console.error(`Error generating animation for model ${model.id} prompt ${prompt.id}:`, error)
                return {
                  modelId: model.id,
                  promptId: prompt.id,
                  success: false,
                  error: error instanceof Error ? error.message : 'Unknown error'
                }
              }
            })
            return Promise.all(modelPromises)
          })
          
          // Wait for batch to complete
          const batchResults = await Promise.all(batchPromises)
          
          // Count successes and failures
          for (const modelResults of batchResults) {
            for (const result of modelResults) {
              results.push(result)
              if (result.success) {
                successCount++
              } else {
                errorCount++
              }
            }
          }
        }
        
        return NextResponse.json({
          message: `Generated ${successCount} animations for ${models.length} model(s), ${errorCount} failed`,
          generatedCount: successCount,
          errorCount,
          results
        })
      } else {
        // Single prompt generation for multiple models
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
        
        if (modelsToProcess.length === 1) {
          // Single model - return code for backward compatibility
          const model = models[0]
          let generatedCode: string
          try {
            generatedCode = await generateCodeWithLLM(model, prompt.text, framework as Framework)
          } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to generate animation'
            return NextResponse.json(
              { error: message },
              { status: 502 }
            )
          }
          
          // Check if animation already exists for this model_id, prompt_id, and framework combination
          const existingAnimation = await client.query(
            'SELECT id FROM animations WHERE model_id = $1 AND prompt_id = $2 AND framework = $3',
            [model.id, promptId, framework]
          )

          let animationResult
          if (existingAnimation.rows.length > 0) {
            // Update existing animation
            animationResult = await client.query(
              'UPDATE animations SET code = $1, created_at = NOW() WHERE model_id = $2 AND prompt_id = $3 AND framework = $4 RETURNING id',
              [generatedCode, model.id, promptId, framework]
            )
            console.log(`Updated existing animation for model ${model.id} and prompt ${promptId} framework ${framework}`)
          } else {
            // Insert new animation
            animationResult = await client.query(
              'INSERT INTO animations (model_id, prompt_id, code, framework) VALUES ($1, $2, $3, $4) RETURNING id',
              [model.id, promptId, generatedCode, framework]
            )
            console.log(`Created new animation for model ${model.id} and prompt ${promptId} framework ${framework}`)
          }
          
          return NextResponse.json({
            code: generatedCode,
            animationId: animationResult.rows[0].id
          })
        } else {
          // Multiple models - generate concurrently and return results
          const results = []
          let successCount = 0
          let errorCount = 0
          
          const modelPromises = models.map(async (model) => {
            try {
              const generatedCode = await generateCodeWithLLM(model, prompt.text, framework as Framework)
              
              // Check if animation already exists
              const existingAnimation = await client.query(
                'SELECT id FROM animations WHERE model_id = $1 AND prompt_id = $2 AND framework = $3',
                [model.id, promptId, framework]
              )

              let animationResult
              if (existingAnimation.rows.length > 0) {
                // Update existing animation
                animationResult = await client.query(
                  'UPDATE animations SET code = $1, created_at = NOW() WHERE model_id = $2 AND prompt_id = $3 AND framework = $4 RETURNING id',
                  [generatedCode, model.id, promptId, framework]
                )
                console.log(`Updated existing animation for model ${model.id} and prompt ${promptId} framework ${framework}`)
              } else {
                // Insert new animation
                animationResult = await client.query(
                  'INSERT INTO animations (model_id, prompt_id, code, framework) VALUES ($1, $2, $3, $4) RETURNING id',
                  [model.id, promptId, generatedCode, framework]
                )
                console.log(`Created new animation for model ${model.id} and prompt ${promptId} framework ${framework}`)
              }
              
              return {
                modelId: model.id,
                animationId: animationResult.rows[0].id,
                success: true
              }
            } catch (error) {
              console.error(`Error generating animation for model ${model.id}:`, error)
              return {
                modelId: model.id,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            }
          })
          
          const modelResults = await Promise.all(modelPromises)
          
          for (const result of modelResults) {
            results.push(result)
            if (result.success) {
              successCount++
            } else {
              errorCount++
            }
          }
          
          return NextResponse.json({
            message: `Generated ${successCount} animations for ${models.length} model(s), ${errorCount} failed`,
            generatedCount: successCount,
            errorCount,
            results
          })
        }
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

async function generateCodeWithLLM(model: any, promptText: string, framework: Framework = 'p5js'): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured')
  }

  const scaffoldingPrompt = getScaffoldingPrompt(framework)
  const frameworkName = framework === 'threejs' ? 'Three.js' : framework === 'svg' ? 'SVG' : 'p5.js'

  // Attempt up to 2 times: initial + 1 retry if syntax invalid
  for (let attempt = 0; attempt < 2; attempt++) {
    const retrySuffix = attempt === 0 ? '' : `\n\nRegenerate. Previous output had a syntax error when parsed.\nStrictly output ONLY plain ${frameworkName} code with no markdown fences, no imports/exports, and no comments.`
    const fullPrompt = scaffoldingPrompt + promptText + retrySuffix

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

      if (framework === 'p5js') {
        generatedCode = ensureSetupAndDraw(generatedCode)
      }

      if (isValidJavaScript(generatedCode) || framework === 'svg') {
        return generatedCode.trim()
      }
      // Otherwise loop and try once more
    } catch (error) {
      console.error('Error calling LLM API:', error)
      // On API failure after final attempt, propagate error so caller can handle and avoid saving fallback
      if (attempt === 1) {
        throw (error instanceof Error ? error : new Error('LLM API request failed'))
      }
      // otherwise continue to retry
    }
  }

  // If both attempts resulted in invalid JS, return a simple valid sketch
  if (framework === 'p5js') {
    return FALLBACK_P5_CODE
  } else if (framework === 'threejs') {
    return FALLBACK_THREEJS_CODE
  } else {
    return FALLBACK_SVG_CODE
  }
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

const FALLBACK_THREEJS_CODE = `<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n<script>\nconst scene = new THREE.Scene();\nconst camera = new THREE.PerspectiveCamera(75, 400/400, 0.1, 1000);\nconst renderer = new THREE.WebGLRenderer();\nrenderer.setSize(400, 400);\ndocument.body.appendChild(renderer.domElement);\nconst geometry = new THREE.BoxGeometry();\nconst material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });\nconst cube = new THREE.Mesh(geometry, material);\nscene.add(cube);\ncamera.position.z = 5;\nfunction animate() {\n  requestAnimationFrame(animate);\n  cube.rotation.x += 0.01;\n  cube.rotation.y += 0.01;\n  renderer.render(scene, camera);\n}\nanimate();\n</script>`

const FALLBACK_SVG_CODE = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">\n  <rect x="150" y="150" width="100" height="100" fill="red">\n    <animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite"/>\n  </rect>\n  <text x="200" y="220" text-anchor="middle" font-size="16" fill="white">Animation generation failed</text>\n</svg>`
