export interface IVerifyResponse {
  success: boolean;
  code?: string;
  detail?: string;
  attribute?: string | null;
}

export async function verifyCloudProof(
  proof: any,
  app_id: string,
  action: string
): Promise<IVerifyResponse> {
  console.log(`[World ID] Verifying proof for app_id: ${app_id}, action: ${action}`);
  console.log(`[World ID] Proof payload:`, JSON.stringify({ ...proof, action }, null, 2));
  
  try {
    const response = await fetch(
      `https://developer.worldcoin.org/api/v1/verify/${app_id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...proof, action }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`[World ID] Verification successful response:`, data);
      // The API returns { success: true } for valid proofs
      return { success: data.success };
    } else {
      const errorBody = await response.json();
      console.error("[World ID] Verification Failed:", errorBody);
      return { success: false, ...errorBody };
    }
  } catch (error) {
    console.error("[World ID] Network/Server Error during verification:", error);
    return { success: false, detail: 'Internal Server Error during verification' };
  }
}
