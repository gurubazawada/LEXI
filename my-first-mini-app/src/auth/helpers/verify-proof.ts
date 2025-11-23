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
  console.log('Verifying proof for app_id:', app_id, 'action:', action);
  
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
    const { success } = await response.json();
    return { success };
  } else {
    const errorBody = await response.json();
    console.error("World ID Verification Error:", errorBody);
    return { success: false, ...errorBody };
  }
}

