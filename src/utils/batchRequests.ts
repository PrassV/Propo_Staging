export async function batchRequests<T>(
  requests: (() => Promise<T>)[],
  batchSize = 3,
  delayMs = 50
): Promise<T[]> {
  const results: T[] = [];
  
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    
    try {
      const batchResults = await Promise.all(
        batch.map(request => request())
      );
      results.push(...batchResults);
      
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`Batch request error at index ${i}:`, error);
      throw error;
    }
  }
  
  return results;
}