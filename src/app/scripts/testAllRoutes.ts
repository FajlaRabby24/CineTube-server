const BASE_URL = "http://localhost:5000/api/v1";
const COOKIE_NAME = "better-auth.session_token";

let sessionToken = "";

async function request(method, path, body, useCookie) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };
  
  if (useCookie && sessionToken) {
    options.headers["Cookie"] = `${COOKIE_NAME}=${sessionToken}`;
  }
  
  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }
  
  try {
    const res = await fetch(`${BASE_URL}${path}`, options);
    const data = await res.json();
    
    const cookies = res.headers.get("set-cookie");
    if (cookies) {
      const match = cookies.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
      if (match) sessionToken = match[1];
    }
    
    return { status: res.status, ...data };
  } catch (error) {
    return { error: true, message: error.message };
  }
}

async function testAllRoutes() {
  console.log("=== Testing All Routes ===\n");
  
  // AUTH ROUTES
  console.log("--- AUTH ROUTES ---");
  let r = await request("GET", "/auth/me");
  console.log("GET /auth/me (unauth):", r.status === 401 ? "✅ 401" : "❌ " + r.status);
  
  r = await request("POST", "/auth/login", { email: "super.admin@gmail.com", password: "super_admin123" });
  console.log("POST /auth/login:", r.success ? "✅ 200" : "❌ " + r.status);
  
  r = await request("GET", "/auth/me", null, true);
  console.log("GET /auth/me (auth):", r.success ? "✅ 200" : "❌ " + r.status);
  
  // MEDIA ROUTES
  console.log("\n--- MEDIA ROUTES ---");
  r = await request("GET", "/media");
  console.log("GET /media (public):", r.success ? "✅ 200" : "❌ " + r.status);
  
  // REVIEW ROUTES
  console.log("\n--- REVIEW ROUTES ---");
  r = await request("GET", "/reviews");
  console.log("GET /reviews (public):", r.success ? "✅ 200" : "❌ " + r.status);
  
  r = await request("GET", "/reviews/pending");
  console.log("GET /reviews/pending (unauth):", r.status === 401 ? "✅ 401" : "❌ " + r.status);
  
  r = await request("GET", "/reviews/pending", null, true);
  console.log("GET /reviews/pending (admin):", r.success ? "✅ 200" : "❌ " + r.status);
  
  // ADMIN ROUTES
  console.log("\n--- ADMIN ROUTES ---");
  r = await request("GET", "/admin/stats");
  console.log("GET /admin/stats (unauth):", r.status === 401 ? "✅ 401" : "❌ " + r.status);
  
  r = await request("GET", "/admin/stats", null, true);
  console.log("GET /admin/stats (admin):", r.success ? "✅ 200" : "❌ " + r.status);
  
  console.log("\n=== All Tests Complete ===");
}

testAllRoutes().catch(console.error);
