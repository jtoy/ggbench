import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import pool, { OPENROUTER_API_KEY } from '@/lib/db'

const P5JS_SCAFFOLDING_PROMPT = `
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
    
    const { modelId, promptId } = await request.json()
    
    if (!modelId || !promptId) {
      return NextResponse.json(
        { error: 'Model ID and Prompt ID are required' },
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
      
      const promptResult = await client.query(
        'SELECT * FROM prompts WHERE id = $1',
        [promptId]
      )
      
      if (modelResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Model not found or disabled' },
          { status: 404 }
        )
      }
      
      if (promptResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Prompt not found' },
          { status: 404 }
        )
      }
      
      const model = modelResult.rows[0]
      const prompt = promptResult.rows[0]
      
      // Generate code using the LLM
      const generatedCode = await generateCodeWithLLM(model, prompt.text)
      
      // Save the animation to database
      const animationResult = await client.query(
        'INSERT INTO animations (model_id, prompt_id, code) VALUES ($1, $2, $3) RETURNING id',
        [modelId, promptId, generatedCode]
      )
      
      return NextResponse.json({
        code: generatedCode,
        animationId: animationResult.rows[0].id
      })
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
      temperature: 0.7,
      max_tokens: 1000
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