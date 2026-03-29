const BASE_URL = "http://localhost:5000/api/v1";
const COOKIE_NAME = "better-auth.session_token";

let sessionToken = "";

async function request(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  useCookie?: boolean,
): Promise<{ status?: number; success?: boolean; error?: boolean; message?: string; [key: string]: unknown }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (useCookie && sessionToken) {
    headers["Cookie"] = `${COOKIE_NAME}=${sessionToken}`;
  }
  
  const options: { method: string; headers: Record<string, string>; body?: string } = { method, headers };
  if (body && method !== "GET") options.body = JSON.stringify(body);
  
  try {
    const res = await fetch(`${BASE_URL}${path}`, options);
    const data = await res.json();
    
    const cookies = res.headers.get("set-cookie");
    if (cookies) {
      const match = cookies.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
      if (match && match[1]) sessionToken = match[1];
    }
    
    return { status: res.status, ...data };
  } catch (error: unknown) {
    const err = error as Error;
    return { error: true, message: err.message };
  }
}

async function testLikeRoutes() {
  console.log("=== Testing Like Routes ===\n");
  
  // Login first
  let r = await request("POST", "/auth/login", { email: "super.admin@gmail.com", password: "super_admin123" });
  if (r.error) {
    console.log("Login: ❌ Error -", r.message);
    console.log("Server might not be running. Please start server first.");
    return;
  }
  console.log("Login:", r.success ? "✅" : "❌");
  
  // Test Review Like (unauthenticated)
  r = await request("POST", "/reviews/test-id/like", undefined, false);
  console.log("POST /reviews/:id/like (unauth):", r.status === 401 ? "✅ 401" : "❌ " + (r.status || r.message));
  
  // Test Review Like (authenticated)
  r = await request("POST", "/reviews/test-id/like", undefined, true);
  console.log("POST /reviews/:id/like (auth):", r.success ? "✅ 200" : "❌ " + (r.status || r.message));
  
  // Test Comment Like (unauthenticated)
  r = await request("POST", "/comments/test-id/like", undefined, false);
  console.log("POST /comments/:id/like (unauth):", r.status === 401 ? "✅ 401" : "❌ " + (r.status || r.message));
  
  // Test Comment Like (authenticated)
  r = await request("POST", "/comments/test-id/like", undefined, true);
  console.log("POST /comments/:id/like (auth):", r.success ? "✅ 200" : "❌ " + (r.status || r.message));
  
  // Test Get Comments
  r = await request("GET", "/comments/review/test-id", undefined, false);
  console.log("GET /comments/review/:reviewId:", r.success ? "✅ 200" : "❌ " + (r.status || r.message));
  
  console.log("\n=== Tests Complete ===");
}

testLikeRoutes().catch(console.error);
