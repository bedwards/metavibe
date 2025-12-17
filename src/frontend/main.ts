// Frontend entry point
// Add your frontend logic here

interface HealthResponse {
  status: string;
  timestamp: string;
}

async function checkHealth() {
  try {
    const response = await fetch('/api/health');
    const data = await response.json() as HealthResponse;
    console.info('API Health:', data);
  } catch (err) {
    console.error('API not available:', err);
  }
}

void checkHealth();
