const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";


export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });


  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status}`
    );
  }


  return response.json() as Promise<T>;
}



export interface PredictionHistoryItem {

  prediction_id: string;

  portfolio_id: string;

  risk_category: string;

  confidence: number;

  created_at: string;

}



export interface SavePredictionPayload {

  user_id: string;

  portfolio_id: string;

  portfolio_data: Record<string, number>;

}



export async function savePrediction(
  payload: SavePredictionPayload
) {

  return apiRequest(
    "/api/v1/predictions/save",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

}



export async function getPredictionHistory()
: Promise<PredictionHistoryItem[]> {

  return apiRequest<PredictionHistoryItem[]>(
    "/api/v1/predictions"
  );

}