const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function forwardCalculation(data: any) {
  const response = await fetch(`${API_BASE_URL}/api/forward`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error('API request failed')
  }
  
  return response.json()
}

export async function reverseCalculation(data: any) {
  const response = await fetch(`${API_BASE_URL}/api/reverse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error('API request failed')
  }
  
  return response.json()
}
