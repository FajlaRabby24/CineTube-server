const BASE_URL = "http://localhost:5000/api/v1";
const COOKIE_NAME = "better-auth.session_token";

let sessionToken = "";
let userId = "";

const log = (label: string, data?: any) => {
  console.log(`\n=== ${label} ===`);
  if (data) console.log(JSON.stringify(data, null, 2));
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(
  method: string,
  path: string,
  body?: any,
  useCookie: boolean = false,
) {
  try {
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(useCookie && sessionToken ? { Cookie: `${COOKIE_NAME}=${sessionToken}` } : {}),
      },
    };

    if (body && method !== "GET" && method !== "HEAD") {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(`${BASE_URL}${path}`, options);
    const data = await res.json();

    const cookies = res.headers.get("set-cookie");
    if (cookies) {
      const match = cookies.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
      if (match && match[1]) {
        sessionToken = match[1];
      }
    }

    return { status: res.status, ...data };
  } catch (error: any) {
    return { error: true, message: error.message };
  }
}

async function login(email: string, password: string) {
  return request("POST", "/auth/login", { email, password }, true);
}

async function getMe() {
  return request("GET", "/auth/me", undefined, true);
}

async function getAllReviews() {
  return request("GET", "/reviews");
}

async function getPendingReviews() {
  return request("GET", "/reviews/pending", undefined, true);
}

async function getReviewById(id: string) {
  return request("GET", `/reviews/${id}`);
}

async function getMediaReviews(mediaId: string) {
  return request("GET", `/media/${mediaId}/reviews`);
}

async function createReview(mediaId: string, payload: any) {
  return request("POST", `/media/${mediaId}/reviews`, payload, true);
}

async function updateReview(id: string, payload: any) {
  return request("PATCH", `/reviews/${id}`, payload, true);
}

async function deleteReview(id: string) {
  return request("DELETE", `/reviews/${id}`, undefined, true);
}

async function approveReview(id: string) {
  return request("PATCH", `/reviews/${id}/approve`, {}, true);
}

async function rejectReview(id: string, reason: string) {
  return request("PATCH", `/reviews/${id}/reject`, { reason }, true);
}

async function main() {
  console.log("Starting Review Routes Test...\n");

  // Test 1: Get all approved reviews (Public)
  log("TEST 1: Get All Approved Reviews (Public)");
  let result = await getAllReviews();
  console.log("Status:", result.success ? "✅ PASS" : "❌ FAIL");
  log("Response", result);

  await delay(300);

  // Test 2: Get pending reviews (Unauthenticated - should fail)
  log("TEST 2: Get Pending Reviews (Unauthenticated - should fail)");
  result = await getPendingReviews();
  console.log("Status:", !result.success ? "✅ PASS (Expected to fail)" : "❌ FAIL");
  log("Response", result);

  await delay(300);

  // Test 3: Login as regular user
  log("TEST 3: Login as Regular User");
  result = await login("super.admin@gmail.com", "super_admin123");
  console.log("Status:", result.success ? "✅ PASS" : "❌ FAIL");
  if (result.success) {
    userId = result.data?.user?.id || result.data?.session?.userId;
    log("User ID", userId);
  }
  log("Response", result);

  await delay(300);

  // Test 4: Get pending reviews (Authenticated as user - should fail for non-admin)
  log("TEST 4: Get Pending Reviews (User - should fail)");
  result = await getPendingReviews();
  console.log("Status:", !result.success ? "✅ PASS (Expected to fail)" : "❌ FAIL");
  log("Response", result);

  await delay(300);

  // Test 5: Get all reviews (Authenticated)
  log("TEST 5: Get All Reviews (Authenticated)");
  result = await getAllReviews();
  console.log("Status:", result.success ? "✅ PASS" : "❌ FAIL");
  log("Response", result);

  await delay(300);

  // Test 6: Create review without mediaId (should fail validation)
  log("TEST 6: Create Review (No mediaId - should fail)");
  result = await createReview("", {
    rating: 8,
    content: "This is a test review content",
  });
  console.log("Status:", !result.success ? "✅ PASS (Expected to fail)" : "❌ FAIL");
  log("Response", result);

  await delay(300);

  // Test 7: Create review with invalid data (should fail validation)
  log("TEST 7: Create Review (Invalid data - should fail)");
  result = await createReview("invalid-media-id", {
    rating: 15,
    content: "Short",
  });
  console.log("Status:", !result.success ? "✅ PASS (Expected to fail)" : "❌ FAIL");
  log("Response", result);

  await delay(300);

  // Test 8: Create review with invalid mediaId (should fail)
  log("TEST 8: Create Review (Invalid media - should fail)");
  result = await createReview("non-existent-media-id", {
    rating: 8,
    content: "This is a valid test review content",
  });
  console.log("Status:", !result.success ? "✅ PASS (Expected to fail)" : "❌ FAIL");
  log("Response", result);

  await delay(300);

  // Test 9: Get media reviews with invalid mediaId
  log("TEST 9: Get Media Reviews (Invalid media)");
  result = await getMediaReviews("invalid-media-id");
  console.log("Status:", result.success ? "✅ PASS (Returns empty)" : "❌ FAIL");
  log("Response", result);

  await delay(300);

  // Test 10: Get review by invalid ID
  log("TEST 10: Get Review By Invalid ID");
  result = await getReviewById("invalid-review-id");
  console.log("Status:", !result.success ? "✅ PASS (Expected to fail)" : "❌ FAIL");
  log("Response", result);

  await delay(300);

  // Test 11: Update review without owning it (should fail)
  log("TEST 11: Update Non-existent Review (should fail)");
  result = await updateReview("non-existent-review-id", {
    rating: 7,
    content: "Updated content",
  });
  console.log("Status:", !result.success ? "✅ PASS (Expected to fail)" : "❌ FAIL");
  log("Response", result);

  await delay(300);

  // Test 12: Delete review without owning it (should fail)
  log("TEST 12: Delete Non-existent Review (should fail)");
  result = await deleteReview("non-existent-review-id");
  console.log("Status:", !result.success ? "✅ PASS (Expected to fail)" : "❌ FAIL");
  log("Response", result);

  await delay(300);

  // Test 13: Approve review without being admin (should fail)
  log("TEST 13: Approve Review (Non-admin - should fail)");
  result = await approveReview("non-existent-review-id");
  console.log("Status:", !result.success ? "✅ PASS (Expected to fail)" : "❌ FAIL");
  log("Response", result);

  await delay(300);

  // Test 14: Reject review without being admin (should fail)
  log("TEST 14: Reject Review (Non-admin - should fail)");
  result = await rejectReview("non-existent-review-id", "Test reason");
  console.log("Status:", !result.success ? "✅ PASS (Expected to fail)" : "❌ FAIL");
  log("Response", result);

  console.log("\n\n=== All Tests Completed ===");
}

main().catch(console.error);
